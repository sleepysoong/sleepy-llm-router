import { FetchLike, OmfmModel } from '../types.js';

export interface ModelProvider {
  name: string;
  listModels(options: { apiKey: string; fetchImpl?: FetchLike }): Promise<OmfmModel[]>;
}
