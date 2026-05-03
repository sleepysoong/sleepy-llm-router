import { describe, expect, it } from 'vitest';
import { listNvidiaFreeModels, normalizeNvidiaModel } from '../src/providers/nvidia.js';

describe('NVIDIA model provider', () => {
  it('normalizes NVIDIA route IDs while preserving upstream IDs', () => {
    const model = normalizeNvidiaModel({ id: 'deepseek-ai/deepseek-v3.2', context_length: 128000 });
    expect(model).toMatchObject({
      id: 'nvidia/deepseek-ai/deepseek-v3.2',
      upstreamId: 'deepseek-ai/deepseek-v3.2',
      provider: 'nvidia',
      source: 'nvidia',
    });
  });

  it('lists chat-like NVIDIA models and filters non-chat models', async () => {
    const fetchImpl = (async () => Response.json({
      data: [
        { id: 'deepseek-ai/deepseek-v3.2', context_length: 128000 },
        { id: 'baai/bge-m3' },
        { id: 'nvidia/embed-qa', task: 'embedding' },
        { id: 'nvidia/reranker', task: 'rerank' },
      ],
    })) as typeof fetch;
    const models = await listNvidiaFreeModels({ apiKey: 'nvapi-key', fetchImpl });
    expect(models.map((model) => model.id)).toEqual(['nvidia/deepseek-ai/deepseek-v3.2']);
  });
});
