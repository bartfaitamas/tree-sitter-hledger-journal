#!/usr/bin/env node
// Acceptance harness: how much of hledger's own test material does the
// grammar parse, measured against hledger's verdict on the same inputs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectInputs } from './extract.mjs';
import { classify } from './hledger.mjs';
import { parseAll } from './treesitter.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const { values: args } = parseArgs({
  options: {
    'hledger-src': { type: 'string', default: process.env.HLEDGER_SRC },
    out: { type: 'string', default: path.join(repoRoot, '.cache', 'acceptance') },
    thresholds: {
      type: 'string',
      default: path.join(import.meta.dirname, 'thresholds.json'),
    },
  },
});

if (!args['hledger-src']) {
  console.error('error: pass --hledger-src or set HLEDGER_SRC (the devShell sets it)');
  process.exit(2);
}
const hledgerSrc = path.resolve(args['hledger-src']);
const out = path.resolve(args.out);
fs.mkdirSync(out, { recursive: true });

const srcVersion = fs
  .readFileSync(path.join(hledgerSrc, 'hledger', 'package.yaml'), 'utf8')
  .match(/^version:\s*(\S+)/m)?.[1];
const binVersion = spawnSync('hledger', ['--version'], { encoding: 'utf8' })
  .stdout?.match(/^hledger (\S+?),/)?.[1];

const inputs = collectInputs(hledgerSrc, out);
const verdicts = inputs.map((input) => ({ ...input, ...classify(input.path) }));
const parsed = parseAll(
  inputs.map((i) => i.path),
  { grammarDir: repoRoot, libDir: path.join(out, 'lib') },
);

const valid = verdicts.filter((v) => v.verdict === 'valid');
const invalid = verdicts.filter((v) => v.verdict === 'invalid');
const rejectedValid = valid.filter((v) => !parsed.get(v.path));
const acceptedInvalid = invalid.filter((v) => parsed.get(v.path));

const report = {
  hledgerVersion: binVersion,
  valid: { total: valid.length, accepted: valid.length - rejectedValid.length },
  invalid: { total: invalid.length, rejected: invalid.length - acceptedInvalid.length },
  rejectedValid: rejectedValid.map(({ id, path }) => ({ id, path })),
  acceptedInvalid: acceptedInvalid.map(({ id, path, message }) => ({ id, path, message })),
};
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');

const acceptRate = report.valid.accepted / report.valid.total;
const rejectRate = report.invalid.rejected / report.invalid.total;
const pct = (r) => (r * 100).toFixed(2);
console.log(`hledger: ${binVersion} (source ${srcVersion})`);
console.log(`valid accepted: ${report.valid.accepted}/${report.valid.total} (${pct(acceptRate)}%)`);
console.log(`invalid rejected: ${report.invalid.rejected}/${report.invalid.total} (${pct(rejectRate)}%)`);
console.log(`report: ${path.join(out, 'report.json')}`);

const { minAccept, minReject } = JSON.parse(fs.readFileSync(args.thresholds, 'utf8'));
let failed = false;
if (binVersion !== srcVersion) {
  console.error(`FAIL: hledger binary ${binVersion} != hledger source ${srcVersion}`);
  failed = true;
}
if (acceptRate < minAccept) {
  console.error(`FAIL: acceptance ${acceptRate.toFixed(4)} < minAccept ${minAccept}`);
  failed = true;
}
if (rejectRate < minReject) {
  console.error(`FAIL: rejection ${rejectRate.toFixed(4)} < minReject ${minReject}`);
  failed = true;
}
process.exit(failed ? 1 : 0);
