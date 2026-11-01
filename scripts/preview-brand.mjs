// Render the real brand geometry and stylesheet; this is a design preview,
// not a DSH runtime acceptance screenshot. Use an isolated blank Edge on 9231.
import fs from 'node:fs/promises';
import path from 'node:path';
import { QIAODOC_ICON_SVG } from '../src/core/brand.js';
import { DOCUMENT_STYLES } from '../src/client/document-styles.js';

const root = path.resolve(import.meta.dirname, '..');
const pages = await (await fetch('http://127.0.0.1:9231/json/list')).json();
const page = pages.find(item => item.type === 'page' && item.url === 'about:blank');
if (!page) throw new Error('Start a separate blank preview browser on port 9231.');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id); clearTimeout(request.timer);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const evaluate = async expression => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
async function render(html, width, height, output) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const { frameTree } = await call('Page.getFrameTree');
  await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
  await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(screenshot.data, 'base64'));
}
const actions = (english = false) => `<div class="qmr-doc-menu"><span class="qmr-doc-brand" aria-hidden="true">${QIAODOC_ICON_SVG.replace('<svg ', '<svg width="28" height="28" ')}</span>${['explain', 'translate', 'copy', 'ask'].map((action, i) => `<button class="qmr-doc-button qmr-doc-action-${action}">${(english ? ['Explain', 'Translate', 'Copy', 'Ask AI'] : ['解释', '翻译', '复制', '询问 AI'])[i]}</button>`).join('')}</div>`;
try {
  await call('Page.enable');
  await call('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await render(`<style>html,body{margin:0;background:transparent}svg{display:block;width:256px;height:256px}</style>${QIAODOC_ICON_SVG}`, 256, 256, path.join(root, 'assets/qiaodoc-icon-256.png'));
  const preview = `<!doctype html><meta charset="utf-8"><style>${DOCUMENT_STYLES}
  *{box-sizing:border-box}body{margin:0;background:#eaf3ee;font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;color:#153b2e;padding:42px}
  header{display:flex;align-items:center;gap:20px;margin-bottom:28px}header svg{width:72px;height:72px}h1{margin:0;font-size:30px;font-weight:650;letter-spacing:-.5px}header p{margin:4px 0;color:#527367}
  .panels{display:grid;grid-template-columns:1fr 1fr;gap:22px}.panel{padding:28px;border-radius:18px;min-height:270px;background:#fff;border:1px solid #cddfd4}.panel.dark{background:#171c1a;border-color:#30433a;color:#e5f4eb}
  .tag{font-size:11px;letter-spacing:1.5px;color:#6f9683}.quote{margin:23px 0 20px;font-size:17px;line-height:1.85}.quote span{background:#d5f3e1;color:#193e2b;padding:3px 2px}.dark .quote span{background:#264d3c;color:#e3ffed}
  .qmr-doc-menu{position:static;width:max-content;max-width:100%}.sizes{display:flex;align-items:center;gap:20px;margin-top:30px;padding:22px 28px;background:#f9fcfa;border:1px solid #cddfd4;border-radius:16px}.sizes svg{display:block}.sizes small{color:#527367;margin-left:auto}footer{margin-top:20px;color:#527367;font-size:12px}
  </style><header>${QIAODOC_ICON_SVG}<div><h1>QiaoDoc <span style="font-weight:400">乔豆文解</span></h1><p>文档在旁，理解随行。</p></div></header><div class="panels"><section class="panel"><div class="tag">LIGHT · 浅色背景</div><p class="quote"><span>在当前对话旁阅读原文，<br>选中一段，继续理解。</span></p>${actions()}</section><section class="panel dark"><div class="tag">DARK · 深色背景</div><p class="quote"><span>Read beside your conversation.<br>Select a passage to understand it.</span></p>${actions(true)}</section></div><div class="sizes">${[20, 32, 48, 64].map(size => QIAODOC_ICON_SVG.replace('<svg ', `<svg width="${size}" height="${size}" `)).join('')}<small>三片叶子 · 一页原文<br>墨绿 / 薄荷绿 / 暖黄</small></div><footer>本地设计预览 · 使用插件同源 SVG 与 CSS 渲染 · 并非真实 Harness 验收截图</footer>`;
  await render(preview, 1160, 660, path.join(root, 'release/dev/brand-preview/qiaodoc-brand-preview.png'));
  const results = [];
  for (const english of [false, true]) {
    await render(`<meta charset="utf-8"><style>${DOCUMENT_STYLES}body{margin:0;font-family:"Segoe UI",sans-serif}.qmr-doc-menu{left:8px;top:8px}</style>${actions(english)}`, 320, 180, path.join(root, `release/dev/brand-preview/toolbar-narrow-${english ? 'en' : 'zh'}.png`));
    const bounds = await evaluate(`(() => {const r=document.querySelector('.qmr-doc-menu').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,buttons:document.querySelectorAll('button').length}})()`);
    if (bounds.right > 312.1 || bounds.buttons !== 4) throw new Error('Narrow toolbar overflowed or lost an action.');
    results.push({ language: english ? 'en' : 'zh', width: 320, ...bounds });
  }
  const luminance = hex => {
    const channels = hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return channels.reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
  };
  const contrast = [['f0fff6', '123e35'], ['123e35', 'c2f2d4'], ['f0fff6', '20563f']].map(([foreground, background]) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const ratio = (values[0] + .05) / (values[1] + .05);
    if (ratio < 4.5) throw new Error('Insufficient text contrast.');
    return { foreground, background, ratio: Number(ratio.toFixed(2)) };
  });
  const report = { date: new Date().toISOString(), type: 'stylesheet and SVG design preview, not Harness acceptance', results, contrast };
  await fs.writeFile(path.join(root, 'release/dev/reports/brand-dev4-visual.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await call('Browser.close').catch(() => {});
  socket.close();
}
