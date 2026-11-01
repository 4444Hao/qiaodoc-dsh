import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
const p = JSON.parse(readFileSync('package.json', 'utf8'));
// npm is a .cmd shim on Windows. Invoke npm's JS entry through Node without a shell.
const npmCli = process.env.npm_execpath || (process.platform === 'win32'
  ? [path.dirname(process.execPath), ...(process.env.PATH || '').split(path.delimiter)]
    .map(dir => path.join(dir, 'node_modules/npm/bin/npm-cli.js')).find(existsSync)
  : undefined);
const [pack] = JSON.parse(npmCli
  ? execFileSync(process.execPath, [npmCli, 'pack', '--dry-run', '--ignore-scripts', '--json'], {encoding:'utf8'})
  : execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {encoding:'utf8'}));
const files = new Set(pack.files.map(f => f.path));
function check(target) {
  if (typeof target === 'object') return Object.values(target).forEach(check);
  assert.equal(typeof target, 'string');
  const normalized = target.replace(/^\.\//, '');
  if (normalized.includes('*')) {
    const escaped = normalized.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    assert([...files].some(f => new RegExp('^'+escaped+'$').test(f)), `Empty export: ${target}`);
  } else assert(files.has(normalized), `Missing package file: ${target}`);
}
check(p.exports);
check(p.dsh.bundle.patch);
check(p.icon || (p.name === 'qiaomu-rss-dsh' ? './lib/client.js' : './icon.svg'));
assert(files.has('README.md') && files.has('LICENSE'));
const screenshots = JSON.parse(readFileSync('screenshots.json','utf8'));
assert(Array.isArray(screenshots) && screenshots.length >= 1 && screenshots.length <= 8);
for (const file of screenshots) assert(!file.includes('..') && !file.startsWith('/') && existsSync(file), `Invalid screenshot: ${file}`);
console.log(`Package verified: ${files.size} files; exports, bundle, README, license and screenshots valid.`);
