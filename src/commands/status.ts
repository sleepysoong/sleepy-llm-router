import { ConfigStore } from '../config/store.js';

export function getStatus(store = new ConfigStore()) {
  const config = store.readConfig();
  const primaryModel = config.selectedModelIds.length > 0 ? config.selectedModelIds[0] : undefined;
  return { port: config.port, configPath: store.paths.configPath, selectedModelCount: config.selectedModelIds.length, primaryModel };
}

export function printStatus(store = new ConfigStore()): void {
  const status = getStatus(store);
  console.log(`포트: ${status.port}`);
  console.log(`설정: ${status.configPath}`);
  console.log(`선택된 모델: ${status.selectedModelCount}개`);
  if (status.primaryModel) console.log(`기본 모델: ${status.primaryModel}`);
}
