import { describe, expect, it } from 'vitest';
import { buildModelRows, filterListableModelRows, formatContextLength, formatRecommendation, renderStaticModelTable, sortModelRows, stripAnsi } from '../src/commands/model-view.js';
import { OmfmModel } from '../src/types.js';

const models: OmfmModel[] = [
  { id: 'alpha/a:free', name: 'Alpha', provider: 'alpha', source: 'openrouter', contextLength: 8192 },
  { id: 'nvidia/beta/b', upstreamId: 'beta/b', name: 'Beta', provider: 'nvidia', source: 'nvidia', contextLength: 1_000_000 },
];

describe('model view formatting', () => {
  it('formats context sizes compactly', () => {
    expect(formatContextLength()).toBe('—');
    expect(formatContextLength(8192)).toBe('8k');
    expect(formatContextLength(128000)).toBe('128k');
    expect(formatContextLength(1_000_000)).toBe('1.0M');
  });

  it('renders an ANSI-free static table with required columns', () => {
    const rows = buildModelRows(models, new Set(['nvidia/beta/b']));
    const table = renderStaticModelTable(rows);
    expect(table).toContain('Provider');
    expect(table).toContain('Source');
    expect(table).toContain('Recommend');
    expect(table).toContain('OpenRouter');
    expect(table).toContain('NVIDIA');
    expect(table).toContain('Ctx');
    expect(table).toContain('Status');
    expect(table).toContain('8k');
    expect(stripAnsi(table)).toBe(table);
  });

  it('renders interactive focus and selection markers distinctly', () => {
    const rows = buildModelRows(models, new Set(['nvidia/beta/b']));
    const table = renderStaticModelTable(rows, { activeIndex: 1, interactive: true });
    expect(table).toContain('Cur');
    expect(table).toContain('▶');
    expect(table).toContain('●');
    expect(table).toContain('○');
    expect(table).toContain('\u001b[7m');
    expect(table).toContain('\u001b[48;5;236m');
    expect(stripAnsi(table)).not.toContain('\u001b[7m');
  });

  it('can color recommendation marks without adding check icons', () => {
    const value = formatRecommendation('strong', { color: true });
    expect(value).toContain('\u001b[32m');
    expect(stripAnsi(value)).toBe('strong');
    expect(value).not.toContain('✓');
  });

  it('sorts rows by selection and catalog rank', () => {
    const rows = buildModelRows([
      { id: 'z/pending:free', name: 'Pending', provider: 'z', source: 'openrouter', popularityRank: 0 },
      { id: 'a/slow:free', name: 'Slow', provider: 'a', source: 'openrouter', popularityRank: 1 },
      { id: 'b/fast:free', name: 'Fast', provider: 'b', source: 'openrouter', popularityRank: 2 },
      { id: 'c/failed:free', name: 'Failed', provider: 'c', source: 'openrouter', popularityRank: 3 },
    ], new Set(['a/slow:free']));

    expect(sortModelRows(rows, { selectedFirst: true }).map((row) => row.model.id)).toEqual(['a/slow:free', 'z/pending:free', 'b/fast:free', 'c/failed:free']);
  });

  it('filterListableModelRows returns all rows (no latency filtering)', () => {
    const rows = buildModelRows(models, new Set());
    expect(filterListableModelRows(rows).map((row) => row.model.id)).toEqual(['alpha/a:free', 'nvidia/beta/b']);
  });
});
