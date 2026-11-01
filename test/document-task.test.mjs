import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationFiles, createDocumentTasks, documentPrompt, sessionFileAddress } from '../src/core/document-task.js';

const selection = { sessionId: 's1', title: 'sample.pdf', page: 2, text: 'A real source passage.' };
function harness({ delayed = false } = {}) {
  let state = { phase: 'plain', draft: '', draftRev: 1, attachmentIds: [], occurrences: [] };
  let current = true;
  let sent = 0;
  const listeners = new Set();
  const input = { getSnapshot: () => state, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const binding = { sessionId: 's1', running: false, input, actions: {
    captureInsertion: () => ({ start: state.draft.length, end: state.draft.length, draftRev: state.draftRev }),
    insertText(text, span) {
      if (span.draftRev !== state.draftRev) return false;
      const update = () => { state = { ...state, draft: state.draft.slice(0, span.start) + text + state.draft.slice(span.end), draftRev: state.draftRev + 1 }; for (const fn of [...listeners]) fn(); };
      if (delayed) queueMicrotask(update); else update();
      return true;
    },
    submit() { sent++; },
  } };
  return { binding, state: () => state, set: (next) => { state = { ...state, ...next }; }, sent: () => sent,
    switch: () => { current = false; binding.sessionId = 's2'; }, listeners,
    run: createDocumentTasks(() => binding, () => current) };
}

test('quick tasks send exactly once through existing input after the actual draft is published', async () => {
  for (const delayed of [false, true]) {
    const app = harness({ delayed });
    assert.deepEqual(await app.run('translate', selection), { status: 'submitted' });
    assert.equal(app.sent(), 1);
    assert.ok(app.state().draft.includes('sample.pdf · PDF 2'));
    assert.ok(app.state().draft.includes('> A real source passage.'));
    assert.equal(app.listeners.size, 0);
  }
});

test('ask appends the complete quote without sending or replacing an existing draft', async () => {
  const app = harness(); app.set({ draft: 'My existing question: ' });
  // Even when the user left the entire existing draft selected, Ask must append.
  app.binding.actions.captureInsertion = () => ({ start: 0, end: app.state().draft.length, draftRev: app.state().draftRev });
  assert.deepEqual(await app.run('ask', selection), { status: 'inserted' });
  assert.ok(app.state().draft.startsWith('My existing question: \n\n'));
  assert.ok(app.state().draft.includes(selection.text)); assert.equal(app.sent(), 0);
});

test('quick actions preserve busy input, draft, attachments and reference occurrences', async () => {
  for (const [patch, code] of [[{ phase: 'submitting' }, 'busy'], [{ draft: 'keep me' }, 'draft'],
    [{ attachmentIds: ['a'] }, 'attachments'], [{ occurrences: [{}] }, 'attachments']]) {
    const app = harness(); app.set(patch); const before = app.state();
    await assert.rejects(app.run('explain', selection), { code }); assert.equal(app.state(), before); assert.equal(app.sent(), 0);
  }
  const app = harness(); app.binding.running = true;
  await assert.rejects(app.run('translate', selection), { code: 'busy' });
});

test('a Session switch during editor publication cannot submit to either Session', async () => {
  const app = harness({ delayed: true });
  const pending = app.run('translate', selection); app.switch();
  await assert.rejects(pending, { code: 'stale' }); assert.equal(app.sent(), 0); assert.equal(app.listeners.size, 0);
});

test('repeated clicks and stale editor revisions cannot cause duplicate sends', async () => {
  const app = harness({ delayed: true }); const first = app.run('explain', selection);
  await assert.rejects(app.run('explain', selection), { code: 'busy' }); await first; assert.equal(app.sent(), 1);
  const stale = harness(); stale.binding.actions.captureInsertion = () => ({ draftRev: 0 });
  await assert.rejects(stale.run('translate', selection), { code: 'draftChanged' }); assert.equal(stale.state().draft, '');
});

test('file identities are Session-scoped; loaded file references deduplicate by attachment id', () => {
  assert.equal(sessionFileAddress('s 1', 'D:\\研究\\sample.pdf'), 'dsh-resource://file/session/s%201/D:/%E7%A0%94%E7%A9%B6/sample.pdf');
  const file = { attachmentId: 'a', name: 'paper.pdf', bytes: 100 };
  const chat = { nodes: { values: () => [
    { kind: 'user', data: { content: [{ type: 'file', attachment: file }] } },
    { kind: 'steering', data: { content: [{ type: 'file', attachment: file }] } },
    { kind: 'assistant', data: { content: [{ type: 'file', attachment: { ...file, attachmentId: 'b' } }] } },
  ] } };
  assert.deepEqual(conversationFiles(chat), [file]);
  assert.throws(() => documentPrompt('explain', { ...selection, text: ' '.repeat(10) }), { code: 'empty' });
  assert.throws(() => documentPrompt('explain', { ...selection, text: 'a'.repeat(20001) }), { code: 'tooLong' });
});
