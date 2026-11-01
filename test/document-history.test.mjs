import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { historyKey, updateDocumentHistory } from '../src/core/document-history.js';
import { hostHarness } from './host-harness.mjs';

const record = { sessionId: 's1', filePath: 'D:/reading/paper.pdf', title: 'paper.pdf', opened: true };
test('history identity is conversation plus document; formats and positions remain independent', () => {
  let state = updateDocumentHistory({ version: 1, entries: [] }, { ...record, position: { page: 2, offset: .3 } }, 10);
  state = updateDocumentHistory(state, { ...record, sessionId: 's2' }, 20);
  state = updateDocumentHistory(state, { ...record, filePath: 'D:\\READING\\paper.pdf', opened: false, nodeKey: 'message', anchorSeq: 7, turn: 1 }, 30);
  assert.equal(state.entries.length, 2);
  assert.equal(state.entries[1].lastOpenedAt, 10);
  assert.equal(state.entries[1].anchorSeq, 7);
  assert.deepEqual(state.entries[1].position, { page: 2, offset: .3 });
  assert.equal(historyKey('s1', 'D:/reading/paper.pdf'), historyKey('s1', 'd:\\reading\\PAPER.pdf'));
  assert.equal(state.entries[0].position, undefined);
  const overlap = updateDocumentHistory(state, { ...record, position: { page: 2, offset: -.15 }, opened: false }, 40);
  assert.equal(overlap.entries.find(entry => entry.sessionId === 's1').position.offset, -.15);
});
test('invalid history updates do not mutate the prior index', () => {
  const state = updateDocumentHistory({ version: 1, entries: [] }, record, 1);
  const before = JSON.stringify(state);
  for (const patch of [{ position: { page: -1 } }, { position: { offset: 1.1 } }, { title: '' }, { filePath: '../image.exe' }, { anchorSeq: -1 }]) {
    assert.throws(() => updateDocumentHistory(state, { ...record, ...patch }, 2));
    assert.equal(JSON.stringify(state), before);
  }
});
test('host history survives restart and concurrent records without importing books', async () => {
  const host = await hostHarness();
  try {
    await Promise.all(Array.from({ length: 6 }, (_, index) => host.api.recordDocumentHistory({ ...record, sessionId: `s${index}` })));
    const restarted = host.restart();
    assert.equal((await restarted.documentHistory()).entries.length, 6);
    assert.equal((await restarted.library()).books.length, 0);
    const file = path.join(host.root, '乔木阅读/document-history.json');
    await writeFile(file, '{broken');
    await assert.rejects(restarted.recordDocumentHistory(record));
    assert.equal(await readFile(file, 'utf8'), '{broken');
  } finally { await host.cleanup(); }
});
