/** Conversation documents plus a small history panel; no independent reader/chat. */
import * as React from 'react';
import { createDataLayer } from './bridge.js';
import { remoteHostApi } from './host-api.js';
import { installDocumentReader, DOCUMENT_MESSAGES } from './document-reader.js';
import { createDocumentHistory } from './document-history.js';
import { DocumentHistoryPanel, HISTORY_MESSAGES } from '../ui/document-history.js';
import { READER_REMOTE_METHODS } from '../core/reader-remotes.js';
import { QiaoDocMark } from './brand.js';

const ID = 'qiaomu-reader';
const remoteCodec = () => ({ mode: 'strict', typeSymbol: 'qiaomu-reader-dsh#json',
  create: () => ({ parse: value => value, safeParse: value => ({ success: true, data: value }) }) });
const REMOTE = {
  package: 'qiaomu-reader-dsh',
  descriptors: READER_REMOTE_METHODS.map(method => ({
    id: `qiaomu-reader-dsh#qiaomuReader/${method}`, service: 'qiaomuReader', namespace: 'qiaomuReader', method,
    invocation: { kind: 'direct' },
    parameters: ['info', 'library', 'speechVoices', 'documentHistory'].includes(method) ? [] : [{ name: 'request', wire: 'request', source: 'json', codec: remoteCodec() }],
    result: { mode: 'src-json' }, cancellation: { parameter: 'signal' },
  })),
};
export const inject = ['slots', 'layout', 'remote'];
export function apply(ctx) {
  const data = createDataLayer();
  const history = createDocumentHistory(data);
  let disposed = false;
  let translate = key => HISTORY_MESSAGES.zh[key] || key;
  ctx.effect(() => () => { disposed = true; }, 'qiaomu-reader: lifetime');
  installDocumentReader(ctx, data, history);
  ctx.inject(['uiWorkspace', 'uiSession', 'sidebarRight', 'sessions', 'resources'], scope => history.bind(scope));
  const close = () => ctx.layout.selectPanel(null);
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: ID, locale: ID, inject: () => ({ history, close }),
  }, DocumentHistoryPanel)), 'qiaomu-reader: document history');
  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: ID, order: 40, label: () => translate('open'),
  }, DocumentIcon)), 'qiaomu-reader: history entry');
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
  }, 'qiaomu-reader: history shortcut');
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
      ctx.inject(['remote.qiaomuReader'], scope => {
        void data.setHost(remoteHostApi(scope)).then(() => history.load()).catch(error => console.warn('[文档历史] 连接失败', error));
      });
    }).catch(error => console.warn('[文档历史] 服务挂载失败', error));
  }
}
function DocumentIcon({ size = 18 }) {
  return React.createElement(QiaoDocMark, { size });
}
