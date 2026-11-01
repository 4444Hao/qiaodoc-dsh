import { mkdir, realpath, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { MAX_PASTED_DOCUMENT_BYTES, pastedDocumentFilename } from '../core/pasted-document.js';

/** The target comes from the durable Session header, never from a client path. */
export async function createPastedDocument(ctx, request) {
  const { sessionId, text, name, format } = request || {};
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) throw new Error('无效会话');
  if (typeof text !== 'string' || !text.trim()) throw new Error('请先粘贴文字');
  if (Buffer.byteLength(text, 'utf8') > MAX_PASTED_DOCUMENT_BYTES) throw new Error('粘贴内容不能超过 2 MiB');
  const filename = pastedDocumentFilename(name, format);
  const observation = await ctx.sessionQuery.observeSession(sessionId, { projectionMode: 'none' });
  let cwd;
  try { cwd = observation.header.cwd; } finally { observation[Symbol.dispose](); }
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) throw new Error('当前会话没有可用的工作区目录');
  const root = await realpath(cwd);
  const directory = path.join(root, '粘贴文档');
  await mkdir(directory, { recursive: true });
  // Reject a pre-existing junction/symlink that redirects this subdirectory.
  if (await realpath(directory) !== directory) throw new Error('粘贴文档目录指向其他位置，请改用工作区内的普通文件夹');
  const stem = filename.slice(0, -(format.length + 1));
  for (let number = 1; number <= 1000; number++) {
    const actualName = number === 1 ? filename : `${stem}_${number}.${format}`;
    const filePath = path.join(directory, actualName);
    let file;
    try { file = await open(filePath, 'wx'); }
    catch (error) { if (error.code === 'EEXIST') continue; throw error; }
    try { await file.writeFile(text, { encoding: 'utf8' }); await file.sync(); }
    catch (error) { await file.close(); await unlink(filePath).catch(() => {}); throw error; }
    await file.close();
    return { sessionId, filePath, name: actualName, format };
  }
  throw new Error('同名文件过多，请修改文件名后重试');
}
