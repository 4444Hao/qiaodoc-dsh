/** Real rc.5 browser integration; requires the isolated profile + deterministic model.
 * See docs/WINDOWS-DEVELOPMENT.md. Never run against a daily profile.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { connect } from './lib/document-smoke-cdp.mjs';
import { sessionFileAddress } from '../src/core/document-task.js';

const root = path.resolve('release/dev');
const reports = path.join(root, 'reports');
const modelLog = path.join(reports, 'model-requests.jsonl');
const sample = path.resolve('test/fixtures/conversation-reader/sample.pdf');
const installed = path.join(root, 'dsh-home/profiles/web/node_modules');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(JSON.parse(await readFile(path.join(installed, 'qmr-document-smoke-model/package.json'))).name, 'qmr-document-smoke-model');
const candidateHash = sha(await readFile('client.js'));
assert.equal(sha(await readFile(path.join(installed, 'qiaomu-reader-dsh/client.js'))), candidateHash, 'Install the current candidate package first');
assert.equal(sha(await readFile(path.join(installed, 'qiaomu-reader-dsh/index.js'))), sha(await readFile('index.js')), 'Install the current Host bundle first');
await mkdir(reports, { recursive: true });
const c = await connect(process.env.QMR_CDP_URL);
const results = [];
const skipped = [];
let startupExceptions = [];
const wait = async (condition, description, timeout = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await condition()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`Timed out: ${description}`);
};
const log = async () => {
  try { return (await readFile(modelLog, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};
const turns = async () => (await log()).filter(row => row.kind === 'turn');
const session = () => c.run(() => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'));
const click = (text, parent = 'body') => c.run((label, selector) => {
  const button = [...document.querySelectorAll(`${selector} button`)].find(e => e.innerText.trim() === label);
  if (!button || button.disabled) throw new Error(`Button unavailable: ${label}`);
  button.click();
}, text, parent);
const clearComposer = async () => {
  await c.run(() => document.querySelector('[contenteditable="true"]').focus());
  await c.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await c.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await c.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await c.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await wait(() => c.run(() => !document.querySelector('[contenteditable="true"]').innerText.trim()), 'empty composer');
  await new Promise(resolve => setTimeout(resolve, 150));
};
const pick = async (text) => {
  await c.run(passage => {
    const span = [...document.querySelectorAll('[data-pdf-text] span')].find(e => e.textContent === passage);
    if (!span) throw new Error('Synthetic PDF text layer is missing');
    span.scrollIntoView({ block: 'center' });
  }, text);
  await new Promise(resolve => setTimeout(resolve, 150));
  await c.run(passage => {
    const span = [...document.querySelectorAll('[data-pdf-text] span')].find(e => e.textContent === passage);
    const range = document.createRange(); range.selectNodeContents(span);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    span.closest('[data-textpreview-body]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  }, text);
  await wait(() => c.run(() => !!document.querySelector('.qmr-doc-menu')), 'selection menu');
};
const screenshot = async name => {
  const result = await c.call('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(reports, name), Buffer.from(result.data, 'base64'));
};
try {
  await c.call('Page.bringToFront');
  await c.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await c.call('Page.reload');
  await wait(() => c.run(() => !!document.querySelector('[data-provider-id="qmr-smoke"], .qmr-history')), 'conversation or history panel');
  if (await c.run(() => !!document.querySelector('.qmr-history'))) await click('关闭', '.qmr-history');
  await wait(() => c.run(() => !!document.querySelector('[data-provider-id="qmr-smoke"]')), 'deterministic model selected');
  startupExceptions = c.errors.splice(0);
  const unexpectedStartup = startupExceptions.filter(error => ![
    "SlotAssemblyError: scope 'session-maybe' rendered without an installed adapter",
    'Error: conversation.input: sessions service unavailable',
  ].includes(error.split('\n')[0]));
  assert.equal(unexpectedStartup.length, 0, `Unexpected startup exceptions: ${unexpectedStartup.map(error => error.split('\n')[0]).join('; ')}`);
  const sidebar = await c.run(() => {
    document.querySelector('button[aria-label="收起侧边栏"]')?.click();
    const rect = document.querySelector('[data-side="rightbar"]')?.getBoundingClientRect();
    return rect ? { x: rect.x + rect.width / 2, y: Math.max(150, rect.y + 250) } : null;
  });
  if (sidebar) {
    await c.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...sidebar });
    await c.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...sidebar, button: 'left', clickCount: 1 });
    await c.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: sidebar.y, button: 'left', buttons: 1 });
    await c.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 720, y: sidebar.y, button: 'left', clickCount: 1 });
  }
  const beforeOpen = (await turns()).length;
  await click('打开原文');
  await c.run(() => document.querySelector('.qmr-doc-picker input[type="text"]').focus());
  await c.call('Input.insertText', { text: sample });
  await new Promise(resolve => setTimeout(resolve, 150));
  await click('打开原文', '.qmr-doc-picker');
  await wait(() => c.run(() => document.querySelector('[data-textpreview-body]')?.textContent.includes('QMR-PDF-A')), 'sample PDF open');
  assert.equal((await turns()).length, beforeOpen, 'Opening must not call the model');
  results.push('Workspace PDF opens without a model request');
  // Refuse to clear arbitrary draft text or exercise a real provider.
  const draft = await c.run(() => document.querySelector('[contenteditable="true"]').innerText);
  assert.ok(!draft.trim() || draft.startsWith('KEEP THIS DRAFT'), 'Use a dedicated synthetic test conversation');
  const sessionId = await session(); assert.ok(sessionId);
  const originalAddress = await c.run(() => document.querySelector('[data-textpreview-url]').getAttribute('data-textpreview-url'));
  assert.ok(originalAddress.includes(encodeURIComponent(sessionId)));
  await clearComposer();
  const passage = 'A document can be discussed in several conversations.';
  for (const action of ['翻译', '解释']) {
    const before = (await turns()).length;
    await pick(passage);
    await c.run(label => {
      const button = [...document.querySelectorAll('.qmr-doc-menu button')].find(e => e.innerText === label);
      button.click(); button.click();
    }, action);
    await wait(async () => (await turns()).length > before, `${action} provider request`);
    await wait(() => c.run(() => !!document.querySelector('button[aria-label="发送消息"]') && !document.querySelector('[contenteditable="true"]').innerText.trim()), 'turn finished');
    await new Promise(resolve => setTimeout(resolve, 350));
    const requests = (await turns()).slice(before);
    assert.equal(requests.length, 1, 'Repeated click must send one request');
    const prompt = requests[0].userTexts.filter(text => text.includes('来源：sample.pdf')).at(-1);
    assert.ok(prompt.includes(passage) && prompt.includes('来源：sample.pdf · PDF 1'));
    assert.ok(prompt.includes(action === '翻译' ? '请将以下选段翻译' : '请用中文解释'));
    assert.equal(await session(), sessionId);
    assert.equal(await c.run(() => document.querySelector('[data-textpreview-url]').getAttribute('data-textpreview-url')), originalAddress);
    results.push(`${action}: selected quote and source reached current session once`);
  }
  const beforeDraft = (await turns()).length;
  await c.run(() => document.querySelector('[contenteditable="true"]').focus());
  await c.call('Input.insertText', { text: 'KEEP THIS DRAFT' });
  await pick(passage); await click('翻译', '.qmr-doc-menu');
  await wait(() => c.run(() => document.querySelector('.qmr-doc-notice')?.textContent.includes('已有草稿')), 'draft warning');
  assert.equal(await c.run(() => document.querySelector('[contenteditable="true"]').innerText.trim()), 'KEEP THIS DRAFT');
  await click('询问 AI', '.qmr-doc-menu');
  await wait(() => c.run(() => document.querySelector('[contenteditable="true"]').innerText.includes('来源：sample.pdf · PDF 1')), 'ask insertion');
  const inserted = await c.run(() => document.querySelector('[contenteditable="true"]').innerText);
  assert.ok(inserted.startsWith('KEEP THIS DRAFT\n') && inserted.includes(passage));
  assert.equal((await turns()).length, beforeDraft);
  results.push('Existing draft preserved; Ask AI appends quote without a request');
  await screenshot('p1-draft-protection.png');
  await clearComposer();

  // Exercise the native upload -> durable attachment read -> reader import path.
  const { root: dom } = await c.call('DOM.getDocument');
  const { nodeId } = await c.call('DOM.querySelector', { nodeId: dom.nodeId, selector: 'input[type="file"]' });
  assert.ok(nodeId, 'Native file upload input');
  await c.call('DOM.setFileInputFiles', { nodeId, files: [sample] });
  await wait(() => c.run(() => document.querySelector('[data-conversation-region="composer"]')?.textContent.includes('sample.pdf')), 'PDF uploaded');
  await c.run(() => document.querySelector('[contenteditable="true"]').focus());
  await c.call('Input.insertText', { text: 'QMR synthetic attachment transport check.' });
  // Let the native editor publish its draft before invoking its submit button.
  await new Promise(resolve => setTimeout(resolve, 300));
  const beforeAttachment = (await turns()).length;
  await c.run(() => document.querySelector('button[aria-label="发送消息"]').click());
  await wait(async () => (await turns()).length > beforeAttachment, 'attachment message');
  await wait(() => c.run(() => !!document.querySelector('button[aria-label="发送消息"]') && !document.querySelector('[contenteditable="true"]').innerText.trim()), 'attachment turn finished');
  await click('打开原文');
  await wait(() => c.run(() => [...document.querySelectorAll('.qmr-doc-file')].some(e => e.textContent === 'sample.pdf')), 'conversation file listed');
  await click('sample.pdf', '.qmr-doc-picker');
  await wait(() => c.run(() => !document.querySelector('.qmr-doc-picker') || !!document.querySelector('.qmr-doc-picker [role="alert"]')), 'attachment open result');
  const error = await c.run(() => document.querySelector('.qmr-doc-picker [role="alert"]')?.textContent);
  assert.ok(!error, `Read attachment: ${error}`);
  await wait(() => c.run(() => document.querySelector('[data-textpreview-body]')?.textContent.includes('QMR-PDF-A')), 'imported PDF rendered');
  assert.equal(await session(), sessionId);
  const importedAddress = await c.run(() => document.querySelector('[data-textpreview-url]').getAttribute('data-textpreview-url'));
  assert.notEqual(importedAddress, originalAddress, 'Attachment opens its durable imported copy');
  results.push('Native chat PDF attachment read, persisted, and opened in the same session');
  await pick(passage);
  await screenshot('p1-attachment-selection.png');
  const beforeQuote = (await turns()).length;
  await click('询问 AI', '.qmr-doc-menu');
  await wait(() => c.run(() => document.querySelector('[contenteditable="true"]').innerText.includes('来源：sample.pdf · PDF 1')), 'attachment display name in quote');
  assert.equal((await turns()).length, beforeQuote);
  await clearComposer();
  results.push('Imported PDF quotes retain its display name and PDF page');

  const historyFile = path.join(root, 'workspace/乔木阅读/document-history.json');
  const historyEntries = async () => JSON.parse(await readFile(historyFile, 'utf8')).entries;
  const importedPath = decodeURIComponent(new URL(importedAddress).pathname).split('/').slice(3).join('/');
  const findEntry = async () => (await historyEntries()).find(entry => entry.sessionId === sessionId && entry.filePath.replaceAll('\\', '/') === importedPath);
  const interactionStart = (await turns()).length;
  await pick(passage); await click('翻译', '.qmr-doc-menu');
  await wait(async () => (await turns()).length > interactionStart, 'history interaction request');
  await wait(async () => !!(await findEntry())?.nodeKey, 'history message anchor persisted');
  await wait(() => c.run(() => !!document.querySelector('button[aria-label="发送消息"]') && !document.querySelector('[contenteditable="true"]').innerText.trim()), 'history interaction finished');
  await c.run(() => {
    const root = document.querySelector('[data-textpreview-url]');
    const port = root.querySelector('[data-document-zoom-scrollport]');
    const page = root.querySelector('[data-pdf-page="2"]');
    port.scrollTop += page.getBoundingClientRect().top - port.getBoundingClientRect().top + 120;
  });
  await wait(async () => (await findEntry())?.position?.page === 2, 'PDF page history persisted');
  const remembered = await findEntry();
  for (const [name, marker, format] of [['sample.md', 'QMR-MD-A', 'Markdown'], ['sample.txt', 'QMR-TXT-A', 'TXT']]) {
    await click('打开原文');
    await c.run(() => { const input = document.querySelector('.qmr-doc-picker input[type="text"]'); input.focus(); input.select(); });
    await c.call('Input.insertText', { text: path.resolve('test/fixtures/conversation-reader', name) });
    await new Promise(resolve => setTimeout(resolve, 150));
    await click('打开原文', '.qmr-doc-picker');
    await wait(() => c.run(text => document.querySelector('[data-textpreview-body]')?.textContent.includes(text), marker), `${format} rendered`);
    await wait(async () => (await historyEntries()).some(entry => entry.sessionId === sessionId && entry.title === name && entry.format === format), `${format} history registered`);
  }
  results.push('Markdown and TXT opened from the same conversation join their own format groups');
  await c.run(() => document.querySelector('button[aria-label="文档历史"]').click());
  await wait(() => c.run(() => !!document.querySelector('.qmr-history-row')), 'history rows');
  assert.equal(await c.run(() => /全部书籍|导入书籍|找书|正在阅读/.test(document.querySelector('.qmr-history').innerText)), false);
  const historyCount = await c.run(() => document.querySelectorAll('.qmr-history-row').length);
  assert.equal(historyCount, (await historyEntries()).length);
  await screenshot('p1-history-list.png');
  // Reload while the panel is open: return must work without an in-memory link.
  await c.call('Page.reload');
  await wait(() => c.run(() => !!document.querySelector('.qmr-history-row') || !!document.querySelector('[data-provider-id="qmr-smoke"]')), 'history reload');
  if (!await c.run(() => !!document.querySelector('.qmr-history'))) await c.run(() => document.querySelector('button[aria-label="文档历史"]').click());
  await wait(() => c.run(id => [...document.querySelectorAll('.qmr-history-row')].some(row => row.getAttribute('data-qmr-history-id') === id), remembered.id), 'persisted history row');
  const requestsBeforeReturn = (await turns()).length;
  await c.run(id => [...document.querySelectorAll('.qmr-history-row')].find(row => row.getAttribute('data-qmr-history-id') === id).click(), remembered.id);
  await wait(async () => await session() === sessionId && await c.run(() => !document.querySelector('.qmr-history')), 'history returns original session');
  await wait(() => c.run(address => document.querySelector('[data-textpreview-url]')?.getAttribute('data-textpreview-url') === address && !!document.querySelector('[data-pdf-page="2"]'), importedAddress), 'history returns original PDF');
  await wait(() => c.run(() => {
    const root = document.querySelector('[data-textpreview-url]');
    const port = root.querySelector('[data-document-zoom-scrollport]');
    const bounds = port.getBoundingClientRect();
    const page = root.querySelector('[data-pdf-page="2"]').getBoundingClientRect();
    return Math.min(page.bottom, bounds.bottom) - Math.max(page.top, bounds.top) > bounds.height / 2;
  }), 'restored PDF page 2');
  await wait(() => c.run(key => {
    const row = [...document.querySelectorAll('[data-chat-node-key]')].find(element => element.getAttribute('data-chat-node-key') === key);
    const port = document.querySelector('[data-conversation-scroll]');
    if (!row || !port) return false;
    const rect = row.getBoundingClientRect(), bounds = port.getBoundingClientRect();
    return rect.top < bounds.bottom && rect.bottom > bounds.top;
  }, remembered.nodeKey), 'original chat message visible');
  assert.equal((await turns()).length, requestsBeforeReturn, 'History navigation must not call the model');
  results.push('History groups only opened files; reload returns the same session, PDF page and chat message without a request');
  await screenshot('p1-history-return.png');
  const alternate = (await historyEntries()).find(entry => entry.sessionId !== sessionId && entry.nodeKey);
  if (alternate) {
    const requestsBeforeSwitch = (await turns()).length;
    const draftMarker = `KEEP THIS DRAFT ${Date.now()}`;
    await c.run(() => document.querySelector('[contenteditable="true"]').focus());
    await c.call('Input.insertText', { text: draftMarker });
    await new Promise(resolve => setTimeout(resolve, 200));
    const reopen = async entry => {
      await c.run(() => document.querySelector('button[aria-label="文档历史"]').click());
      await wait(() => c.run(id => [...document.querySelectorAll('.qmr-history-row')].some(row => row.getAttribute('data-qmr-history-id') === id), entry.id), 'cross-session history row');
      await c.run(id => [...document.querySelectorAll('.qmr-history-row')].find(row => row.getAttribute('data-qmr-history-id') === id).click(), entry.id);
      await wait(async () => await session() === entry.sessionId && await c.run(() => !document.querySelector('.qmr-history')), 'cross-session navigation');
      await wait(() => c.run(address => document.querySelector('[data-textpreview-url]')?.getAttribute('data-textpreview-url') === address, sessionFileAddress(entry.sessionId, entry.filePath)), 'cross-session document');
    };
    await reopen(alternate);
    assert.notEqual(await c.run(() => document.querySelector('[contenteditable="true"]').innerText.trim()), draftMarker);
    await reopen(remembered);
    await wait(() => c.run(marker => document.querySelector('[contenteditable="true"]').innerText.trim() === marker, draftMarker), 'original draft preserved after return');
    assert.equal((await turns()).length, requestsBeforeSwitch);
    await clearComposer();
    results.push('Existing histories return between two different sessions without requests and preserve the original draft');
  } else skipped.push('Cross-session browser return needs a second synthetic conversation with document history');

  // Unlike PDF reads, paste writes real files: require this Session's actual cwd
  // to be the project-local test workspace before invoking the save operation.
  const projection = JSON.parse(await readFile(path.join(root, 'dsh-home/storages/session_projcache/sessions', `${sessionId}.json`), 'utf8'));
  const workspace = await realpath(path.join(root, 'workspace'));
  assert.equal(await realpath(projection.record.identity.cwd), workspace, 'Select release/dev/workspace in native DSH before testing pasted documents');
  const pasteDirectory = path.join(workspace, '粘贴文档');
  const listPastes = async () => { try { return await readdir(pasteDirectory); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } };
  const edit = async (selector, value) => {
    await c.run(selector => { const input = document.querySelector(selector); input.focus(); input.select(); }, selector);
    await c.call('Input.insertText', { text: value });
  };
  const beginPaste = async () => { await click('打开原文'); await click('粘贴文字', '.qmr-doc-picker'); };
  const savePaste = async (text, name, format) => {
    await beginPaste(); await edit('[data-qmr-paste-text]', text);
    if (name) await edit('[data-qmr-paste-name]', name);
    if (format) await c.run(value => { const select = document.querySelector('[data-qmr-paste-format]'); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }, format);
    await new Promise(resolve => setTimeout(resolve, 150));
    const autoName = await c.run(() => document.querySelector('[data-qmr-paste-name]').value);
    await c.run(() => { const button = [...document.querySelectorAll('.qmr-doc-paste button')].find(e => e.innerText === '保存并打开'); button.click(); button.click(); });
    await wait(() => c.run(() => !document.querySelector('.qmr-doc-picker') || !!document.querySelector('.qmr-doc-picker [role="alert"]')), 'paste save result');
    assert.ok(!await c.run(() => document.querySelector('.qmr-doc-picker [role="alert"]')?.textContent), 'Paste saved and opened');
    await wait(() => c.run(marker => document.querySelector('[data-textpreview-body]')?.textContent.includes(marker), text.split('\n').find(line => line.trim()).replace(/^# /, '')), 'pasted text rendered');
    const address = await c.run(() => document.querySelector('[data-textpreview-url]').getAttribute('data-textpreview-url'));
    const filePath = decodeURIComponent(new URL(address).pathname).split('/').slice(3).join('/');
    assert.equal(path.dirname(filePath), pasteDirectory.replaceAll('\\', '/'));
    assert.equal(await readFile(filePath, 'utf8'), text);
    await wait(async () => (await historyEntries()).some(entry => entry.sessionId === sessionId && entry.filePath.replaceAll('\\', '/') === filePath), 'pasted file history');
    return { filePath, address, autoName };
  };
  const beforePastes = (await turns()).length;
  const draftMarker = `KEEP THIS DRAFT PASTE ${Date.now()}`;
  await c.run(() => document.querySelector('[contenteditable="true"]').focus());
  await c.call('Input.insertText', { text: draftMarker });
  const txt = 'QMR 粘贴测试原文\n\nKeep this pasted text exactly.\n  包含中文和缩进。\n';
  const countBefore = (await listPastes()).length;
  const savedTxt = await savePaste(txt);
  assert.match(path.basename(savedTxt.filePath), /^QMR 粘贴测试原文_\d{8}-\d{6}\.txt$/);
  assert.equal((await listPastes()).length, countBefore + 1, 'Repeated click creates one file');
  assert.equal(await c.run(() => document.querySelector('[contenteditable="true"]').innerText.trim()), draftMarker);
  assert.equal((await turns()).length, beforePastes);
  assert.equal(await session(), sessionId);
  results.push('Pasted text defaults to TXT in the real Session workspace; auto name, exact UTF-8, double-click and chat draft preserved');

  const mdName = `QMR-粘贴测试-${Date.now()}`;
  const md = '# QMR pasted Markdown\n\nA pasted passage can be translated in this conversation.\n\n- 第一项\n- 第二项\n';
  const savedMd = await savePaste(md, mdName, 'md');
  assert.equal(path.basename(savedMd.filePath), `${mdName}.md`);
  assert.ok(await c.run(() => !!document.querySelector('[data-document-markdown] h1')));
  const savedSecondMd = await savePaste(`${md}\nSecond saved document.`, mdName, 'md');
  assert.equal(path.basename(savedSecondMd.filePath), `${mdName}_2.md`);
  assert.equal(await readFile(savedMd.filePath, 'utf8'), md, 'Same name never overwrites the first document');
  assert.equal((await turns()).length, beforePastes);
  assert.equal(await c.run(() => document.querySelector('[contenteditable="true"]').innerText.trim()), draftMarker);
  results.push('Custom Markdown name renders headings; duplicate names receive a suffix without overwriting or sending messages');
  await screenshot('p1-paste-markdown.png');
  await clearComposer();
  await c.run(() => {
    const paragraph = [...document.querySelectorAll('[data-document-markdown] p')].find(e => e.textContent === 'A pasted passage can be translated in this conversation.');
    paragraph.scrollIntoView({ block: 'center' });
    const range = document.createRange(); range.selectNodeContents(paragraph);
    const selected = getSelection(); selected.removeAllRanges(); selected.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    paragraph.closest('[data-textpreview-body]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await wait(() => c.run(() => !!document.querySelector('.qmr-doc-menu')), 'pasted Markdown selection');
  await click('翻译', '.qmr-doc-menu');
  await wait(async () => (await turns()).length > beforePastes, 'pasted translation request');
  await wait(() => c.run(() => !!document.querySelector('button[aria-label="发送消息"]') && !document.querySelector('[contenteditable="true"]').innerText.trim()), 'pasted translation finished');
  const pasteRequests = (await turns()).slice(beforePastes);
  assert.equal(pasteRequests.length, 1);
  assert.ok(pasteRequests[0].userTexts.some(text => text.includes(`来源：${mdName}_2.md`) && text.includes('A pasted passage can be translated in this conversation.')));
  assert.equal(await session(), sessionId);
  await c.call('Page.reload');
  await wait(() => c.run(() => !!document.querySelector('[data-provider-id="qmr-smoke"]')), 'pasted conversation reload');
  await click('打开原文');
  await wait(() => c.run(name => [...document.querySelectorAll('.qmr-doc-file')].some(button => button.innerText === name), `${mdName}_2.md`), 'pasted file persists in current conversation list');
  await click(`${mdName}_2.md`, '.qmr-doc-picker');
  await wait(() => c.run(address => document.querySelector('[data-textpreview-url]')?.getAttribute('data-textpreview-url') === address, savedSecondMd.address), 'reopen exact pasted file');
  assert.equal((await turns()).length, beforePastes + 1);
  results.push('Pasted Markdown translates the selected quote in the same chat and reopens from its file list after reload');
  assert.equal(c.errors.length, 0, 'No runtime exceptions during document actions');
  const browser = await c.call('Browser.getVersion');
  await writeFile(path.join(reports, 'p1-browser-smoke.json'), JSON.stringify({ date: new Date().toISOString(), candidateHash, browser: browser.product, sessionId, results, skipped, startupExceptions, actionExceptions: c.errors, model: 'qmr-smoke deterministic fixture; no AI quality claim' }, null, 2));
  console.log(JSON.stringify({ passed: results, skipped, startupExceptions: startupExceptions.map(error => error.split('\n')[0]), actionExceptions: c.errors.length }, null, 2));
} catch (error) {
  await writeFile(path.join(reports, 'p1-browser-smoke-failure.json'), JSON.stringify({ date: new Date().toISOString(), candidateHash, passed: results, failure: error.message, startupExceptions, actionExceptions: c.errors }, null, 2));
  throw error;
} finally { c.close(); }
