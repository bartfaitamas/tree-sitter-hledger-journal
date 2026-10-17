import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseAll } from './treesitter.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

test('a MISSING hidden token counts as a failed parse', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-has-error-'));
  // `tree-sitter parse` reports this as successful: the MISSING node is the
  // hidden _quantity token inside the amount.
  const missing = path.join(dir, 'missing-quantity.journal');
  fs.writeFileSync(missing, 'P 2024-01-01 EUR $\n');
  const clean = path.join(dir, 'clean.journal');
  fs.writeFileSync(clean, '2024-01-01 x\n    a  1\n    b\n');

  const result = parseAll([missing, clean], { grammarDir: repoRoot, libDir: path.join(dir, 'lib') });

  assert.equal(result.get(missing), false);
  assert.equal(result.get(clean), true);
});
