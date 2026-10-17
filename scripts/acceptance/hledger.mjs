// hledger as the oracle: is a journal syntactically valid?
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Errors hledger reports after parsing succeeded. Inputs failing only with
// these count as valid syntax.
const SEMANTIC_ERROR = /unbalanced|No files were matched|Invalid glob|should be the same/;

export function classifyMessage(exitCode, stderr) {
  return exitCode === 0 || SEMANTIC_ERROR.test(stderr) ? 'valid' : 'invalid';
}

export function classify(file) {
  const result = spawnSync('hledger', ['-f', file, 'print', '--ignore-assertions'], {
    cwd: path.dirname(file),
    encoding: 'utf8',
    timeout: 30_000,
    // Without a UTF-8 locale (e.g. the nix build sandbox) hledger cannot
    // decode non-ASCII journals and every such input looks invalid.
    env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
  });
  const stderr = result.stderr ?? '';
  const message =
    stderr
      .split('\n')
      .find((l) => l.trim() !== '' && !l.includes('|') && !l.startsWith('hledger: Error:')) ?? '';
  return { verdict: classifyMessage(result.status ?? 1, stderr), message: message.trim() };
}
