export type JsonObject = Record<string, unknown>;

export type ModelSource = 'openrouter' | 'nvidia';

export interface OmfmModel {
  id: string;
  upstreamId?: string;
  name: string;
  provider: string;
  source?: ModelSource;
  contextLength?: number;
  popularityRank?: number;
  supportedParameters?: string[];
  raw?: unknown;
}

export interface LatencyObservation {
  modelId: string;
  latencyMs: number;
  updatedAt: string;
  successes: number;
  failures: number;
  lastStatus?: string;
  lastHttpStatus?: number;
  lastError?: string;
  cooldownUntil?: string;
}

export interface OmfmConfig {
  port: number;
  selectedModelIds: string[];
}

export interface ModelCache {
  models: OmfmModel[];
  fetchedAt: string;
}

export interface DaemonState {
  pid: number;
  port: number;
  logPath: string;
  startedAt: string;
}

export type FetchLike = typeof fetch;

export interface ProviderRequestOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
}

export type ProviderApiKeys = Partial<Record<ModelSource, string>>;
