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
check('./assets/qiaodoc-icon-256.png');
assert(files.has('README.md') && files.has('LICENSE'));
assert(files.has('docs/INSTALLATION.md'), 'Missing first-install instructions');
const screenshots = JSON.parse(readFileSync('screenshots.json','utf8'));
assert(Array.isArray(screenshots) && screenshots.length >= 1 && screenshots.length <= 8);
assert(files.has('screenshots.json'), 'Missing screenshot manifest in package');
for (const file of screenshots) assert(!file.includes('..') && !file.startsWith('/') && existsSync(file) && files.has(file), `Invalid or unpackaged screenshot: ${file}`);
const readme = readFileSync('README.md', 'utf8');
const readmeImages = [...readme.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi), ...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
for (const file of readmeImages.filter(file => !/^(?:https?:|data:)/i.test(file))) {
  assert(!file.includes('\\'), `Use forward slashes in README image paths: ${file}`);
  check(file);
}
console.log(`Package verified: ${files.size} files; exports, bundle, README, license and screenshots valid.`);
