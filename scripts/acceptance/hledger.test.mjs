import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMessage } from './hledger.mjs';

test('exit code 0 is valid', () => {
  assert.equal(classifyMessage(0, ''), 'valid');
});

test('unbalanced transaction is a semantic error, so valid syntax', () => {
  assert.equal(classifyMessage(1, 'This transaction is unbalanced.'), 'valid');
});

test('missing include file is a semantic error, so valid syntax', () => {
  assert.equal(classifyMessage(1, 'No files were matched by: x.journal'), 'valid');
});

test('parse error is invalid', () => {
  assert.equal(classifyMessage(1, 'unexpected newline'), 'invalid');
});
