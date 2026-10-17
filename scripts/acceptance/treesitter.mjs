// tree-sitter as the subject: does each file parse without ERROR/MISSING?
//
// `tree-sitter parse` misses MISSING hidden tokens (e.g. a zero-width
// _quantity), so this compiles a small checker against libtree-sitter and
// the grammar's src/ and asks ts_node_has_error() directly.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// The tree-sitter CLI's installation prefix also holds libtree-sitter and
// its headers (as in nixpkgs).
function treeSitterPrefix() {
  const which = spawnSync('sh', ['-c', 'command -v tree-sitter'], { encoding: 'utf8' });
  const bin = which.stdout.trim();
  if (!bin) throw new Error('tree-sitter not found on PATH');
  const prefix = path.resolve(path.dirname(fs.realpathSync(bin)), '..');
  if (!fs.existsSync(path.join(prefix, 'include', 'tree_sitter', 'api.h'))) {
    throw new Error(`no tree_sitter/api.h under ${prefix}; run inside nix develop`);
  }
  return prefix;
}

function buildChecker(grammarDir, libDir) {
  fs.mkdirSync(libDir, { recursive: true });
  const prefix = treeSitterPrefix();
  const exe = path.join(libDir, 'has-error');
  const src = path.join(grammarDir, 'src');
  const sources = [path.join(import.meta.dirname, 'has-error.c'), path.join(src, 'parser.c')];
  const scanner = path.join(src, 'scanner.c');
  if (fs.existsSync(scanner)) sources.push(scanner);
  const cc = spawnSync(
    process.env.CC || 'cc',
    [
      '-O2', '-std=c11',
      `-I${path.join(prefix, 'include')}`, `-I${src}`,
      ...sources,
      `-L${path.join(prefix, 'lib')}`, `-Wl,-rpath,${path.join(prefix, 'lib')}`,
      '-ltree-sitter', '-o', exe,
    ],
    { encoding: 'utf8' },
  );
  if (cc.status !== 0) throw new Error(`building has-error failed:\n${cc.stderr}`);
  return exe;
}

export function parseAll(paths, { grammarDir, libDir }) {
  const exe = buildChecker(grammarDir, libDir);
  const result = spawnSync(exe, [], {
    input: paths.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`has-error failed:\n${result.stderr}`);
  const verdicts = new Map();
  for (const line of result.stdout.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    verdicts.set(line.slice(tab + 1), line.slice(0, tab) === '0');
  }
  return verdicts;
}
