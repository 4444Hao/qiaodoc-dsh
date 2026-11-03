/** Conversation documents plus a small history panel; no independent reader/chat. */
import * as React from 'react';
import { createDocumentData } from './bridge.js';
import { remoteHostApi } from './host-api.js';
import { installDocumentReader, DOCUMENT_MESSAGES } from './document-reader.js';
import { createDocumentHistory } from './document-history.js';
import { DocumentHistoryPanel, HISTORY_MESSAGES } from '../ui/document-history.js';
import { READER_REMOTE_METHODS } from '../core/reader-remotes.js';
import { QiaoDocMark } from './brand.js';

const ID = 'qiaodoc-dsh';
const remoteCodec = () => ({ mode: 'strict', typeSymbol: 'qiaodoc-dsh#json',
  create: () => ({ parse: value => value, safeParse: value => ({ success: true, data: value }) }) });
const REMOTE = {
  package: 'qiaodoc-dsh',
  descriptors: READER_REMOTE_METHODS.map(method => ({
    id: `qiaodoc-dsh#qiaoDoc/${method}`, service: 'qiaoDoc', namespace: 'qiaoDoc', method,
    invocation: { kind: 'direct' },
    parameters: ['info', 'library', 'speechVoices', 'documentHistory'].includes(method) ? [] : [{ name: 'request', wire: 'request', source: 'json', codec: remoteCodec() }],
    result: { mode: 'src-json' }, cancellation: { parameter: 'signal' },
  })),
};
export const inject = ['slots', 'layout', 'remote'];
export function apply(ctx) {
  const data = createDocumentData();
  const history = createDocumentHistory(data);
  let disposed = false;
  let translate = key => HISTORY_MESSAGES.zh[key] || key;
  ctx.effect(() => () => { disposed = true; }, 'qiaodoc-dsh: lifetime');
  installDocumentReader(ctx, data, history);
  ctx.inject(['uiWorkspace', 'uiSession', 'sidebarRight', 'sessions', 'resources'], scope => history.bind(scope));
  const close = () => ctx.layout.selectPanel(null);
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: ID, locale: ID, inject: () => ({ history, close }),
  }, DocumentHistoryPanel)), 'qiaodoc-dsh: document history');
  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: ID, order: 40, label: () => translate('open'),
  }, DocumentIcon)), 'qiaodoc-dsh: history entry');
  ctx.effect(() => {
    const keydown = event => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || !['R', 'r'].includes(event.key)) return;
      const tag = event.target?.tagName?.toLowerCase?.();
      if (['input', 'textarea'].includes(tag) || event.target?.isContentEditable) return;
      event.preventDefault();
      ctx.layout.selectPanel(ctx.layout.panelInfo.getSnapshot().activePanelId === ID ? null : ID);
    };
    globalThis.addEventListener?.('keydown', keydown, true);
    return () => globalThis.removeEventListener?.('keydown', keydown, true);
  }, 'qiaodoc-dsh: history shortcut');
  ctx.inject(['locale'], scope => {
    const dispose = scope.locale.register(ID, {
      zh: { ...HISTORY_MESSAGES.zh, ...DOCUMENT_MESSAGES.zh }, en: { ...HISTORY_MESSAGES.en, ...DOCUMENT_MESSAGES.en },
    });
    if (typeof scope.locale.bind === 'function') translate = scope.locale.bind(ID);
    return dispose;
  });
  if (typeof ctx.remote?.$mount === 'function') {
    void ctx.remote.$mount(REMOTE).then(() => {
      if (disposed) return;
      ctx.inject(['remote.qiaoDoc'], scope => {
        void data.setHost(remoteHostApi(scope)).then(() => history.load()).catch(error => console.warn('[文档历史] 连接失败', error));
      });
    }).catch(error => console.warn('[文档历史] 服务挂载失败', error));
  }
}
function DocumentIcon({ size = 18 }) {
  return React.createElement(QiaoDocMark, { size });
}
