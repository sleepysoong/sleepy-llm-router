import { ConfigStore } from '../config/store.js';
import { OmfmModel } from '../types.js';
import { ProbeResult } from './probe.js';
import { isCoolingDown } from './router.js';

export type ProbeTerminalState = 'completed' | 'aborted' | 'quota-deferred';

export interface ProbeUpdate {
  modelId: string;
  result: ProbeResult;
}

export interface ProbeSchedulerOptions {
  models: OmfmModel[];
  apiKey?: string;
  probe: (model: OmfmModel, signal: AbortSignal) => Promise<ProbeResult>;
  store?: Pick<ConfigStore, 'recordSuccess'> & Partial<Pick<ConfigStore, 'recordFailure' | 'readLatency'>>;
  onUpdate?: (update: ProbeUpdate) => void;
  onDeferred?: (modelId: string) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  intervalMs?: number;
  concurrency?: number;
  initialConcurrency?: number;
  signal?: AbortSignal;
}

const DEFAULT_CONCURRENCY = 20;
const DEFAULT_INITIAL_CONCURRENCY = 64;
const MAX_CONCURRENCY = 64;

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });
}

function concurrencyFor(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CONCURRENCY;
  return Math.min(MAX_CONCURRENCY, Math.max(1, Math.floor(value)));
}

export async function runProbeScheduler(options: ProbeSchedulerOptions): Promise<ProbeTerminalState> {
  const intervalMs = options.intervalMs ?? 0;
  const concurrency = concurrencyFor(options.concurrency);
  const initialConcurrency = concurrencyFor(options.initialConcurrency ?? (options.concurrency === undefined ? DEFAULT_INITIAL_CONCURRENCY : concurrency));
  const sleep = options.sleep ?? defaultSleep;
  const controller = new AbortController();
  const onAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) return 'aborted';
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const observations = options.store?.readLatency?.() ?? {};
    const pending: OmfmModel[] = [];
    for (const model of options.models) {
      if (!model.id) continue;
      if (isCoolingDown(observations[model.id])) {
        options.onDeferred?.(model.id);
        continue;
      }
      pending.push(model);
    }
    for (let index = 0; index < pending.length; ) {
      if (controller.signal.aborted) return 'aborted';
      if (index > 0) {
        if (intervalMs > 0) {
          try {
            await sleep(intervalMs, controller.signal);
          } catch {
            return 'aborted';
          }
        }
      }
      const batchSize = index === 0 ? initialConcurrency : concurrency;
      const batch = pending.slice(index, index + batchSize);
      index += batch.length;
      let aborted = false;
      let payment = false;
      await Promise.all(
        batch.map(async (model) => {
          const result = await options.probe(model, controller.signal);
          options.onUpdate?.({ modelId: model.id, result });
          if (result.status === 'ok' && typeof result.latencyMs === 'number') {
            options.store?.recordSuccess(model.id, Math.round(result.latencyMs), { httpStatus: result.httpStatus });
          } else if (result.status !== 'aborted') {
            options.store?.recordFailure?.(model.id, { status: result.status, httpStatus: result.httpStatus, error: result.error });
          }
          if (result.status === 'aborted') aborted = true;
          if (result.status === 'payment') payment = true;
        }),
      );
      if (aborted) return 'aborted';
      if (payment) {
        for (const queued of pending.slice(index)) options.onDeferred?.(queued.id);
        return 'quota-deferred';
      }
    }
    return controller.signal.aborted ? 'aborted' : 'completed';
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
  }
}
