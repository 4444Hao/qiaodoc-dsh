/** Resolve generic file bytes from a Session's logged reference, never a client path. */
export const MAX_SESSION_DOCUMENT_BYTES = 64 * 1024 * 1024;

export async function importSessionDocument(ctx, request, persist) {
  const { sessionId, attachmentId } = request || {};
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160
    || typeof attachmentId !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(attachmentId)) throw new Error('无效文档引用');
  const observation = await ctx.sessionQuery.observeSession(sessionId, { projectionMode: 'none' });
  let ref;
  try {
    if (!observation.header.cwd) throw new Error('找不到所属会话');
    // User/steering attachments are durable user/message content in rc.5.
    for (const event of observation.events) {
      if (event.type !== 'user/message') continue;
      ref = event.data?.content?.find(block => block.type === 'file' && block.attachment?.attachmentId === attachmentId)?.attachment;
      if (ref) break;
    }
    if (!ref) throw new Error('当前会话没有引用这份文档');
    ref = { ...ref };
  } finally { observation[Symbol.dispose](); }
  if (!/\.(pdf|txt|md|markdown|html?)$/i.test(ref.name || '')) throw new Error('此入口暂支持 PDF、TXT、Markdown 和 HTML');
  if (!Number.isSafeInteger(ref.bytes) || ref.bytes <= 0 || ref.bytes > MAX_SESSION_DOCUMENT_BYTES) throw new Error('此阅读入口支持不超过 64 MiB 的文档');
  const chunks = [];
  let length = 0;
  for await (const chunk of ctx.attachments.readFileStream(ref)) {
    length += chunk.byteLength;
    if (length > ref.bytes || length > MAX_SESSION_DOCUMENT_BYTES) throw new Error('文档大小与记录不符');
    chunks.push(Buffer.from(chunk));
  }
  // Provider verifies digest after its final chunk; persist only on full success.
  if (length !== ref.bytes) throw new Error('文档内容不完整');
  return persist(ref, Buffer.concat(chunks, length));
}
