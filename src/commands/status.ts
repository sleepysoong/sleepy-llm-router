import { ConfigStore } from '../config/store.js';
import { isProcessRunning } from '../daemon/daemon.js';

export function getStatus(store = new ConfigStore()) {
  const config = store.readConfig();
  const daemon = store.readDaemon();
  const latency = store.readLatency();
  const best = config.selectedModelIds
    .map((id) => ({ id, latencyMs: latency[id]?.latencyMs }))
    .filter((x): x is { id: string; latencyMs: number } => typeof x.latencyMs === 'number' && Number.isFinite(x.latencyMs))
    .sort((a, b) => a.latencyMs - b.latencyMs)[0];
  const running = daemon ? isProcessRunning(daemon.pid) : false;
  return { running, daemon, port: daemon?.port ?? config.port, configPath: store.paths.configPath, selectedModelCount: config.selectedModelIds.length, bestModel: best };
}

export function printStatus(store = new ConfigStore()): void {
  const status = getStatus(store);
  console.log(`omfm ${status.running ? 'running' : 'stopped'}`);
  console.log(`port: ${status.port}`);
  console.log(`config: ${status.configPath}`);
  console.log(`selected models: ${status.selectedModelCount}`);
  if (status.bestModel) console.log(`best latency: ${status.bestModel.id} (${status.bestModel.latencyMs}ms)`);
  if (status.daemon) console.log(`daemon pid: ${status.daemon.pid}`);
}
