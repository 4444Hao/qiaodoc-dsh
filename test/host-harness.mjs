import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const result = await build({ entryPoints: ['src/host/index.js'], bundle: true, write: false, format: 'esm', platform: 'node',
  external: ['pdfjs-dist/*'], plugins: [{ name: 'remote-contract', setup(b) {
    b.onResolve({ filter: /^@deepseek-ai\/dsh-typert-protocol$/ }, () => ({ path: 'remote', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export class TypertRemoteService { constructor(_ctx, namespace) { this.remoteNamespace = namespace; } } export const Remote = () => () => {};' }));
  } }] });
const { apply, default: ReaderService, name, LIBRARY_FOLDER } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
export { ReaderService, name, LIBRARY_FOLDER };
export async function hostHarness() {
  const root = await mkdtemp(path.join(tmpdir(), 'qmr-host-'));
  let tool;
  const start = () => apply({
    effect: fn => fn(),
    get: name => name === 'tools' ? { register: value => { tool = value; return () => {}; } } : undefined,
  }, { workspaceRoot: root });
  return { root, api: start(), restart: start, get tool() { return tool; }, cleanup: () => rm(root, { recursive: true, force: true }) };
}
