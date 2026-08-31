#!/usr/bin/env node
/**
 * COSTCO-SAVER — no-stub release scan.
 * Spec §96.
 *
 * Walks src/, supabase/functions/, tests/, and admin/, searching for:
 *   TODO, FIXME, COMING_SOON, mockData, fakeData, dummyData, placeholderAction
 *
 * Approved exceptions must be wrapped in a comment line of the form:
 *   // no-stub-scan: approved <reason>
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SCAN_DIRS = ['src', 'supabase/functions', 'tests', 'admin'];
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);
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
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (ALLOWED_EXT.has(name.slice(name.lastIndexOf('.')))) {
      out.push(full);
    }
  }
  return out;
}

const hits = [];
for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  for (const file of walk(abs)) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (ALLOW_COMMENT.test(line)) continue;
      for (const word of FORBIDDEN) {
        const pat = word === 'COMING_SOON'
          ? new RegExp(word)
          : new RegExp(`\\b${word}\\b`);
        if (pat.test(line)) {
          hits.push({ file: relative(ROOT, file), line: i + 1, text: line.trim() });
        }
      }
    }
  }
}

if (hits.length === 0) {
  console.log('no-stub-scan: 0 forbidden markers found.');
  process.exit(0);
}

console.error('no-stub-scan: found forbidden markers:');
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  ${h.text}`);
}
process.exit(1);
