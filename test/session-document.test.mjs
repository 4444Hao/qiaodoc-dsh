import test from 'node:test';
import assert from 'node:assert/strict';
import { importSessionDocument, MAX_SESSION_DOCUMENT_BYTES } from '../src/host/session-document.js';
const ref = { attachmentId: `sha256:${'a'.repeat(64)}`, name: 'paper.pdf', bytes: 3 };
const request = { sessionId: 's1', attachmentId: ref.attachmentId, name: '../../fake.pdf', bytes: 1 };
function fixture(events = [{ type: 'user/message', data: { content: [{ type: 'file', attachment: ref }] } }]) {
  const state = { disposed: 0, reads: 0, writes: 0 };
  const ctx = {
    sessionQuery: { async observeSession(id, options) { assert.equal(id, 's1'); assert.equal(options.projectionMode, 'none'); return { header: { cwd: 'D:/test' }, events, [Symbol.dispose]() { state.disposed++; } }; } },
    attachments: { async *readFileStream(value) { state.reads++; assert.deepEqual(value, ref); yield Buffer.from('abc'); } },
  };
  const persist = async (value, bytes) => { state.writes++; assert.deepEqual(value, ref); assert.equal(bytes.toString(), 'abc'); return { book: { id: 'book' } }; };
  return { ctx, state, persist };
}
test('session documents use the logged metadata, dispose observation and verify stream before persistence', async () => {
  const app = fixture();
  assert.deepEqual(await importSessionDocument(app.ctx, request, app.persist), { book: { id: 'book' } });
  assert.deepEqual(app.state, { disposed: 1, reads: 1, writes: 1 });
});
test('unreferenced ids and opaque or image payloads cannot authorize generic file reads', async () => {
  for (const events of [[], [{ type: 'unknown', data: { content: [{ type: 'file', attachment: ref }] } }],
    [{ type: 'user/message', data: { content: [{ type: 'image', attachment: ref }] } }]]) {
    const app = fixture(events);
    await assert.rejects(importSessionDocument(app.ctx, request, app.persist), /没有引用/);
    assert.deepEqual(app.state, { disposed: 1, reads: 0, writes: 0 });
  }
  const app = fixture(); await assert.rejects(importSessionDocument(app.ctx, { ...request, attachmentId: '../file' }, app.persist), /无效/);
  assert.equal(app.state.disposed, 0);
});
test('corrupt, incomplete and oversized streams never reach the library', async () => {
  for (const mode of ['corrupt', 'short', 'long', 'large']) {
    const app = fixture(mode === 'large' ? [{ type: 'user/message', data: { content: [{ type: 'file', attachment: { ...ref, bytes: MAX_SESSION_DOCUMENT_BYTES + 1 } }] } }] : undefined);
    app.ctx.attachments.readFileStream = async function* () {
      yield Buffer.from(mode === 'short' ? 'a' : mode === 'long' ? 'abcd' : 'abc');
      if (mode === 'corrupt') throw new Error('digest mismatch');
    };
    await assert.rejects(importSessionDocument(app.ctx, request, app.persist));
    assert.equal(app.state.disposed, 1); assert.equal(app.state.writes, 0);
  }
});
