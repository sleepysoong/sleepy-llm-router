import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ConfigStore } from '../config/store.js';
import { getLogPath } from '../config/paths.js';

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function startDaemon(options: { port: number; store: ConfigStore; cliPath?: string }): number {
  const logPath = getLogPath(options.store.paths.root);
  fs.mkdirSync(options.store.paths.root, { recursive: true });
  const out = fs.openSync(logPath, 'a');
  const err = fs.openSync(logPath, 'a');
  const cliPath = options.cliPath ?? process.argv[1];
  const child = spawn(process.execPath, [cliPath, 'start', '--port', String(options.port), '--daemon-child'], {
    detached: true,
    stdio: ['ignore', out, err],
    env: process.env,
  });
  child.unref();
  options.store.writeDaemon({ pid: child.pid ?? -1, port: options.port, logPath, startedAt: new Date().toISOString() });
  return child.pid ?? -1;
}

export function stopDaemon(store: ConfigStore): 'stopped' | 'not-running' | 'stale-cleared' {
  const daemon = store.readDaemon();
  if (!daemon) return 'not-running';
  if (!isProcessRunning(daemon.pid)) {
    store.clearDaemon();
    return 'stale-cleared';
  }
  process.kill(daemon.pid, 'SIGTERM');
  store.clearDaemon();
  return 'stopped';
}
