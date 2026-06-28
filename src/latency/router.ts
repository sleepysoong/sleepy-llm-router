import { allGroupModelIds, normalizeModelGroupName, resolveDefaultGroup } from '../model-groups.js';
import { ModelGroups } from '../types.js';

export interface RouteChoice {
  modelId: string;
  reason: 'requested-selected' | 'model-group' | 'fallback-order';
}

function findModelGroup(modelGroups: ModelGroups, modelId: string): string | undefined {
  for (const [group, ids] of Object.entries(modelGroups)) {
    if (ids.includes(modelId)) return group;
  }
  return undefined;
}

function resolveCandidateIds(modelGroups: ModelGroups, requestedModel?: string, defaultGroup?: string): { ids: string[]; grouped: boolean } {
  const allIds = allGroupModelIds(modelGroups);
  if (allIds.length === 0) return { ids: [], grouped: false };

  const normalized = normalizeModelGroupName(requestedModel);

  if (normalized && modelGroups[normalized]) {
    return { ids: modelGroups[normalized]!, grouped: true };
  }

  if (requestedModel && allIds.includes(requestedModel)) {
    const group = findModelGroup(modelGroups, requestedModel);
    if (group) return { ids: modelGroups[group]!, grouped: true };
    return { ids: [requestedModel], grouped: false };
  }

  const resolved = resolveDefaultGroup(modelGroups, defaultGroup);
  if (resolved) return { ids: modelGroups[resolved]!, grouped: true };

  return { ids: allIds, grouped: false };
}

export function chooseModel(modelGroups: ModelGroups, requestedModel?: string): RouteChoice {
  const allIds = allGroupModelIds(modelGroups);
  if (allIds.length === 0) {
    throw new Error('선택된 모델이 없어요. config.json에서 모델을 하나 이상 선택하세요.');
  }

  const normalized = normalizeModelGroupName(requestedModel);
  if (normalized && modelGroups[normalized]) {
    return { modelId: modelGroups[normalized]![0]!, reason: 'model-group' };
  }

  if (requestedModel && allIds.includes(requestedModel)) {
    return { modelId: requestedModel, reason: 'requested-selected' };
  }

  const resolved = resolveDefaultGroup(modelGroups);
  if (resolved) return { modelId: modelGroups[resolved]![0]!, reason: 'model-group' };

  return { modelId: allIds[0]!, reason: 'fallback-order' };
}

export function chooseGroupedModel(modelGroups: ModelGroups, requestedModel?: string, defaultGroup?: string): RouteChoice {
  const pool = resolveCandidateIds(modelGroups, requestedModel, defaultGroup);
  if (pool.ids.length === 0) {
    throw new Error('선택된 모델이 없어요. config.json에서 모델을 하나 이상 선택하세요.');
  }
  const first = pool.ids[0]!;
  return pool.grouped ? { modelId: first, reason: 'model-group' } : { modelId: first, reason: 'fallback-order' };
}

export function orderedCandidates(modelGroups: ModelGroups, requestedModel?: string, defaultGroup?: string): string[] {
  const pool = resolveCandidateIds(modelGroups, requestedModel, defaultGroup);
  if (!pool.grouped && requestedModel && pool.ids.includes(requestedModel)) {
    return [requestedModel, ...pool.ids.filter((id) => id !== requestedModel)];
  }
  return pool.ids;
}
