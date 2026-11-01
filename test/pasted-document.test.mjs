import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { suggestedPasteName, pastedDocumentFilename, MAX_PASTED_DOCUMENT_BYTES } from '../src/core/pasted-document.js';
import { createPastedDocument } from '../src/host/pasted-document.js';

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'qmr-paste-'));
  const state = { disposed: 0, observed: 0 };
  const ctx = { sessionQuery: { async observeSession(id, options) {
    assert.equal(id, 'synthetic'); assert.equal(options.projectionMode, 'none'); state.observed++;
    return { header: { cwd: root }, [Symbol.dispose]() { state.disposed++; } };
  } } };
  return { root, ctx, state, cleanup: () => rm(root, { recursive: true, force: true }) };
}
const request = { sessionId: 'synthetic', name: '测试材料', format: 'txt', text: '材料原文\r\n  保留换行和缩进。\n' };

test('paste names use the first nonempty line and local timestamp, with safe Windows names', () => {
  const date = new Date(2026, 10, 1, 14, 30, 25);
  assert.equal(suggestedPasteName('\n# 实验/方法：说明\n正文', date), '实验_方法：说明_20261101-143025');
  assert.equal(suggestedPasteName('CON', date), '文本_CON_20261101-143025');
  assert.equal(suggestedPasteName('', date), '粘贴文本_20261101-143025');
  assert.equal(pastedDocumentFilename('论文.txt', 'md'), '论文.md');
  for (const name of ['../escape', 'a\\b', 'CON', 'nul.txt', '.hidden', 'trailing.', 'bad:name', 'a'.repeat(81)]) {
    assert.throws(() => pastedDocumentFilename(name, 'txt'));
  }
  assert.throws(() => pastedDocumentFilename('a', 'html'));
});

test('paste writes UTF-8 exactly into the Session cwd, ignoring client workspace paths', async () => {
  const app = await fixture();
  try {
    const saved = await createPastedDocument(app.ctx, { ...request, cwd: '/wrong', filePath: '/wrong/file.txt' });
    assert.equal(saved.filePath, path.join(await import('node:fs/promises').then(fs => fs.realpath(app.root)), '粘贴文档', '测试材料.txt'));
    assert.equal(await readFile(saved.filePath, 'utf8'), request.text);
    assert.deepEqual(app.state, { disposed: 1, observed: 1 });
    assert.deepEqual((await readdir(app.root)).sort(), ['粘贴文档']);
  } finally { await app.cleanup(); }
});

test('concurrent paste saves never overwrite an existing file and preserve each payload', async () => {
  const app = await fixture();
  try {
    const values = await Promise.all(['first', 'second', 'third'].map(text => createPastedDocument(app.ctx, { ...request, format: 'md', text })));
    assert.equal(new Set(values.map(value => value.filePath)).size, 3);
    assert.deepEqual((await Promise.all(values.map(value => readFile(value.filePath, 'utf8')))).sort(), ['first', 'second', 'third']);
    assert.deepEqual(values.map(value => value.name).sort(), ['测试材料.md', '测试材料_2.md', '测试材料_3.md']);
  } finally { await app.cleanup(); }
});

test('empty, oversized and invalid paste requests do not touch the workspace', async () => {
  const app = await fixture();
  try {
    for (const patch of [{ text: ' \n' }, { text: '文'.repeat(MAX_PASTED_DOCUMENT_BYTES / 3 + 1) }, { name: '../../escape' }, { format: 'exe' }, { sessionId: '' }]) {
      await assert.rejects(createPastedDocument(app.ctx, { ...request, ...patch }));
    }
    assert.deepEqual(await readdir(app.root), []);
    assert.equal(app.state.observed, 0);
    app.ctx.sessionQuery.observeSession = async () => ({ header: { cwd: 'relative/path' }, [Symbol.dispose]() { app.state.disposed++; } });
    await assert.rejects(createPastedDocument(app.ctx, request), /工作区/);
    assert.equal(app.state.disposed, 1);
  } finally { await app.cleanup(); }
});

test('a redirected paste folder cannot write outside the Session workspace', async () => {
  const app = await fixture();
  const outside = await mkdtemp(path.join(tmpdir(), 'qmr-paste-outside-'));
  try {
    await symlink(outside, path.join(app.root, '粘贴文档'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(createPastedDocument(app.ctx, request), /指向其他位置/);
    assert.deepEqual(await readdir(outside), []);
  } finally { await app.cleanup(); await rm(outside, { recursive: true, force: true }); }
});
