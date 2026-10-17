#!/usr/bin/env node
// Exit 1 if any given file has an ERROR or MISSING node (including MISSING
// hidden tokens, which `tree-sitter parse` does not report).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { parseAll } from './treesitter.mjs';

const files = process.argv.slice(2).map((f) => path.resolve(f));
const libDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hledger-journal-check-'));
const verdicts = parseAll(files, { grammarDir: path.resolve(import.meta.dirname, '..', '..'), libDir });
const failed = files.filter((f) => !verdicts.get(f));
for (const f of failed) console.error(`parse error: ${path.relative(process.cwd(), f)}`);
console.log(`${files.length - failed.length}/${files.length} files parse without errors`);
process.exit(failed.length ? 1 : 0);
