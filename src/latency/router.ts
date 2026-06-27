import { selectedGroupModelIds } from '../model-groups.js';
import { ModelGroups } from '../types.js';

const GENERIC_MODELS = new Set(['', 'auto', 'default', 'slr', 'openrouter/free']);

export interface RouteChoice {
  modelId: string;
  reason: 'requested-selected' | 'model-group' | 'fallback-order';
}

export function chooseModel(selectedModelIds: string[], requestedModel?: string): RouteChoice {
  if (selectedModelIds.length === 0) {
    throw new Error('No models selected. Run `slr model` to choose at least one model.');
  }
  if (requestedModel && !GENERIC_MODELS.has(requestedModel) && selectedModelIds.includes(requestedModel)) {
    return { modelId: requestedModel, reason: 'requested-selected' };
  }
  return { modelId: selectedModelIds[0]!, reason: 'fallback-order' };
}

function candidatePool(selectedModelIds: string[], requestedModel?: string, modelGroups?: ModelGroups): { ids: string[]; grouped: boolean } {
  if (requestedModel && !GENERIC_MODELS.has(requestedModel) && selectedModelIds.includes(requestedModel)) {
    return { ids: selectedModelIds, grouped: false };
  }
  const ids = modelGroups ? selectedGroupModelIds(selectedModelIds, modelGroups, requestedModel) : undefined;
  return ids ? { ids, grouped: true } : { ids: selectedModelIds, grouped: false };
}

export function chooseGroupedModel(selectedModelIds: string[], requestedModel?: string, modelGroups?: ModelGroups): RouteChoice {
  if (requestedModel && !GENERIC_MODELS.has(requestedModel) && selectedModelIds.includes(requestedModel)) {
    return { modelId: requestedModel, reason: 'requested-selected' };
  }
  const pool = candidatePool(selectedModelIds, requestedModel, modelGroups);
  const choice = chooseModel(pool.ids, requestedModel);
  return pool.grouped && choice.reason !== 'requested-selected' ? { ...choice, reason: 'model-group' } : choice;
}

export function orderedCandidates(selectedModelIds: string[], requestedModel?: string, modelGroups?: ModelGroups): string[] {
  const pool = candidatePool(selectedModelIds, requestedModel, modelGroups);
  const first = chooseGroupedModel(selectedModelIds, requestedModel, modelGroups).modelId;
  const rest = pool.ids.filter((id) => id !== first);
  return [first, ...rest];
}
