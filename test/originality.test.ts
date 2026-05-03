import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const checkedRoots = ['src', 'docs', 'research', 'scripts'];
const checkedFiles = ['README.md', 'AGENTS.md', 'package.json'];
const prohibited = [
  /blessed-contrib/i,
  /inkjs/i,
  /free[- ]router/i,
  /bytonylee/i,
  /borrowed/i,
  /inspired by/i,
  /source-of-truth/i,
  /first-pass/i,
  /scaffold/i,
  /external-origin/i,
  /react[- ]?blessed/i,
  /github\.com\/[^\s]+\/[^\s]+\/blob/i,
];
const hangul = /[\u3131-\u318E\uAC00-\uD7A3]/;

function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

describe('originality guard', () => {
  it('keeps maintained project surfaces free of prohibited external-reference markers', () => {
    const files = [...checkedRoots.flatMap(filesUnder), ...checkedFiles].filter((file) => fs.existsSync(file));
    const hits: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of prohibited) {
        if (pattern.test(text)) hits.push(`${file}: prohibited pattern`);
      }
      if (hangul.test(text)) hits.push(`${file}: non-English text`);
    }
    expect(hits).toEqual([]);
  });
});
