// Dependency-free CDP client for the opt-in, isolated DSH integration smoke.
export async function connect(endpoint = 'http://127.0.0.1:9227') {
  const base = new URL(endpoint);
  if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('CDP must be local');
  const pages = await (await fetch(new URL('/json/list', base))).json();
  const page = pages.find(item => item.type === 'page' && new URL(item.url).origin === 'http://127.0.0.1:3087');
  if (!page) throw new Error('Open the isolated DSH on port 3087 in the test browser first');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  await call('Runtime.enable'); await call('Page.enable');
  const run = async (fn, ...args) => {
    const result = await call('Runtime.evaluate', { expression: `(${fn.toString()})(...${JSON.stringify(args)})`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  return { call, run, errors, close: () => ws.close() };
}
