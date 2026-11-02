/** Synthetic ZIP/EPUB fixtures. No third-party book content. */
import { crc32 as zlibCrc32, deflateRawSync } from 'node:zlib';

export const FIXTURE_COVER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJxkAAAAASUVORK5CYII=';

/** Small EPUB 3 assembled at test time; nav labels intentionally differ from headings. */
export function makeEpubFixture() {
  const chapters = Array.from({ length: 3 }, (_, i) => ({
    name: `EPUB/s${i}.xhtml`, method: 'deflate',
    data: `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${i}</title></head><body><h1>正文标题 ${i}</h1>${'<p>Alice reads a synthetic document. 这是测试文本，不含外部书籍内容。 <a href="../target.xhtml">Link</a></p>'.repeat(200)}<script>ignored()</script></body></html>`,
  }));
  return makeZip([
    { name: 'mimetype', data: 'application/epub+zip' },
    { name: 'META-INF/container.xml', data: '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf"/></rootfiles></container>', method: 'deflate' },
    { name: 'EPUB/package.opf', data: `<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>合成文档</dc:title><dc:creator>QiaoDoc 测试</dc:creator><dc:language>zh</dc:language><dc:identifier>urn:qiaodoc:fixture</dc:identifier><meta name="cover" content="cover"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="cover" href="cover.png" media-type="image/png"/>${chapters.map((_, i) => `<item id="c${i}" href="s${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`, method: 'deflate' },
    { name: 'EPUB/nav.xhtml', data: `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>${['导航标签一', '导航标签二', '导航标签三'].map((label, i) => `<li><a href="s${i}.xhtml">${label}</a></li>`).join('')}</ol></nav></body></html>`, method: 'deflate' },
    { name: 'EPUB/cover.png', data: Buffer.from(FIXTURE_COVER.split(',')[1], 'base64') },
    ...chapters,
  ]);
}

/**
 * 计算 CRC32（优先用 node 内置实现）。
 * @param {Buffer} buffer 字节
 * @returns {number} CRC32
 */
function crc32(buffer) {
  if (typeof zlibCrc32 === "function") return zlibCrc32(buffer) >>> 0;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 手搓一个最小 zip。
 * @param {{name: string, data?: string | Buffer, method?: 'store' | 'deflate'}[]} files 条目
 * @param {{comment?: string, dataDescriptor?: boolean, breakZip64?: boolean, badCrc?: boolean, localExtra?: number, utf8Flag?: boolean}} [options] 选项
 * @returns {Uint8Array} zip 字节
 */
export function makeZip(files, options = {}) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data ?? "", "utf8");
    const method = file.method === "deflate" ? 8 : 0;
    const payload = method === 8 ? deflateRawSync(data) : data;
    const flags = (options.utf8Flag === false ? 0 : 0x0800) | (options.dataDescriptor ? 0x0008 : 0);
    const crc = options.badCrc ? 0xdeadbeef : crc32(data);
    // 本地头可以带一段中央目录里没有的 extra，用来验证数据起点必须按本地头算。
    const localExtra = Buffer.alloc(options.localExtra ?? 0);
    if (localExtra.length >= 4) localExtra.writeUInt16LE(0x9999, 0);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    // bit 3 置位时，本地头里的 crc/尺寸按规范写 0，真实值只存在于中央目录。
    local.writeUInt32LE(options.dataDescriptor ? 0 : crc, 14);
    local.writeUInt32LE(options.dataDescriptor ? 0 : payload.length, 18);
    local.writeUInt32LE(options.dataDescriptor ? 0 : data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(localExtra.length, 28);
    localParts.push(local, name, localExtra, payload);
    let consumed = local.length + name.length + localExtra.length + payload.length;

    if (options.dataDescriptor) {
      const descriptor = Buffer.alloc(16);
      descriptor.writeUInt32LE(0x08074b50, 0);
      descriptor.writeUInt32LE(crc, 4);
      descriptor.writeUInt32LE(payload.length, 8);
      descriptor.writeUInt32LE(data.length, 12);
      localParts.push(descriptor);
      consumed += 16;
    }

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    // 打开 zip64 哨兵开关时写 0xFFFFFFFF，且不给 zip64 扩展字段。
    central.writeUInt32LE(options.breakZip64 ? 0xffffffff : offset, 42);
    centralParts.push(central, name);

    offset += consumed;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const comment = Buffer.from(options.comment ?? "", "utf8");
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(comment.length, 20);

  return new Uint8Array(Buffer.concat([...localParts, centralBuffer, eocd, comment]));
}

