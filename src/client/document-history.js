import * as React from 'react';
import { historyKey, historyFormat } from '../core/document-history.js';
import { sessionFileAddress } from '../core/document-task.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function createDocumentHistory(data) {
  let scope;
  let state = { entries: [], error: '', ready: false, notice: '' };
  let writes = Promise.resolve();
  let navigation = 0;
  let revision = 0;
  const listeners = new Set();
  const mounted = new Map();
  const restores = new Map();
  const pendingMessages = new Map();
  const emit = patch => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
  const active = id => scope?.sidebarRight.mounted.getSnapshot() === id
    && scope.uiSession.adapter.current.value?.props.sessionId === id;
  const host = () => { const api = data.getHost(); if (!api) throw new Error('文档历史服务尚未连接'); return api; };
  const save = request => {
    revision++;
    const result = writes.catch(() => {}).then(async () => {
      const result = await host().recordDocumentHistory(request);
      emit({ entries: result.entries, error: '' }); return result;
    });
    writes = result;
    return result.catch(error => { emit({ error: error.message }); throw error; });
  };
  const sourceReady = address => new Promise((resolve, reject) => {
    const source = scope.resources.source(address);
    let stop = () => {};
    const timer = setTimeout(() => { stop(); reject(new Error('文件读取超时')); }, 8000);
    const read = () => {
      const value = source.getSnapshot();
      if (!['live', 'failed', 'none'].includes(value.status)) return;
      clearTimeout(timer); stop();
      if (value.status === 'live') resolve(value.value);
      else reject(new Error(value.failure?.message || '文件已失效或无法读取'));
    };
    stop = source.subscribe(read); read();
  });
  const positionOf = root => {
    const port = root.querySelector('[data-document-zoom-scrollport], [data-code-preview] [data-code-block-content]') || root.querySelector('[data-textpreview-body]');
    if (!port) return {};
    const bounds = port.getBoundingClientRect();
    const top = bounds.top;
    const pages = [...root.querySelectorAll('[data-pdf-page]')];
    const visibleHeight = element => { const rect = element.getBoundingClientRect(); return Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, top)); };
    const page = pages.sort((a, b) => visibleHeight(b) - visibleHeight(a))[0];
    if (page) {
      const rect = page.getBoundingClientRect();
      return { page: Number(page.dataset.pdfPage), offset: Math.min(1, Math.max(-1, (top - rect.top) / Math.max(1, rect.height))) };
    }
    return { ratio: Math.min(1, Math.max(0, port.scrollTop / Math.max(1, port.scrollHeight - port.clientHeight))) };
  };
  const restorePosition = (root, position) => {
    const port = root.querySelector('[data-document-zoom-scrollport], [data-code-preview] [data-code-block-content]') || root.querySelector('[data-textpreview-body]');
    if (!port || !position) return;
    if (position.page) {
      const page = [...root.querySelectorAll('[data-pdf-page]')].find(element => Number(element.dataset.pdfPage) === position.page);
      if (page) { const rect = page.getBoundingClientRect(); port.scrollTop += rect.top - port.getBoundingClientRect().top + (position.offset || 0) * rect.height; }
    } else port.scrollTop = (position.ratio || 0) * Math.max(0, port.scrollHeight - port.clientHeight);
  };
  const api = {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    bind(value) {
      scope = value; emit({ ready: true });
      const stopList = scope.sessions.list.subscribe(() => emit({}));
      return () => { stopList(); scope = undefined; navigation++; for (const stop of pendingMessages.values()) stop(); pendingMessages.clear(); emit({ ready: false }); };
    },
    async load() {
      try { await writes.catch(() => {}); const requested = revision; const result = await host().documentHistory(); if (requested === revision) emit({ entries: result.entries, error: '' }); for (const view of mounted.values()) void view.ensure(); }
      catch (error) { emit({ error: error.message }); }
    },
    lastSeq(sessionId) {
      if (!active(sessionId)) return -1;
      return Math.max(-1, ...[...scope.uiSession.adapter.current.value.hooks.chat.getSnapshot().nodes.values()].map(node => node.anchorSeq || 0));
    },
    noteInteraction(sessionId, filePath, title, picked, afterSeq) {
      if (!active(sessionId)) return;
      const key = historyKey(sessionId, filePath);
      pendingMessages.get(key)?.();
      const source = scope.uiSession.adapter.current.value.hooks.chat;
      let stop = () => {};
      const dispose = () => { clearTimeout(timer); stop(); pendingMessages.delete(key); };
      const timer = setTimeout(dispose, 10 * 60 * 1000);
      const read = () => {
        const node = [...source.getSnapshot().nodes.values()].filter(node => ['user', 'steering'].includes(node.kind) && node.anchorSeq > afterSeq)
          .filter(node => { const text = (node.data.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n'); return text.includes(picked.text) && text.includes(`来源：${picked.title}`); })
          .sort((a, b) => b.anchorSeq - a.anchorSeq)[0];
        if (!node) return;
        dispose();
        void save({ sessionId, filePath, title, interacted: true, nodeKey: node.key, anchorSeq: node.anchorSeq,
          ...(node.location?.turn?.turn ? { turn: node.location.turn.turn } : {}) }).catch(() => {});
      };
      stop = source.subscribe(read); pendingMessages.set(key, dispose); read();
    },
    observe(root, document) {
      const key = historyKey(document.sessionId, document.filePath);
      let recorded = false;
      let disposed = false;
      let saving = false;
      let lastPosition;
      let restoring = false;
      let restorePromise;
      let restoreGeneration = 0;
      let timer;
      const visible = () => !disposed && active(document.sessionId) && root.getClientRects().length > 0;
      const body = root.querySelector('[data-textpreview-body]');
      const success = () => visible() && !root.querySelector('[data-textpreview-failed], [data-textpreview-meta-failed], [role="alert"]')
        && !!body?.querySelector('[data-pdf-preview], [data-textpreview-line], [data-document-markdown], [data-html-preview], [data-code-preview]');
      const ensure = async () => {
        if (!success() || saving) return;
        saving = true;
        try {
          if (!recorded) {
            await sourceReady(root.getAttribute('data-textpreview-url'));
            if (!visible()) return;
            const restore = restores.get(key);
            if (restore) await view.restore(restore);
            if (!visible()) return;
            const initialPosition = lastPosition = positionOf(root);
            await save({ ...document, opened: true, position: initialPosition });
            recorded = true;
            // The first write crosses the Host boundary. Keep scrolling that
            // happened while it was in flight, including a just-detached view.
            if (visible()) lastPosition = positionOf(root);
            if (lastPosition && JSON.stringify(lastPosition) !== JSON.stringify(initialPosition)) {
              await save({ ...document, position: lastPosition });
            }
          }
        } catch (error) { emit({ error: error.message }); }
        finally { saving = false; }
      };
      const scroll = () => {
        if (!visible() || restoring) return;
        lastPosition = positionOf(root);
        if (!recorded) return;
        clearTimeout(timer);
        timer = setTimeout(() => { if (visible()) void save({ ...document, position: lastPosition }).catch(() => {}); }, 450);
      };
      const restore = position => {
        if (!position || !success()) return;
        if (restoring) return restorePromise;
        restoring = true;
        const generation = ++restoreGeneration;
        restorePromise = (async () => {
          // PDF canvas/page sizes and the native scroll restore settle after mount.
          // Reapply briefly, but a real pointer/wheel action always wins.
          for (let i = 0; i < 10 && visible() && generation === restoreGeneration; i++) {
            restorePosition(root, position);
            await pause(100);
          }
          if (visible()) lastPosition = positionOf(root);
          restores.delete(key);
          restoring = false;
          if (recorded && lastPosition && !disposed) void save({ ...document, position: lastPosition }).catch(() => {});
        })();
        return restorePromise;
      };
      const cancelRestore = () => { restoreGeneration++; };
      const view = { restore, ensure };
      mounted.set(key, view);
      const observer = new MutationObserver(() => void ensure());
      if (body) { observer.observe(body, { childList: true, subtree: true }); body.addEventListener('scroll', scroll, true); body.addEventListener('wheel', cancelRestore, { passive: true }); body.addEventListener('pointerdown', cancelRestore); }
      void ensure();
      return () => {
        clearTimeout(timer); observer.disconnect(); body?.removeEventListener('scroll', scroll, true);
        body?.removeEventListener('wheel', cancelRestore); body?.removeEventListener('pointerdown', cancelRestore); restoreGeneration++;
        if (recorded && lastPosition) void save({ ...document, position: lastPosition }).catch(() => {});
        disposed = true; if (mounted.get(key) === view) mounted.delete(key);
      };
    },
    sessionTitle(id) { const item = scope?.sessions.list.getSnapshot().byId[id]; return item?.title || item?.name; },
    sessionExists(id) { const list = scope?.sessions.list.getSnapshot(); return list?.phase !== 'ready' || !!list.byId[id]; },
    async open(entry) {
      if (!scope) throw new Error('会话导航服务尚未就绪');
      const sessionList = scope.sessions.list.getSnapshot();
      if (sessionList.phase !== 'ready') throw new Error('会话列表尚未就绪，请稍后再试');
      const summary = sessionList.byId[entry.sessionId];
      if (!summary) throw new Error('原会话已不存在，无法返回');
      if (scope.uiWorkspace.workspaces.list.getSnapshot().archivedSessionIds?.includes(entry.sessionId)) throw new Error('原会话已归档，请先在 DSH 中取消归档');
      emit({ notice: '' });
      const ticket = ++navigation;
      const address = sessionFileAddress(entry.sessionId, entry.filePath);
      await sourceReady(address);
      if (ticket !== navigation) return;
      const previous = scope.sidebarRight.mounted.getSnapshot();
      scope.uiWorkspace.openSession(entry.sessionId);
      for (let i = 0; i < 80 && !active(entry.sessionId); i++) {
        const current = scope.sidebarRight.mounted.getSnapshot();
        if (ticket !== navigation || (current && current !== previous && current !== entry.sessionId)) throw new Error('会话已切换，已取消恢复');
        await pause(100);
      }
      if (!active(entry.sessionId)) throw new Error('原会话未能打开');
      if (entry.position) restores.set(entry.id, entry.position);
      // mounted names the selected Session before React has adopted its store.
      // Retry only the documented pre-adoption refusal, which has no side effects.
      let opened = false;
      for (let i = 0; i < 80; i++) {
        if (ticket !== navigation || !active(entry.sessionId)) return;
        try { scope.sidebarRight.openResource(address); opened = true; break; }
        catch (error) { if (!error.message.includes('no session surface is mounted')) throw error; }
        await pause(100);
      }
      if (!opened) throw new Error('原会话的文档面板尚未就绪');
      mounted.get(entry.id)?.restore(entry.position);
      if (entry.nodeKey) {
        if (Number.isFinite(entry.anchorSeq)) await scope.sessions.binding(entry.sessionId).session.loadThrough(entry.anchorSeq);
        for (let i = 0; i < 60; i++) {
          if (ticket !== navigation || !active(entry.sessionId)) return;
          const chat = [...document.querySelectorAll('[data-conversation-session]')].find(element => element.getAttribute('data-conversation-session') === entry.sessionId);
          const row = [...(chat?.querySelectorAll('[data-chat-node-key]') || [])].find(element => element.getAttribute('data-chat-node-key') === entry.nodeKey);
          if (row && row.getClientRects().length) { row.scrollIntoView({ block: 'center', behavior: 'instant' }); emit({ notice: '' }); return; }
          await pause(100);
        }
        emit({ notice: '已返回原会话和文档，原消息暂无法精确定位。' });
      }
    },
  };
  return api;
}

export function DocumentHistoryTracker({ sessionId, absolutePath, documentTitle, history }) {
  const anchor = React.useRef(null);
  const state = React.useSyncExternalStore(history.subscribe, history.getSnapshot);
  React.useEffect(() => {
    if (!state.ready || !historyFormat(absolutePath)) return undefined;
    const root = anchor.current?.closest('[data-textpreview-url]');
    if (!root) return undefined;
    return history.observe(root, { sessionId, filePath: absolutePath, title: documentTitle(absolutePath) });
  }, [state.ready, sessionId, absolutePath, history, documentTitle]);
  return React.createElement('span', { ref: anchor, 'data-qmr-history-tracker': true },
    state.notice ? React.createElement('div', { role: 'status', className: 'qmr-doc-notice' }, state.notice) : null);
}
