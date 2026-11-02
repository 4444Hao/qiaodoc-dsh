import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDataLayer, createDocumentData } from '../src/client/bridge.js';
import { hostHarness } from './host-harness.mjs';
import { saveLocalLibrary, saveBookBytes, loadBookBytes, saveLocalState, loadLocalState } from '../src/client/storage.js';

const cache = new Map();
globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) };
beforeEach(() => cache.clear());

test('a fresh document catalog stays empty across refresh and restart', async () => {
  const data = createDocumentData();
  assert.equal((await data.refreshLibrary()).books.length, 0);
  assert.equal((await data.refreshLibrary()).books.length, 0);
  assert.equal((await createDocumentData().refreshLibrary()).books.length, 0);
});

test('conversation document data imports a real file and restores its stored title after reconnect', async () => {
  const host = await hostHarness();
  try {
    const data = createDocumentData();
    await data.setHost(host.api);
    assert.equal(data.getHost(), host.api);
    const bytes = new TextEncoder().encode('# 文档标题\n\n保留原文与工作区副本。');
    const imported = await data.importBook({ name: '我的原文.md', arrayBuffer: async () => bytes.buffer });
    assert.equal(imported.ok, true);
    assert.equal(imported.hostError, '');
    assert.ok(imported.book.file.endsWith('.md'));
    await data.refreshLibrary();
    const reopened = createDocumentData();
    await reopened.setHost(host.restart());
    const stored = reopened.getLibrary().books.find(book => book.id === imported.book.id);
    assert.equal(stored.title, imported.book.title);
    assert.equal(stored.file, imported.book.file);
    assert.equal(stored.format, 'md');
    assert.deepEqual(Buffer.from((await host.api.readBookBytes(stored.id)).base64, 'base64'), Buffer.from(bytes));
    assert.equal(reopened.getLibrary().books.length, 1);
  } finally { await host.cleanup(); }
});

test('retiring starter payloads preserves cached records, bytes, state and imported copies', async () => {
  const old = { id: 'gutenberg-11', title: '旧副本', format: 'txt', source: 'starter', builtin: true, identifier: 'urn:qbr:starter:11' };
  const imported = { id: 'real-file', title: '自己的文件名', format: 'txt', source: 'host', file: 'books/real-file.txt', identifier: old.identifier };
  const bytes = new TextEncoder().encode('A retained user copy');
  await saveLocalLibrary({ books: [old, imported], removedBooks: [{ id: 'archived', title: '旧归档', format: 'txt' }], bookAliases: { previous: 'real-file' } });
  await saveBookBytes(old.id, bytes);
  await saveLocalState(old.id, { bookId: old.id, updatedAt: 100, locator: { scroll: .6 }, vocabulary: [{ id: 'kept' }] });
  const data = createDataLayer();
  const library = await data.refreshLibrary();
  assert.deepEqual(library.books.map(book => book.id), [old.id, imported.id]);
  assert.equal(library.books[1].title, '自己的文件名');
  assert.equal(library.removedBooks[0].id, 'archived');
  assert.equal(data.resolveBookId('previous'), 'real-file');
  assert.deepEqual(await loadBookBytes(old.id), bytes);
  assert.equal((await loadLocalState(old.id)).locator.scroll, .6);
  assert.match(await (await data.openBook(old.id)).engine.plainTextOf(0), /retained user copy/);
  assert.equal((await data.ensureState(old.id)).vocabulary[0].id, 'kept');
});
