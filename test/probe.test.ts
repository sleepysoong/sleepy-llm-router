import { describe, expect, it } from 'vitest';
import { probeOpenRouterModel, probeProviderModel } from '../src/latency/probe.js';

function response(status: number, statusText = 'status'): Response {
  return new Response(new ReadableStream(), { status, statusText });
}

describe('OpenRouter latency probe', () => {
  it('measures successful response at headers/status and sends a one-token request', async () => {
    let now = 100;
    let body: any;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      now = 250;
      return response(200);
    }) as typeof fetch;
    const result = await probeOpenRouterModel({ apiKey: 'key', modelId: 'alpha/a:free', fetchImpl, now: () => now });
    expect(result).toMatchObject({ modelId: 'alpha/a:free', status: 'ok', latencyMs: 150, httpStatus: 200 });
    expect(body).toMatchObject({ model: 'alpha/a:free', max_tokens: 1 });
    expect(body.messages).toHaveLength(1);
  });

  it('maps quota-like and ordinary failures without throwing', async () => {
    await expect(probeOpenRouterModel({ apiKey: 'key', modelId: 'm', fetchImpl: (async () => response(429)) as typeof fetch })).resolves.toMatchObject({ status: 'rate-limited' });
    await expect(probeOpenRouterModel({ apiKey: 'key', modelId: 'm', fetchImpl: (async () => response(402)) as typeof fetch })).resolves.toMatchObject({ status: 'payment' });
    await expect(probeOpenRouterModel({ apiKey: 'key', modelId: 'm', fetchImpl: (async () => response(500)) as typeof fetch })).resolves.toMatchObject({ status: 'failed', httpStatus: 500 });
    await expect(probeOpenRouterModel({ apiKey: 'key', modelId: 'm', fetchImpl: (async () => { throw new Error('net'); }) as typeof fetch })).resolves.toMatchObject({ status: 'failed' });
  });

  it('maps pre-aborted signals to aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(probeOpenRouterModel({ apiKey: 'key', modelId: 'm', signal: controller.signal })).resolves.toMatchObject({ status: 'aborted' });
  });

  it('probes NVIDIA with the provider URL, upstream model ID, and NVIDIA-safe headers', async () => {
    let url = '';
    let headers: Headers;
    let body: any;
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      url = String(input);
      headers = new Headers(init?.headers);
      body = JSON.parse(String(init?.body));
      return response(202);
    }) as typeof fetch;
    const result = await probeProviderModel({
      apiKey: 'nvapi-key',
      model: { id: 'nvidia/deepseek-ai/deepseek-v3.2', upstreamId: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek', provider: 'nvidia', source: 'nvidia' },
      fetchImpl,
    });
    expect(result).toMatchObject({ modelId: 'nvidia/deepseek-ai/deepseek-v3.2', status: 'ok', httpStatus: 202 });
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(body).toMatchObject({ model: 'deepseek-ai/deepseek-v3.2', max_tokens: 1, stream: false });
    expect(headers!.get('authorization')).toBe('Bearer nvapi-key');
    expect(headers!.has('HTTP-Referer')).toBe(false);
    expect(headers!.has('X-OpenRouter-Title')).toBe(false);
  });
});
