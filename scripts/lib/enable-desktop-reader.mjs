// The rc.5 plugin command installs packages via pnpm; an explicit bundle list
// must also include the reader for the desktop loader to compose its patch.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const profile = path.resolve(process.argv[2]);
assert.equal(profile, path.join(os.homedir(), '.dsh', 'profiles', 'desktop'), 'Expected the daily desktop profile');
const file = path.join(profile, 'package.json');
const data = JSON.parse(await readFile(file, 'utf8'));
assert.ok(data.dependencies?.['qiaodoc-dsh'], 'Install the reader package first');
assert.ok(!data.dependencies?.['qmr-document-smoke-model'], 'Test model must not be installed here');
const bundles = data.dsh?.profile?.bundles;
assert.ok(Array.isArray(bundles), 'Expected the explicit rc.5 profile bundle list');
if (!bundles.includes('qiaodoc-dsh')) {
  bundles.push('qiaodoc-dsh');
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}
console.log('Desktop reader bundle enabled; deterministic model absent.');
