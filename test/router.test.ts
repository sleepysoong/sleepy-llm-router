import { describe, expect, it } from 'vitest';
import { chooseGroupedModel, chooseModel, orderedCandidates } from '../src/latency/router.js';

describe('config-order router', () => {
  it('honors requested selected model', () => {
    expect(chooseModel(['a', 'b'], 'b')).toEqual({ modelId: 'b', reason: 'requested-selected' });
  });

  it('uses config order for generic request', () => {
    expect(chooseModel(['a', 'b'], 'auto')).toEqual({ modelId: 'a', reason: 'fallback-order' });
  });

  it('falls back deterministically when no request', () => {
    expect(chooseModel(['z', 'a'], undefined)).toEqual({ modelId: 'z', reason: 'fallback-order' });
  });

  it('orders retry candidates by config order', () => {
    expect(orderedCandidates(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('preserves config order for requested model', () => {
    expect(orderedCandidates(['b', 'a', 'c'], 'c')).toEqual(['c', 'b', 'a']);
  });

  it('routes group aliases within the configured group only', () => {
    const groups = { fast: ['b'], balanced: ['a'], capable: ['c'] };
    expect(chooseGroupedModel(['a', 'b', 'c'], 'slr/fast', groups)).toEqual({ modelId: 'b', reason: 'model-group' });
    expect(orderedCandidates(['a', 'b', 'c'], 'haiku', groups)).toEqual(['b']);
  });

  it('falls back to the full selection when a requested group is empty', () => {
    expect(orderedCandidates(['a', 'b'], 'opus', { fast: [], balanced: [], capable: [] })).toEqual(['a', 'b']);
  });

  it('prefers an exact selected model id over a group alias', () => {
    expect(orderedCandidates(['opus', 'b'], 'opus', { fast: [], balanced: [], capable: ['b'] })).toEqual(['opus', 'b']);
  });
});
