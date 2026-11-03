import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ReaderService, name, LIBRARY_FOLDER } from './host-harness.mjs';
import { remoteHostApi } from '../src/client/host-api.js';

test('QiaoDoc Remote reaches its own host and preserves the existing file directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qiaodoc-identity-'));
  try {
    const host = new ReaderService({ effect: fn => fn(), get: () => undefined, inject() {} }, { workspaceRoot: root });
    assert.equal(name, 'qiaodoc-dsh');
    assert.equal(host.remoteNamespace, 'qiaoDoc');
    assert.equal(LIBRARY_FOLDER, '乔木阅读');
    const own = Object.fromEntries(['info', 'importBook', 'library', 'readBookBytes'].map(method => [method, async request => ({ ok: true, value: await host[method](request) })]));
    const old = new Proxy({}, { get() { throw new Error('Must not call the old Reader service'); } });
    const api = remoteHostApi({ remote: { qiaoDoc: own, qiaomuReader: old } });
    const bytes = Buffer.from('Retain the original document.', 'utf8');
    const { book } = await api.import({ filename: 'identity.txt', base64: bytes.toString('base64') });
    assert.equal((await api.library()).books[0].id, book.id);
    assert.equal((await api.info()).root, path.join(root, '乔木阅读'));
    assert.equal((await api.readBookBytes(book.id)).base64, bytes.toString('base64'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
