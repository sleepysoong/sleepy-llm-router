import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ConfigStore } from '../src/config/store.js';
import { OmfmModel } from '../src/types.js';

export const cleanupRoots: string[] = [];

export function tempStore(prefix = 'omfm-test-'): ConfigStore {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanupRoots.push(root);
  return new ConfigStore(root);
}

export function cleanupTempRoots(): void {
  cleanupRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
}

export const sampleModels: OmfmModel[] = [
  { id: 'alpha/one:free', name: 'One', provider: 'alpha', source: 'openrouter', contextLength: 8192 },
  { id: 'beta/two:free', name: 'Two', provider: 'beta', source: 'openrouter', contextLength: 128000 },
  { id: 'nvidia/gamma/three', upstreamId: 'gamma/three', name: 'Three', provider: 'nvidia', source: 'nvidia', contextLength: 1000000 },
];

export function modelListResponse(models = sampleModels): Response {
  return Response.json({
    data: models.map((model) => ({
      id: model.id,
      name: model.name,
      context_length: model.contextLength,
      pricing: { prompt: '0', completion: '0', request: '0' },
      architecture: { output_modalities: ['text'] },
    })),
  });
}
