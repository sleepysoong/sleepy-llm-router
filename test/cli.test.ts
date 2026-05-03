import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('CLI entrypoint', () => {
  it('prints help', () => {
    const out = execFileSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--help'], { encoding: 'utf8' });
    expect(out).toContain('oh-my-free-models 0.0.1');
    expect(out).toContain('omfm model');
  });

  it('reports stopped status without daemon', () => {
    const out = execFileSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'status'], { encoding: 'utf8', env: { ...process.env, OMFM_HOME: `${process.cwd()}/.tmp-test-home` } });
    expect(out).toContain('omfm stopped');
  });
});
