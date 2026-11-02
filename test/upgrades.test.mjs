// PDF resources are still used by current local document import.
// Legacy reader UI appearance and page-key tests retired in slimming A1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EmbeddedPdfBinaryDataFactory, PDF_EMBEDDED_RESOURCE_OPTIONS } from '../src/client/pdf-resources.js';

test('PDF 资源数据：44 个繁中 CMap 且含 UCS2 总表', async () => {
  const { EMBEDDED_PDF_CMAPS, EMBEDDED_PDF_WASM_ARCHIVE } = await import(
    '../src/client/pdf-resources-data.js'
  );
  const names = Object.keys(EMBEDDED_PDF_CMAPS);
  assert.ok(names.length >= 40, `CMap 数量异常：${names.length}`);
  assert.ok(names.every((name) => name.endsWith('.bcmap')));
  assert.ok(names.includes('Adobe-CNS1-UCS2.bcmap'));
  assert.equal(typeof EMBEDDED_PDF_WASM_ARCHIVE, 'string');
});

test('PDF 资源工厂：CMap 解码为全新字节，未知资源抛可读错误', async () => {
  const { EmbeddedPdfBinaryDataFactory } = await import('../src/client/pdf-resources.js');
  const factory = new EmbeddedPdfBinaryDataFactory();

  const first = await factory.fetch({ kind: 'cMapUrl', filename: 'B5-H.bcmap' });
  assert.ok(first instanceof Uint8Array);
  assert.ok(first.length > 0);
  // 每次调用返回全新缓冲区（pdf.js 可能把缓冲区 transfer 给 worker）
  const second = await factory.fetch({ kind: 'cMapUrl', filename: 'B5-H.bcmap' });
  assert.notEqual(second.buffer, first.buffer);
  assert.deepEqual([...second], [...first]);

  await assert.rejects(
    factory.fetch({ kind: 'cMapUrl', filename: 'Nope-H.bcmap' }),
    /内嵌 PDF CMap 不可用/,
  );
  await assert.rejects(
    factory.fetch({ kind: 'standardFontDataUrl', filename: 'foo.ttf' }),
    /不支持的内嵌 PDF 资源类型/,
  );
});

test('PDF 资源工厂：wasm 解码器可从内嵌 zip 解出且带 \\0asm 魔数', async () => {
  const { EmbeddedPdfBinaryDataFactory } = await import('../src/client/pdf-resources.js');
  const factory = new EmbeddedPdfBinaryDataFactory();
  for (const name of ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm']) {
    const bytes = await factory.fetch({ kind: 'wasmUrl', filename: name });
    assert.ok(bytes instanceof Uint8Array, name);
    assert.equal(bytes[0], 0x00, `${name} 魔数字节 0`);
    assert.equal(bytes[1], 0x61, `${name} 魔数字节 1 (a)`);
    assert.equal(bytes[2], 0x73, `${name} 魔数字节 2 (s)`);
    assert.equal(bytes[3], 0x6d, `${name} 魔数字节 3 (m)`);
  }
  await assert.rejects(
    factory.fetch({ kind: 'wasmUrl', filename: 'missing.wasm' }),
    /内嵌 PDF 资源不可用/,
  );
});

test('PDF_EMBEDDED_RESOURCE_OPTIONS：useWorkerFetch 关闭且 URL 带尾斜杠', () => {
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.useWorkerFetch, false);
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.cMapPacked, true);
  assert.ok(PDF_EMBEDDED_RESOURCE_OPTIONS.cMapUrl.endsWith('/'));
  assert.ok(PDF_EMBEDDED_RESOURCE_OPTIONS.wasmUrl.endsWith('/'));
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.BinaryDataFactory, EmbeddedPdfBinaryDataFactory);
});
