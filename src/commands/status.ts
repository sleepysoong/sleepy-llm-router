import { ConfigStore } from '../config/store.js';
import { isProcessRunning } from '../daemon/daemon.js';

export function getStatus(store = new ConfigStore()) {
  const config = store.readConfig();
  const daemon = store.readDaemon();
  const running = daemon ? isProcessRunning(daemon.pid) : false;
  const primaryModel = config.selectedModelIds.length > 0 ? config.selectedModelIds[0] : undefined;
  return { running, daemon, port: daemon?.port ?? config.port, configPath: store.paths.configPath, selectedModelCount: config.selectedModelIds.length, primaryModel };
}

export function printStatus(store = new ConfigStore()): void {
  const status = getStatus(store);
  console.log(`omfm ${status.running ? 'running' : 'stopped'}`);
  console.log(`port: ${status.port}`);
  console.log(`config: ${status.configPath}`);
  console.log(`selected models: ${status.selectedModelCount}`);
  if (status.primaryModel) console.log(`primary model: ${status.primaryModel}`);
  if (status.daemon) console.log(`daemon pid: ${status.daemon.pid}`);
}
