// Collect journal inputs from an hledger source checkout.
// Nothing collected here is committed: hledger is GPL-3.0, this repo is MIT.
import fs from 'node:fs';
import path from 'node:path';

const JOURNAL_STDIN = /-f\s*(journal:)?-(\s|$)/;
const OTHER_READER = /(timeclock|timedot|csv|ssv|tsv|rules):|--rules/;
const JOURNAL_FILE = /\.(j|journal|hledger)$/;

export function isJournalCommand(cmd) {
  return JOURNAL_STDIN.test(cmd) && !OTHER_READER.test(cmd);
}

// shelltestrunner format 3: a line that is exactly "<" starts a stdin block,
// which runs until the next "$ " command line.
export function extractStdinSnippets(text) {
  const lines = text.split('\n');
  const snippets = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== '<') continue;
    const body = [];
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('$ ')) body.push(lines[j++]);
    if (j < lines.length && isJournalCommand(lines[j])) {
      snippets.push(body.map((l) => l + '\n').join(''));
    }
    i = j - 1;
  }
  return snippets;
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && predicate(e.name))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

export function collectInputs(hledgerSrc, outDir) {
  const testDir = path.join(hledgerSrc, 'hledger', 'test');
  const inputsDir = path.join(outDir, 'inputs');
  fs.rmSync(inputsDir, { recursive: true, force: true });
  fs.mkdirSync(inputsDir, { recursive: true });

  const inputs = [];
  for (const file of walk(testDir, (n) => n.endsWith('.test'))) {
    const rel = path.relative(hledgerSrc, file);
    extractStdinSnippets(fs.readFileSync(file, 'utf8')).forEach((snippet, n) => {
      const id = `${rel}#${n + 1}`;
      const out = path.join(inputsDir, `${rel.replaceAll('/', '__')}-${n + 1}.journal`);
      fs.writeFileSync(out, snippet);
      inputs.push({ id, path: out });
    });
  }
  for (const dir of [testDir, path.join(hledgerSrc, 'examples')]) {
    for (const file of walk(dir, (n) => JOURNAL_FILE.test(n))) {
      inputs.push({ id: path.relative(hledgerSrc, file), path: file });
    }
  }
  return inputs;
}
