import * as React from 'react';
const h = React.createElement;
export const HISTORY_MESSAGES = {
  zh: { open: '文档历史', 'history.title': '文档历史', 'history.empty': '还没有文档历史',
    'history.help': '在对话中打开文件后，会在这里留下记录。', 'history.refresh': '刷新', 'history.close': '关闭',
    'history.return': '返回对话与原文', 'history.missing': '原会话已删除', 'history.opening': '正在返回…', 'history.untitled': '未命名对话' },
  en: { open: 'Document history', 'history.title': 'Document history', 'history.empty': 'No document history yet',
    'history.help': 'Files opened in a conversation will appear here.', 'history.refresh': 'Refresh', 'history.close': 'Close',
    'history.return': 'Return to conversation and document', 'history.missing': 'Original conversation was deleted', 'history.opening': 'Returning…', 'history.untitled': 'Untitled conversation' },
};
export function DocumentHistoryPanel({ history, close, t }) {
  const state = React.useSyncExternalStore(history.subscribe, history.getSnapshot);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  React.useEffect(() => { void history.load(); }, [history]);
  const groups = new Map();
  for (const entry of state.entries) {
    if (!groups.has(entry.format)) groups.set(entry.format, []);
    groups.get(entry.format).push(entry);
  }
  const open = async entry => {
    if (busy) return;
    setBusy(entry.id); setError('');
    try { await history.open(entry); } catch (cause) { setError(cause.message); } finally { setBusy(''); }
  };
  return h('section', { className: 'qmr-history', 'aria-label': t('history.title'), style: { boxSizing: 'border-box', height: '100%', overflowY: 'auto', padding: '28px 32px', color: 'var(--dsw-alias-label-primary)' } },
    h('style', null, '.qmr-history button{font:inherit;color:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;background:transparent;padding:8px 12px}.qmr-history button:hover{background:var(--dsw-alias-interactive-bg-hover,#8882)}.qmr-history button:disabled{opacity:.5;cursor:default}.qmr-history-row{width:100%;display:flex;align-items:center;gap:20px;text-align:left;margin:8px 0}.qmr-history-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qmr-history-row small{display:block;margin-top:6px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'),
    h('header', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 } },
      h('h2', { style: { margin: 0, flex: 1 } }, t('history.title')),
      h('button', { onClick: () => void history.load() }, t('history.refresh')),
      h('button', { onClick: close }, t('history.close'))),
    error || state.error ? h('p', { role: 'alert' }, error || state.error) : null,
    !groups.size ? h('div', null, h('p', null, t('history.empty')), h('p', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('history.help'))) : null,
    ...[...groups].map(([format, entries]) => h('section', { key: format, 'data-qmr-history-format': format, style: { marginBottom: 28 } },
      h('h3', { style: { fontSize: 14, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)' } }, format),
      ...entries.map(entry => h('button', { key: entry.id, className: 'qmr-history-row', 'data-qmr-history-id': entry.id,
        disabled: !!busy || !history.sessionExists(entry.sessionId), 'aria-label': `${t('history.return')} · ${entry.title}`, onClick: () => void open(entry) },
        h('span', { style: { flex: 1, minWidth: 0 } }, h('strong', null, entry.title),
          h('small', null, history.sessionExists(entry.sessionId) ? history.sessionTitle(entry.sessionId) || t('history.untitled') : t('history.missing'))),
        h('small', null, busy === entry.id ? t('history.opening') : new Date(entry.lastOpenedAt).toLocaleString()))))));
}
