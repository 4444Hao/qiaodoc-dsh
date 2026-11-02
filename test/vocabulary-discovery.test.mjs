import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { vocabularyEntry, upsertVocabulary, vocabularyMarkdown, latestLookupAnswer } from '../src/core/vocabulary.js';
import { parseCatalog, epubUrl, downloadBook } from '../src/host/discovery.js';
import { sendAnkiEntry } from '../src/host/anki.js';
import { hostHarness } from './host-harness.mjs';
import { createBookState, addHighlight } from '../src/core/state.js';

test('vocabulary deduplicates term plus sentence and preserves source links on disk', async () => {
  const host = await hostHarness();
  try {
    const { book } = await host.api.import({ filename: 'v.txt', base64: Buffer.from('A word in context.').toString('base64') });
    const result = addHighlight(createBookState(book.id), { chapterHref: 'text/page-1.xhtml', text: 'word', textOffset: 2 });
    const entry = vocabularyEntry(book.id, { term: 'word', context: 'A word in context.', meaning: '词语', highlightId: result.highlight.id });
    const list = upsertVocabulary(upsertVocabulary([], entry), { ...entry, meaning: '单词' });
    assert.equal(list.length, 1);
    await host.api.saveState(book.id, { ...result.state, vocabulary: list });
    const notes = await host.api.exportNotes(book.id);
    assert.match(notes.markdown, /单词/);
    assert.match(vocabularyMarkdown(book.id, list), /#qmr-book=.*&qmr-highlight=/);
    await host.api.remove(book.id); await host.restart().restore(book.id);
    assert.equal((await host.api.loadState(book.id)).vocabulary[0].meaning, '单词');
  } finally { await host.cleanup(); }
});

test('lookup projection only extracts a finalized visible answer, never reasoning', () => {
  const nodes = new Map([['1', { kind: 'assistant-step', data: { finalNode: {}, blocks: [{ kind: 'reasoning', text: 'private' }, { kind: 'text', text: 'meaning' }] } }], ['2', { kind: 'assistant-step', data: { blocks: [{ kind: 'text', text: 'unfinished' }] } }]]);
  assert.equal(latestLookupAnswer({ views: new Map([['chat', { order: ['1', '2'], nodes }]]) }), 'meaning');
  assert.equal(latestLookupAnswer({}), '');
});

test('Anki uses fixed loopback API, escapes imported text, and suppresses duplicates', async () => {
  const calls = [];
  const entry = vocabularyEntry('b', { term: '<script>', meaning: '<img onerror=evil>', context: 'quote' });
  const request = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8765'); const call = JSON.parse(options.body); calls.push(call);
    return { ok: true, json: async () => ({ error: null, result: call.action === 'findNotes' ? [] : 123 }) };
  };
  assert.equal((await sendAnkiEntry({ id: 'b', title: 'Book' }, entry, request)).noteId, 123);
  assert.equal(calls[1].params.note.fields.Front, '&lt;script&gt;');
  assert.doesNotMatch(calls[1].params.note.fields.Back, /<img/);
  const duplicate = await sendAnkiEntry({ id: 'b' }, entry, async () => ({ ok: true, json: async () => ({ error: null, result: [123] }) }));
  assert.equal(duplicate.duplicate, true);
});

test('catalogue filters external IDs/URLs and downloads reject invalid EPUB bytes', async () => {
  const xml = '<feed><entry><id>https://www.gutenberg.org/ebooks/11</id><title>Alice</title><author><name>Lewis</name></author></entry><entry><id>https://evil.example/ebooks/11</id><title>Fake</title></entry></feed>';
  assert.deepEqual(parseCatalog(xml).map(b => b.id), ['11']);
  assert.equal(epubUrl('<feed><link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="https://evil.example/ebooks/11.epub"/></feed>', '11'), undefined);
  const detail = '<feed><link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="/ebooks/11.epub3.images"/></feed>';
  await assert.rejects(downloadBook('11', async url => new Response(url.endsWith('.opds') ? detail : 'not a zip')), /ZIP|zip/);
});

test('damaged index blocks mutation and preserves original evidence', async () => {
  const host = await hostHarness();
  try {
    await host.api.library(); const file = path.join(host.root, '乔木阅读/library.json');
    await writeFile(file, '{broken');
    await assert.rejects(host.api.import({ filename: 'x.txt', base64: 'SGVsbG8=' }), /已保留原文件/);
    assert.equal(await readFile(file, 'utf8'), '{broken');
  } finally { await host.cleanup(); }
});
