import { FetchLike, OmfmModel } from '../types.js';
import { NVIDIA_CHAT_COMPLETIONS_URL } from '../providers/nvidia.js';

export type ProbeStatus = 'ok' | 'rate-limited' | 'payment' | 'timeout' | 'aborted' | 'failed';

export interface ProbeResult {
  modelId: string;
  status: ProbeStatus;
  latencyMs?: number;
  httpStatus?: number;
  error?: string;
}

export interface ProbeOptions {
  apiKey: string;
  modelId: string;
  provider?: 'openrouter' | 'nvidia';
  upstreamModelId?: string;
  url?: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function abortError(message = 'aborted'): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Body cancellation is best-effort; latency probing has already reached status/headers.
  }
}

export async function probeChatModel(options: ProbeOptions): Promise<ProbeResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());
  const provider = options.provider ?? 'openrouter';
  const controller = new AbortController();
  const onAbort = () => controller.abort(options.signal?.reason ?? abortError());
  if (options.signal?.aborted) return { modelId: options.modelId, status: 'aborted', error: 'aborted' };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(abortError('timeout')), options.timeoutMs ?? 30_000);
  const started = now();
  try {
    const response = await fetchImpl(options.url ?? 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter'
          ? {
              'HTTP-Referer': 'https://github.com/hakilee/oh-my-free-models',
              'X-OpenRouter-Title': 'oh-my-free-models',
            }
          : {}),
      },
      body: JSON.stringify({
        model: options.upstreamModelId ?? options.modelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: controller.signal,
    });
    const latencyMs = Math.max(0, now() - started);
    void cancelBody(response);
    if (response.ok) return { modelId: options.modelId, status: 'ok', latencyMs, httpStatus: response.status };
    if (response.status === 429) return { modelId: options.modelId, status: 'rate-limited', httpStatus: response.status };
    if (response.status === 402) return { modelId: options.modelId, status: 'payment', httpStatus: response.status };
    return { modelId: options.modelId, status: 'failed', httpStatus: response.status, error: response.statusText };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    if ((name === 'AbortError' && message === 'timeout') || (controller.signal.aborted && !options.signal?.aborted)) return { modelId: options.modelId, status: 'timeout', error: message };
    if (name === 'AbortError' || options.signal?.aborted) return { modelId: options.modelId, status: 'aborted', error: message };
    return { modelId: options.modelId, status: 'failed', error: message };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export function probeOpenRouterModel(options: ProbeOptions): Promise<ProbeResult> {
  return probeChatModel(options);
}

export function probeProviderModel(options: { apiKey: string; model: OmfmModel; fetchImpl?: FetchLike; signal?: AbortSignal; timeoutMs?: number; now?: () => number }): Promise<ProbeResult> {
  const source = options.model.source ?? 'openrouter';
  return probeChatModel({
    apiKey: options.apiKey,
    modelId: options.model.id,
    provider: source,
    upstreamModelId: options.model.upstreamId ?? options.model.id,
    url: source === 'nvidia' ? NVIDIA_CHAT_COMPLETIONS_URL : 'https://openrouter.ai/api/v1/chat/completions',
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    now: options.now,
  });
}
