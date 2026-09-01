#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SCAN_DIRS = ['src', 'server', 'tests', 'admin-scaffold'];
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const FORBIDDEN = [
  'TODO',
  'FIXME',
  'COMING_SOON',
  'mockData',
  'fakeData',
  'dummyData',
  'placeholderAction',
];
const ALLOW_COMMENT = /no-stub-scan:\s*approved/i;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const item = statSync(full);
    if (item.isDirectory()) out.push(...walk(full));
    else if (ALLOWED_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

const hits = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (ALLOW_COMMENT.test(line)) continue;
      for (const word of FORBIDDEN) {
        if (new RegExp(`\\b${word}\\b`).test(line)) {
          hits.push({ file: relative(ROOT, file), line: index + 1, text: line.trim() });
        }
      }
    }
  }
}

if (!hits.length) {
  console.log('no-stub-scan: 0 forbidden markers found.');
  process.exit(0);
}

console.error('no-stub-scan: found forbidden markers:');
for (const hit of hits) {
  console.error(`  ${hit.file}:${hit.line}  ${hit.text}`);
}
process.exit(1);
