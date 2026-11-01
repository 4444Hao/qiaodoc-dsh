export function historyPath(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || /[\u0000\r\n]/.test(value)) throw new Error('无效文档路径');
  const normalized = value.replace(/\\/g, '/');
  return /^[a-z]:\//i.test(normalized) ? normalized.toLowerCase() : normalized;
}
export function historyKey(sessionId, filePath) {
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) throw new Error('无效会话');
  return JSON.stringify([sessionId, historyPath(filePath)]);
}
export function historyFormat(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ({ pdf: 'PDF', txt: 'TXT', md: 'Markdown', markdown: 'Markdown', html: 'HTML', htm: 'HTML' })[ext];
}
export function readDocumentHistory(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) throw new Error('文档历史索引损坏，原文件已保留');
  for (const entry of raw.entries) {
    if (entry.id !== historyKey(entry.sessionId, entry.filePath) || !historyFormat(entry.filePath)
      || typeof entry.title !== 'string' || !Number.isFinite(entry.lastOpenedAt)) throw new Error('文档历史记录损坏，原文件已保留');
  }
  return raw;
}
export function updateDocumentHistory(raw, request, now) {
  const history = readDocumentHistory(raw);
  const id = historyKey(request?.sessionId, request?.filePath);
  const format = historyFormat(request.filePath);
  if (!format) throw new Error('此格式暂不支持文档历史');
  const old = history.entries.find(entry => entry.id === id);
  if (typeof request.title !== 'string' || !request.title.trim() || request.title.length > 500) throw new Error('无效文档名称');
  const entry = { ...old, id, sessionId: request.sessionId, filePath: request.filePath, title: request.title,
    format, lastOpenedAt: !old || request.opened || request.interacted ? now : old.lastOpenedAt, updatedAt: now };
  if (request.position) {
    const { page, offset, ratio } = request.position;
    if (page !== undefined && (!Number.isInteger(page) || page < 1 || page > 100000)) throw new Error('无效页码');
    if (offset !== undefined && (!Number.isFinite(offset) || offset < -1 || offset > 1)) throw new Error('无效阅读位置');
    if (ratio !== undefined && (!Number.isFinite(ratio) || ratio < 0 || ratio > 1)) throw new Error('无效阅读位置');
    entry.position = { ...(page ? { page } : {}), ...(offset !== undefined ? { offset } : {}), ...(ratio !== undefined ? { ratio } : {}) };
  }
  if (request.nodeKey !== undefined) {
    if (typeof request.nodeKey !== 'string' || request.nodeKey.length > 1000) throw new Error('无效消息位置');
    entry.nodeKey = request.nodeKey;
  }
  if (request.turn !== undefined) {
    if (!Number.isInteger(request.turn) || request.turn < 1) throw new Error('无效对话轮次');
    entry.turn = request.turn;
  }
  if (request.anchorSeq !== undefined) {
    if (!Number.isSafeInteger(request.anchorSeq) || request.anchorSeq < 0) throw new Error('无效消息序号');
    entry.anchorSeq = request.anchorSeq;
  }
  return { version: 1, entries: [...history.entries.filter(item => item.id !== id), entry].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt) };
}
