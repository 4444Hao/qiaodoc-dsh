export const MAX_PASTED_DOCUMENT_BYTES = 2 * 1024 * 1024;
const forbidden = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function suggestedPasteName(text, date = new Date()) {
  let title = String(text).split(/\r?\n/).find(line => line.trim())?.trim() || '粘贴文本';
  title = title.replace(/^#{1,6}\s+/, '').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_');
  title = [...title].slice(0, 24).join('').replace(/[. ]+$/, '') || '粘贴文本';
  if (reserved.test(title)) title = `文本_${title}`;
  const pad = value => String(value).padStart(2, '0');
  return `${title}_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function pastedDocumentFilename(name, format) {
  if (!['txt', 'md'].includes(format)) throw new Error('请选择 TXT 或 Markdown 格式');
  if (typeof name !== 'string') throw new Error('请填写文件名');
  const stem = name.trim().replace(/\.(txt|md)$/i, '');
  if (!stem || [...stem].length > 80 || forbidden.test(stem) || /[. ]$/.test(stem)
    || stem.startsWith('.') || reserved.test(stem)) throw new Error('文件名无效：请使用不超过 80 个字符的普通名称，不含路径或 Windows 禁用字符');
  return `${stem}.${format}`;
}
