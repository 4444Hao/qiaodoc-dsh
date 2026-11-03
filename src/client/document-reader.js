import * as React from 'react';
import { createDocumentTasks, conversationFiles, sessionFileAddress } from '../core/document-task.js';
import { DocumentHistoryTracker } from './document-history.js';
import { suggestedPasteName, MAX_PASTED_DOCUMENT_BYTES } from '../core/pasted-document.js';
import { QiaoDocMark } from './brand.js';
import { DOCUMENT_STYLES } from './document-styles.js';

const h = React.createElement;
export const DOCUMENT_MESSAGES = {
  zh: {
    'document.open': '打开原文', 'document.local': '打开本地文档', 'document.path': '工作区文件路径',
    'document.files': '当前对话中的文档', 'document.explain': '解释', 'document.translate': '翻译',
    'document.copy': '复制', 'document.ask': '询问 AI', 'document.close': '关闭',
    'document.empty': '暂无文档，可打开本地文件或粘贴文字。', 'document.opening': '正在打开…',
    'document.inserted': '引用已加入当前输入框，请补充问题。', 'document.submitted': '已提交到当前对话。',
    'document.copied': '已复制。', 'document.error.stale': '文档或会话已切换，请重新选择原文。',
    'document.error.busy': '对话正在处理，请稍后重试。', 'document.error.draft': '输入框已有草稿，请先处理后再使用快捷提问。',
    'document.error.attachments': '输入框有附件或引用，请先处理，原内容已保留。',
    'document.error.draftChanged': '输入框内容发生变化，请检查草稿后手动发送。',
    'document.error.empty': '请先选择原文。', 'document.error.tooLong': '选段过长，请缩小范围。',
    'document.error.unavailable': '当前对话的阅读服务尚未就绪。',
    'document.paste': '粘贴文字', 'document.content': '文字内容', 'document.name': '文件名（不含扩展名）',
    'document.format': '格式', 'document.saveOpen': '保存并打开', 'document.saving': '正在保存…',
    'document.pasteHelp': '保存到当前对话工作区的“粘贴文档”文件夹；不发送消息。',
    'document.pasteLarge': '粘贴内容不能超过 2 MiB。', 'document.savedAt': '文件已保存到：',
  },
  en: {
    'document.open': 'Open document', 'document.local': 'Open local document', 'document.path': 'Workspace file path',
    'document.files': 'Documents in this conversation', 'document.explain': 'Explain', 'document.translate': 'Translate',
    'document.copy': 'Copy', 'document.ask': 'Ask AI', 'document.close': 'Close',
    'document.empty': 'No documents yet. Open a local file or paste text.', 'document.opening': 'Opening…',
    'document.inserted': 'Quote inserted into the current composer. Add your question.', 'document.submitted': 'Submitted to the current conversation.',
    'document.copied': 'Copied.', 'document.error.stale': 'The document or conversation changed. Select the text again.',
    'document.error.busy': 'The conversation is busy. Try again later.', 'document.error.draft': 'Handle the existing draft before using a quick question.',
    'document.error.attachments': 'Handle the attachments or references in the composer first. They were preserved.',
    'document.error.draftChanged': 'The composer changed. Review the draft and send manually.',
    'document.error.empty': 'Select some document text first.', 'document.error.tooLong': 'Select a shorter passage.',
    'document.error.unavailable': 'Document actions are not ready for this conversation.',
    'document.paste': 'Paste text', 'document.content': 'Text content', 'document.name': 'File name (without extension)',
    'document.format': 'Format', 'document.saveOpen': 'Save and open', 'document.saving': 'Saving…',
    'document.pasteHelp': 'Save in the current conversation workspace’s 粘贴文档 folder; no message is sent.',
    'document.pasteLarge': 'Pasted text must not exceed 2 MiB.', 'document.savedAt': 'File saved at: ',
  },
};



function SelectionActions({ sessionId, absolutePath, documentTitle, getBinding, captureTarget, targetCurrent, history, t }) {
  const anchor = React.useRef(null);
  const menu = React.useRef(null);
  const current = React.useRef(null);
  const [selection, setSelection] = React.useState(null);
  const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!selection || !menu.current) return undefined;
    const place = () => {
      const element = menu.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.max(8, Math.min(selection.x, window.innerWidth - rect.width - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(selection.y, window.innerHeight - rect.height - 8))}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [selection]);
  const actionPending = React.useRef(false);
  const task = React.useMemo(() => createDocumentTasks(getBinding, (picked) => {
    const root = anchor.current?.closest('[data-textpreview-url]');
    return current.current === picked && root?.getAttribute('data-textpreview-url') === picked.address
      && root.getClientRects().length > 0 && targetCurrent(picked.target);
  }), [getBinding, targetCurrent]);
  React.useEffect(() => {
    current.current = null; setSelection(null); setNotice('');
    const root = anchor.current?.closest('[data-textpreview-url]');
    const body = root?.querySelector('[data-textpreview-body]');
    if (!body) return undefined;
    let disposed = false;
    const read = () => {
      // Native composer insertion can move the browser selection itself.
      if (disposed || actionPending.current) return;
      const selected = root.ownerDocument.getSelection();
      if (!selected || selected.isCollapsed || !selected.rangeCount) { current.current = null; setSelection(null); return; }
      const range = selected.getRangeAt(0);
      if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) { current.current = null; setSelection(null); return; }
      const text = selected.toString().trim();
      if (!text) return;
      const element = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const target = captureTarget(element);
      if (!target || target.sessionId !== sessionId) return;
      const rect = range.getBoundingClientRect();
      const firstPage = element.closest('[data-pdf-page]')?.getAttribute('data-pdf-page');
      const picked = { text, sessionId, target, page: firstPage ? Number(firstPage) : undefined,
        title: documentTitle(absolutePath), address: root.getAttribute('data-textpreview-url'),
        x: Math.max(8, rect.left),
        y: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 60)) };
      current.current = picked; setSelection(picked); setNotice('');
    };
    const clear = () => { current.current = null; setSelection(null); };
    root.ownerDocument.addEventListener('selectionchange', read);
    body.addEventListener('pointerup', read);
    body.addEventListener('scroll', clear, true);
    const escape = (event) => { if (event.key === 'Escape') clear(); };
    root.ownerDocument.addEventListener('keydown', escape);
    return () => { disposed = true; current.current = null; root.ownerDocument.removeEventListener('selectionchange', read); body.removeEventListener('pointerup', read); body.removeEventListener('scroll', clear, true); root.ownerDocument.removeEventListener('keydown', escape); };
  }, [sessionId, absolutePath, captureTarget]);
  const perform = async (action) => {
    const picked = current.current;
    if (!picked) return;
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    try {
      if (action === 'copy') { await navigator.clipboard.writeText(picked.text); setNotice(t('document.copied')); }
      else {
        let afterSeq = -1;
        try { afterSeq = history.lastSeq(sessionId); } catch { /* History must not block the existing action. */ }
        const result = await task(action, picked); setNotice(t(`document.${result.status}`));
        try { history.noteInteraction(sessionId, absolutePath, documentTitle(absolutePath), picked, afterSeq); }
        catch (error) { console.warn('[文档历史] 消息位置记录失败', error); }
      }
    } catch (error) { setNotice(error.code ? t(`document.error.${error.code}`) : error.message); }
    finally { actionPending.current = false; setBusy(false); }
  };
  return h('span', { ref: anchor, 'data-qmr-document-actions': true },
    selection ? h('div', { ref: menu, className: 'qmr-doc-menu', role: 'toolbar', 'aria-label': t('document.ask'), style: { left: selection.x, top: selection.y }, onMouseDown: (event) => event.preventDefault() },
      h('span', { className: 'qmr-doc-brand', 'aria-hidden': true }, h(QiaoDocMark, { size: 28 })),
      ...['explain', 'translate', 'copy', 'ask'].map((action) => h('button', { key: action, className: `qmr-doc-button qmr-doc-action-${action}`, disabled: busy, onClick: () => void perform(action) }, t(`document.${action}`)))) : null,
    notice ? h('div', { className: 'qmr-doc-notice', role: 'status', onClick: () => setNotice('') }, notice) : null);
}

function DocumentLauncher({ sessionId, useChat, openFile, openAttachment, savePaste, history, t }) {
  const chat = useChat((state) => state);
  const files = React.useMemo(() => conversationFiles(chat), [chat]);
  const historyState = React.useSyncExternalStore(history.subscribe, history.getSnapshot);
  const openedFiles = historyState.entries.filter(entry => entry.sessionId === sessionId);
  const [opened, setOpened] = React.useState(false);
  const [path, setPath] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pasting, setPasting] = React.useState(false);
  const [text, setText] = React.useState('');
  const [name, setName] = React.useState('');
  const [format, setFormat] = React.useState('txt');
  const nameEdited = React.useRef(false);
  const pending = React.useRef(false);
  const savedPaste = React.useRef(null);
  const picker = React.useRef(null);
  React.useEffect(() => {
    setOpened(false); setPasting(false); setPath(''); setText(''); setName(''); setFormat('txt'); setError('');
    nameEdited.current = false; savedPaste.current = null;
  }, [sessionId]);
  const run = async (operation) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { await operation(); setOpened(false); } catch (cause) { setError(cause.message); } finally { pending.current = false; setBusy(false); }
  };
  const create = () => run(async () => {
    if (new TextEncoder().encode(text).byteLength > MAX_PASTED_DOCUMENT_BYTES) throw new Error(t('document.pasteLarge'));
    const key = JSON.stringify([sessionId, text, name, format]);
    const saved = savedPaste.current?.key === key ? savedPaste.current.value : await savePaste(sessionId, { text, name, format });
    savedPaste.current = { key, value: saved };
    try { openFile(sessionId, saved.filePath); }
    catch (cause) { throw new Error(`${t('document.savedAt')}${saved.filePath}\n${cause.message}`); }
    setText(''); setName(''); setFormat('txt'); setPasting(false); nameEdited.current = false; savedPaste.current = null;
  });
  return h(React.Fragment, null,
    h('button', { className: 'qmr-doc-button qmr-doc-trigger', 'aria-expanded': opened, onClick: () => setOpened(!opened) }, h(QiaoDocMark, { size: 18 }), t('document.open')),
    opened ? h('section', { className: 'qmr-doc-picker', role: 'dialog', 'aria-label': t('document.open') },
      h('header', { className: 'qmr-doc-picker-heading' },
        h(QiaoDocMark, { size: 22 }), h('strong', null, t('document.open')),
        h('button', { className: 'qmr-doc-button qmr-doc-close', onClick: () => setOpened(false) }, t('document.close'))),
      h('div', { className: 'qmr-doc-picker-actions' },
        h('button', { className: 'qmr-doc-button qmr-doc-local', disabled: busy, onClick: () => picker.current?.click() }, t('document.local')),
        h('button', { className: 'qmr-doc-button qmr-doc-paste-toggle', disabled: busy, 'aria-expanded': pasting, onClick: () => setPasting(!pasting) }, t('document.paste'))),
      files.length || openedFiles.length ? h('div', { className: 'qmr-doc-files' },
        h('small', null, t('document.files')),
        ...files.map((file) => h('button', { key: file.attachmentId, className: 'qmr-doc-button qmr-doc-file', disabled: busy, onClick: () => void run(() => openAttachment(sessionId, file)) }, file.name)),
        ...openedFiles.map(file => h('button', { key: file.id, className: 'qmr-doc-button qmr-doc-file', title: file.filePath, disabled: busy, onClick: () => void run(() => openFile(sessionId, file.filePath)) }, file.title)))
        : h('p', { className: 'qmr-doc-empty' }, t('document.empty')),
      pasting ? h('div', { className: 'qmr-doc-paste' },
        h('small', null, t('document.pasteHelp')),
        h('label', null, t('document.content'), h('textarea', { 'data-qmr-paste-text': true, value: text, disabled: busy, onChange: event => { const value = event.target.value; setText(value); if (!nameEdited.current) setName(suggestedPasteName(value)); } })),
        h('label', null, t('document.name'), h('input', { type: 'text', 'data-qmr-paste-name': true, value: name, disabled: busy, onChange: event => { nameEdited.current = true; setName(event.target.value); } })),
        h('label', null, t('document.format'), h('select', { 'data-qmr-paste-format': true, value: format, disabled: busy, onChange: event => setFormat(event.target.value) }, h('option', { value: 'txt' }, 'TXT (.txt)'), h('option', { value: 'md' }, 'Markdown (.md)'))),
        name ? h('small', { style: { overflowWrap: 'anywhere' } }, `${name}.${format}`) : null,
        h('button', { className: 'qmr-doc-button qmr-doc-save', disabled: busy || !text.trim() || !name.trim(), onClick: () => void create() }, busy ? t('document.saving') : t('document.saveOpen'))) : null,
      h('div', { className: 'qmr-doc-path' },
        h('label', null, t('document.path'), h('input', { type: 'text', value: path, onChange: (event) => setPath(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter' && path.trim()) void run(() => openFile(sessionId, path.trim())); } })),
        h('button', { className: 'qmr-doc-button', disabled: busy || !path.trim(), onClick: () => void run(() => openFile(sessionId, path.trim())) }, busy ? t('document.opening') : t('document.open'))),
      h('input', { ref: picker, type: 'file', accept: '.pdf,.txt,.md,.markdown,.html,.htm', hidden: true, onChange: (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => openAttachment(sessionId, null, file)); } }),
      error ? h('div', { role: 'alert' }, error) : null) : null);
}

export function installDocumentReader(ctx, data, history) {
  ctx.inject(['uiSession', 'sidebarRight', 'sessions'], (scope) => {
    const documentTitle = (absolutePath) => {
      const normalized = absolutePath.replace(/\\/g, '/');
      const book = data.getLibrary().books.find(entry => entry.file && normalized.endsWith(`/${entry.file}`));
      return book ? `${book.title}.${book.format}` : normalized.split('/').pop();
    };
    const getBinding = () => {
      const value = scope.uiSession.adapter.current.value;
      if (!value?.props || !value.hooks) return {};
      const sessionId = scope.sidebarRight.mounted.getSnapshot();
      return { sessionId: value.props.sessionId === sessionId ? sessionId : undefined,
        input: value.hooks.input, actions: value.props.inputActions,
        // activeTargets means activated conversation views, not an in-flight turn.
        running: value.hooks.session?.getSnapshot().running === true };
    };
    const current = (sessionId) => { if (!sessionId || getBinding().sessionId !== sessionId) throw new Error('请先回到原来的会话，再打开文档。'); };
    const openFile = (sessionId, filePath) => { current(sessionId); scope.sidebarRight.openResource(sessionFileAddress(sessionId, filePath)); };
    const savePaste = (sessionId, request) => {
      current(sessionId);
      return data.getHost().createPastedDocument({ ...request, sessionId });
    };
    const openAttachment = async (sessionId, attachment, localFile) => {
      current(sessionId);
      const imported = localFile ? await data.importBook(localFile)
        : await data.getHost().importSessionDocument({ sessionId, attachmentId: attachment.attachmentId });
      if ((localFile && !imported.ok) || imported.hostError || !imported.book?.file) throw new Error(imported.error || imported.hostError || '文档尚未保存到宿主。');
      current(sessionId);
      await data.refreshLibrary();
      const info = await data.getHost().info();
      current(sessionId);
      openFile(sessionId, `${info.root}/${imported.book.file}`);
    };
    scope.effect(() => {
      if (typeof document === 'undefined') return undefined;
      const style = document.createElement('style'); style.textContent = DOCUMENT_STYLES; document.head.appendChild(style);
      return () => style.remove();
    }, 'qiaodoc-dsh: document action styles');
    scope.effect(() => scope.slots.inject('sidebar.right.tab.document.actions', () => scope.slots.register({
      name: 'sidebar.right.tab.document.actions', id: 'qiaodoc-dsh.selection', locale: 'qiaodoc-dsh',
      inject: () => ({ documentTitle, getBinding, history, captureTarget: (element) => scope.sidebarRight.commandTarget(element), targetCurrent: (target) => scope.sidebarRight.isTargetCurrent(target) }),
    }, props => h(React.Fragment, null, h(SelectionActions, props), h(DocumentHistoryTracker, props)))), 'qiaodoc-dsh: native document selection');
    scope.effect(() => scope.slots.inject('conversation.session.header.utilities', () => scope.slots.register({
      name: 'conversation.session.header.utilities', id: 'qiaodoc-dsh.open-document', locale: 'qiaodoc-dsh',
      inject: () => ({ openFile, openAttachment, savePaste, history }),
    }, DocumentLauncher)), 'qiaodoc-dsh: conversation document entry');
    scope.effect(() => scope.slots.inject('conversation.hero.options', () => scope.slots.register({
      name: 'conversation.hero.options', id: 'qiaodoc-dsh.open-document-hero', locale: 'qiaodoc-dsh',
      inject: () => ({ openFile, openAttachment, savePaste, history }),
    }, (props) => props.sessionId ? h(DocumentLauncher, props) : null)), 'qiaodoc-dsh: blank conversation document entry');
  });
}
