import { ConfigStore } from '../config/store.js';
import { UsageObservation } from '../types.js';

interface OutputLike {
  write(chunk: string): unknown;
}

export interface RunUsageCommandOptions {
  json?: boolean;
  store?: ConfigStore;
  stdout?: OutputLike;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`;
}

function formatTable(rows: UsageObservation[]): string {
  if (rows.length === 0) return '아직 사용 기록이 없어요.\n';
  const modelWidth = Math.min(56, Math.max(5, ...rows.map((row) => row.modelId.length)));
  const lines = [
    `${pad('모델', modelWidth)} ${pad('요청', 5)} ${pad('성공', 5)} ${pad('실패', 5)} ${pad('입력토큰', 8)} ${pad('출력토큰', 8)} ${pad('합계', 8)} 최근`,
    `${'-'.repeat(modelWidth)} ${'-'.repeat(5)} ${'-'.repeat(5)} ${'-'.repeat(5)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)} ----`,
  ];
  for (const row of rows) {
    lines.push([
      pad(row.modelId.length > modelWidth ? `${row.modelId.slice(0, modelWidth - 1)}…` : row.modelId, modelWidth),
      pad(String(row.requests), 5),
      pad(String(row.successes), 5),
      pad(String(row.failures), 5),
      pad(String(row.inputTokens), 8),
      pad(String(row.outputTokens), 8),
      pad(String(row.totalTokens), 8),
      row.updatedAt,
    ].join(' '));
  }
  return `${lines.join('\n')}\n`;
}

export function usageRows(store = new ConfigStore()): UsageObservation[] {
  return Object.values(store.readUsage()).sort((a, b) =>
    b.requests - a.requests
    || b.totalTokens - a.totalTokens
    || a.modelId.localeCompare(b.modelId),
  );
}

export function runUsageCommand(options: RunUsageCommandOptions = {}): void {
  const store = options.store ?? new ConfigStore();
  const stdout = options.stdout ?? process.stdout;
  const rows = usageRows(store);
  if (options.json) {
    stdout.write(`${JSON.stringify({ usage: rows }, null, 2)}\n`);
    return;
  }
  stdout.write(formatTable(rows));
}
