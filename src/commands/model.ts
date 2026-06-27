import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { requireAnyProviderApiKey } from '../config/env.js';
import { ConfigStore } from '../config/store.js';
import { normalizeModelGroupName } from '../model-groups.js';
import { loadModelCatalog } from '../providers/catalog.js';
import { FetchLike, ModelGroupName, OmfmModel, ProviderApiKeys } from '../types.js';
import { buildModelRows, filterListableModelRows, ModelDisplayRow, renderStaticModelTable, sortModelRows } from './model-view.js';
import { runModelTui } from './model-tui.js';

interface OutputLike {
  isTTY?: boolean;
  write(chunk: string): unknown;
}

type InputLike = NodeJS.ReadStream;

export interface PromptLineOptions {
  question: string;
  stdin: InputLike;
  stdout: OutputLike;
}

export type PromptLine = (options: PromptLineOptions) => Promise<string | null>;

export interface RunModelCommandOptions {
  select?: string[];
  all?: boolean;
  json?: boolean;
  group?: string;
  noTui?: boolean;
  store?: ConfigStore;
  fetchImpl?: FetchLike;
  env?: NodeJS.ProcessEnv;
  stdout?: OutputLike;
  stderr?: OutputLike;
  stdin?: InputLike;
  runTui?: typeof runModelTui;
  promptLine?: PromptLine;
}

async function defaultPromptLine({ question, stdin, stdout }: PromptLineOptions): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout as Writable, terminal: false });
    let settled = false;
    const finish = (result: string | null): void => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(result);
    };
    rl.question(question, (answer) => finish(answer));
    rl.once('SIGINT', () => finish(null));
    rl.once('close', () => finish(null));
  });
}

function parseSelectionInput(input: string, rows: ModelDisplayRow[]): { ids: string[]; invalid: string[] } {
  const tokens = input.split(/[\s,]+/).map((token) => token.trim()).filter(Boolean);
  const freeIds = new Set(rows.map((row) => row.model.id));
  const ids: string[] = [];
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      if (n >= 1 && n <= rows.length) {
        const id = rows[n - 1]!.model.id;
        if (!seen.has(id)) { seen.add(id); ids.push(id); }
        continue;
      }
    }
    if (freeIds.has(token)) {
      if (!seen.has(token)) { seen.add(token); ids.push(token); }
      continue;
    }
    invalid.push(token);
  }
  return { ids, invalid };
}

function writeLine(output: OutputLike, text: string): void {
  output.write(`${text}\n`);
}

function candidateModels(models: OmfmModel[], selectedIds: string[]): OmfmModel[] {
  if (selectedIds.length === 0) return models;
  const byId = new Map(models.map((model) => [model.id, model]));
  return selectedIds.map((id) => byId.get(id)).filter((model): model is OmfmModel => Boolean(model));
}

function candidateIdsForGroup(config: ReturnType<ConfigStore['readConfig']>, group: ModelGroupName | undefined): string[] {
  if (!group) return config.selectedModelIds;
  const selected = new Set(config.selectedModelIds);
  const ids = [...new Set(config.modelGroups[group])].filter((id) => selected.has(id));
  return ids.length > 0 ? ids : config.selectedModelIds;
}

async function loadModels(options: { apiKeys: ProviderApiKeys; fetchImpl?: FetchLike; store: ConfigStore; json?: boolean; stderr: OutputLike }): Promise<OmfmModel[]> {
  const catalog = await loadModelCatalog({ apiKeys: options.apiKeys, fetchImpl: options.fetchImpl, store: options.store });
  if (!options.json) {
    if (catalog.source === 'fetched' && catalog.errors.length > 0) writeLine(options.stderr, `Using partial provider results: ${catalog.errors.join('; ')}`);
    if (catalog.source === 'stale') writeLine(options.stderr, `Using cached models because provider fetch failed: ${catalog.errors.join('; ')}`);
  }
  return catalog.models;
}

function listableModelRows(models: OmfmModel[], selectedIds: Set<string>): ModelDisplayRow[] {
  return filterListableModelRows(buildModelRows(models, selectedIds));
}

export async function runModelCommand(options: RunModelCommandOptions = {}): Promise<void> {
  const store = options.store ?? new ConfigStore();
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  store.ensureRoot();
  const apiKeys = requireAnyProviderApiKey(options.env ?? process.env, store.paths.root);
  const models = await loadModels({ apiKeys, fetchImpl: options.fetchImpl, store, json: options.json, stderr });

  const config = store.readConfig();
  const current = new Set(config.selectedModelIds);
  const group = normalizeModelGroupName(options.group);
  if (options.group && !group) throw new Error(`Invalid --group value: ${options.group}. Use fast, balanced, or capable.`);

  if (options.all) {
    const ids = sortModelRows(listableModelRows(models, new Set()), { selectedFirst: true }).map((row) => row.model.id);
    if (group) store.updateModelGroup(group, ids);
    else store.updateSelectedModelIds(ids);
  } else if (options.select) {
    const freeIds = new Set(listableModelRows(models, new Set()).map((row) => row.model.id));
    const invalid = options.select.filter((id) => !freeIds.has(id));
    if (invalid.length > 0) {
      throw new Error(`Selected model IDs are not current free models: ${invalid.join(', ')}`);
    }
    if (group) store.updateModelGroup(group, options.select);
    else store.updateSelectedModelIds(options.select);
  } else if (!options.json && stdout.isTTY && !options.noTui) {
    const runTui = options.runTui ?? runModelTui;
    const result = await runTui({
      models,
      selectedModelIds: [...current],
      modelGroups: config.modelGroups,
      initialTab: group ?? 'all',
      store,
      apiKeys,
      stdin: options.stdin,
      stdout: stdout as Writable,
      fetchImpl: options.fetchImpl,
    });
    if (result.saved) {
      store.writeConfig({
        ...store.readConfig(),
        selectedModelIds: result.selectedModelIds,
        modelGroups: result.modelGroups,
      });
    }
    if (result.interrupted) process.exitCode = 130;
  } else if (!options.json && options.noTui && stdout.isTTY) {
    const stdinStream = options.stdin ?? (process.stdin as InputLike);
    if (stdinStream.isTTY) {
      const selectedIds = new Set(store.readConfig().selectedModelIds);
      const rows = sortModelRows(listableModelRows(models, selectedIds), { selectedFirst: true });
      stdout.write(`Free models:\n${renderStaticModelTable(rows, { withRowNumbers: true })}`);
      const promptLine = options.promptLine ?? defaultPromptLine;
      const answer = await promptLine({
        question: 'Select rows (e.g. 1,3,5 — blank to keep, q to cancel): ',
        stdin: stdinStream,
        stdout,
      });
      if (answer === null) {
        process.exitCode = 130;
        return;
      }
      const trimmed = answer.trim();
      if (trimmed === '') {
        writeLine(stdout, 'No change.');
        return;
      }
      if (trimmed.toLowerCase() === 'q') {
        writeLine(stdout, 'Cancelled.');
        process.exitCode = 130;
        return;
      }
      const { ids, invalid } = parseSelectionInput(trimmed, rows);
      if (invalid.length > 0) {
        throw new Error(`Unknown selection token(s): ${invalid.join(', ')}`);
      }
      if (group) store.updateModelGroup(group, ids);
      else store.updateSelectedModelIds(ids);
      writeLine(stdout, `Saved ${ids.length} selection(s).`);
      return;
    }
  }

  if (options.json) {
    const nextConfig = store.readConfig();
    const listableModels = listableModelRows(models, new Set(nextConfig.selectedModelIds)).map((row) => row.model);
    writeLine(stdout, JSON.stringify({ models: listableModels, selectedModelIds: nextConfig.selectedModelIds, modelGroups: nextConfig.modelGroups }, null, 2));
    return;
  }

  if (!stdout.isTTY || options.all || options.select || options.noTui) {
    const selectedIds = new Set(store.readConfig().selectedModelIds);
    stdout.write(`Free models:\n${renderStaticModelTable(sortModelRows(listableModelRows(models, selectedIds), { selectedFirst: true }))}`);
  }
}
