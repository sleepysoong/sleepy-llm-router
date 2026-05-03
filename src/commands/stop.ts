import { ConfigStore } from '../config/store.js';
import { stopDaemon } from '../daemon/daemon.js';

export function runStopCommand(store = new ConfigStore()): void {
  const result = stopDaemon(store);
  console.log(`omfm daemon ${result}`);
}
