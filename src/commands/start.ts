import { ConfigStore } from '../config/store.js';
import { getLogPath } from '../config/paths.js';
import { startDaemon } from '../daemon/daemon.js';
import { createOmfmServer, formatServerLogEvent, listen } from '../server/create-server.js';

export async function runStartCommand(options: { port?: number; daemon?: boolean; daemonChild?: boolean; store?: ConfigStore } = {}): Promise<void> {
  const store = options.store ?? new ConfigStore();
  store.ensureRoot();
  const config = store.readConfig();
  const port = options.port ?? config.port;
  if (config.port !== port) store.writeConfig({ ...config, port });

  if (options.daemon && !options.daemonChild) {
    const pid = startDaemon({ port, store });
    console.log(`omfm daemon started on port ${port} (pid ${pid})`);
    return;
  }

  const server = createOmfmServer({ store, requestLogger: (event) => console.log(formatServerLogEvent(event, { color: process.stdout.isTTY })) });
  const actualPort = await listen(server, port);
  if (options.daemonChild) {
    store.writeDaemon({ pid: process.pid, port: actualPort, logPath: getLogPath(store.paths.root), startedAt: new Date().toISOString() });
  }
  console.log(`omfm listening on http://localhost:${actualPort}`);

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
