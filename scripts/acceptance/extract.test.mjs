import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStdinSnippets, isJournalCommand } from './extract.mjs';

test('keeps stdin block for -f- command', () => {
  assert.deepEqual(extractStdinSnippets('<\na\n$ hledger -f- print\n'), ['a\n']);
});

test('accepts "-f -" and "-f journal:-"', () => {
  assert.equal(isJournalCommand('hledger -f - bal'), true);
  assert.equal(isJournalCommand('hledger -f journal:- reg'), true);
});

test('skips other readers', () => {
  assert.equal(isJournalCommand('hledger -f timeclock:- print'), false);
  assert.equal(isJournalCommand('hledger -ftimedot:- print'), false);
  assert.equal(isJournalCommand('hledger -f csv:- print'), false);
  assert.equal(isJournalCommand('hledger -f- --rules-file x.rules print'), false);
});

test('one snippet per < block even with several commands', () => {
  const text = '<\na\n$ hledger -f- print\nout\n$ hledger -f- bal\n';
  assert.equal(extractStdinSnippets(text).length, 1);
});

test('drops block whose command is not a journal read', () => {
  assert.deepEqual(extractStdinSnippets('<\nx,y\n$ hledger -f csv:- print\n'), []);
});
