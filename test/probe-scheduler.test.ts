import { describe, expect, it } from 'vitest';
import { runProbeScheduler } from '../src/latency/probe-scheduler.js';
import { OmfmModel } from '../src/types.js';

const models: OmfmModel[] = [
  { id: 'a', name: 'A', provider: 'p' },
  { id: 'b', name: 'B', provider: 'p' },
  { id: 'c', name: 'C', provider: 'p' },
];

const fourModels: OmfmModel[] = [...models, { id: 'd', name: 'D', provider: 'p' }];

describe('probe scheduler', () => {
  it('probes in bounded parallel batches with optional pacing between batches', async () => {
    const calls: string[] = [];
    const sleeps: number[] = [];
    const successes: Array<[string, number]> = [];
    const state = await runProbeScheduler({
      models: fourModels,
      concurrency: 2,
      intervalMs: 3000,
      sleep: async (ms) => { sleeps.push(ms); },
      store: { recordSuccess: (id, ms) => successes.push([id, ms]) },
      probe: async (model) => {
        calls.push(model.id);
        return { modelId: model.id, status: model.id === 'b' ? 'failed' : 'ok', latencyMs: 10 };
      },
    });
    expect(state).toBe('completed');
    expect(calls).toEqual(['a', 'b', 'c', 'd']);
    expect(sleeps).toEqual([3000]);
    expect(successes).toEqual([['a', 10], ['c', 10], ['d', 10]]);
  });

  it('defers queued rows on payment quota response', async () => {
    const deferred: string[] = [];
    const state = await runProbeScheduler({
      models: fourModels,
      concurrency: 2,
      sleep: async () => undefined,
      onDeferred: (id) => deferred.push(id),
      probe: async (model) => ({ modelId: model.id, status: model.id === 'b' ? 'payment' : 'ok' }),
    });
    expect(state).toBe('quota-deferred');
    expect(deferred).toEqual(['c', 'd']);
  });

  it('records non-aborted probe failures without replacing cached success latency', async () => {
    const failures: any[] = [];
    const state = await runProbeScheduler({
      models: [models[0]],
      store: { recordSuccess: () => undefined, recordFailure: (id, details) => failures.push([id, details]) },
      probe: async (model) => ({ modelId: model.id, status: 'rate-limited', httpStatus: 429 }),
    });
    expect(state).toBe('completed');
    expect(failures).toEqual([['a', { status: 'rate-limited', httpStatus: 429, error: undefined }]]);
  });

  it('caps requested concurrency to the safe bounded batch size', async () => {
    const calls: string[] = [];
    const sleeps: number[] = [];
    const state = await runProbeScheduler({
      models: fourModels,
      concurrency: 99,
      intervalMs: 3000,
      sleep: async (ms) => { sleeps.push(ms); },
      probe: async (model) => {
        calls.push(model.id);
        return { modelId: model.id, status: 'ok' };
      },
    });
    expect(state).toBe('completed');
    expect(calls).toEqual(['a', 'b', 'c', 'd']);
    expect(sleeps).toEqual([]);
  });

  it('uses a broad initial batch by default so latency appears quickly', async () => {
    const calls: string[] = [];
    const sleeps: number[] = [];
    const state = await runProbeScheduler({
      models: fourModels,
      sleep: async (ms) => { sleeps.push(ms); },
      probe: async (model) => {
        calls.push(model.id);
        return { modelId: model.id, status: 'ok' };
      },
    });
    expect(state).toBe('completed');
    expect(calls).toEqual(['a', 'b', 'c', 'd']);
    expect(sleeps).toEqual([]);
  });

  it('continues probing later models after a row-level rate limit', async () => {
    const calls: string[] = [];
    const successes: Array<[string, number]> = [];
    const state = await runProbeScheduler({
      models,
      concurrency: 2,
      sleep: async () => undefined,
      store: { recordSuccess: (id, ms) => successes.push([id, ms]) },
      probe: async (model) => {
        calls.push(model.id);
        return model.id === 'a' ? { modelId: model.id, status: 'rate-limited' } : { modelId: model.id, status: 'ok', latencyMs: 12 };
      },
    });
    expect(state).toBe('completed');
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(successes).toEqual([['b', 12], ['c', 12]]);
  });

  it('stops when aborted before scheduling', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(runProbeScheduler({ models, signal: controller.signal, probe: async (model) => ({ modelId: model.id, status: 'ok' }) })).resolves.toBe('aborted');
  });
});
