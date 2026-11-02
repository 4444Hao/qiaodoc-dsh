/**
 * 客户端数据面：把「宿主半的持久化」与「浏览器本地缓存」合成一个数据源，
 * 保留旧状态与文件兼容；当前界面通过 createDocumentData 使用文档接口。
 *
 * 目录只来自用户已有数据，不再补入示例书或用示例元数据覆盖用户副本。
 * 用户导入的书先落宿主（有文件系统时），失败再退化为仅浏览器缓存。
 */
import {
  DEFAULT_READER_SETTINGS,
  addBookmark,
  addHighlight,
  createBookState,
  normalizeLibrary,
  normalizeState,
  mergeStates,
  progressOf,
  removeBookmark,
  removeHighlight,
  updateHighlightNote,
} from '../core/state.js';
import { toMarkdown } from '../ui/format.js';
import { formatOf, TEXT_FORMATS, BOOK_FORMATS } from './text-formats.js';
import {
  clearLocalData,
  loadBookBytes as loadCachedBytes,
  loadLocalLibrary,
  loadLocalState,
  removeBookBytes,
  removeLocalState,
  saveBookBytes,
  saveLocalLibrary,
  saveLocalState,
} from '../client/storage.js';

/** UI 需要的默认设置。 */
export { DEFAULT_READER_SETTINGS };

/** base64 与 Uint8Array 互转（不依赖 Buffer）。 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 由字节生成稳定 id（与宿主半同算法，保证两边认同一本书）。 */
function bookIdOf(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < bytes.length; i += 1) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + bytes[i] * (i + 1)) >>> 0;
  }
  return `c${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * 客户端数据面。
 *
 * @param {object} options - { host: 宿主数据面 | null, maxCacheBooks: 内存里最多缓存几本解析结果 }
 */
export function createDataLayer(options = {}) {
  let host = options.host ?? null;
  const maxCacheBooks = Number.isFinite(options.maxCacheBooks) ? options.maxCacheBooks : 3;

  /** 内存中的书库与状态，UI 通过 get() 读。 */
  let library = normalizeLibrary(null);
  const states = new Map();
  /** bookId -> { book, engine, bytes } */
  const engines = new Map();
  /** 打开中的书，避免重复解析。 */
  const opening = new Map();
  const pendingStateWrites = new Map();
  const migratedLocalIds = new Set();
  const listeners = new Set();
  let status = 'idle';
  let lastError = '';

  function emit() {
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[乔木阅读] 订阅者异常', error);
      }
    }
  }

  function setStatus(next, error = '') {
    status = next;
    lastError = error;
    emit();
  }

  async function setHost(api) {
    host = api;
    const cached = normalizeLibrary(await loadLocalLibrary().catch(() => null));
    const candidates = new Map([...cached.books, ...(cached.removedBooks || []), ...library.books, ...(library.removedBooks || [])]
      .filter((book) => book && (book.source === 'local' || book.source === 'local-offline'))
      .map((book) => [book.id, book]));
    for (const book of candidates.values()) {
      try {
        const bytes = await loadCachedBytes(book.id);
        if (!bytes) continue;
        const result = await api.import({
          filename: `${book.title || book.id}.${book.format}`,
          base64: bytesToBase64(bytes), title: book.title, author: book.author,
          chapterCount: book.chapterCount, language: book.language, identifier: book.identifier, textLayout: book.textLayout || 1,
          localId: book.id,
        });
        const nextId = result?.book?.id;
        if (!nextId) continue;
        const localState = await loadLocalState(book.id).catch(() => null);
        if (localState) {
          const remoteState = await api.loadState(nextId).catch(() => null);
          const merged = mergeStates(normalizeState(remoteState, nextId), normalizeState({ ...localState, bookId: nextId }, nextId));
          await api.saveState(nextId, merged);
          states.set(nextId, merged);
        }
        await saveBookBytes(nextId, bytes).catch(() => undefined);
        if (book.removedAt) await api.remove(nextId);
        library.bookAliases = { ...(cached.bookAliases || {}), ...(library.bookAliases || {}), [book.id]: nextId };
        migratedLocalIds.add(book.id);
      } catch (error) {
        console.warn('[乔木阅读] 本地书迁移到宿主失败', book.id, error);
      }
    }
    return refreshLibrary();
  }

  /** 首次加载：宿主优先，客户端缓存兜底，不按旧示例标识筛除用户文件。 */
  async function refreshLibrary() {
    setStatus('loading');
    const sessionAliases = library.bookAliases || {};
    let fetched = null;
    let failure = '';
    if (host !== null) {
      try {
        fetched = await host.library();
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }
    }
    let cached = null;
    try {
      cached = await loadLocalLibrary();
    } catch {
      cached = null;
    }
    const remoteBooks = Array.isArray(fetched?.books) ? fetched.books : [];
    const remoteIds = new Set(remoteBooks.map((book) => book.id));
    const localOnly = Array.isArray(cached?.books) ? cached.books.filter((book) =>
      book && (book.source === 'local' || book.source === 'local-offline')
      && !remoteIds.has(book.id) && !migratedLocalIds.has(book.id)) : [];
    const localRemoved = (cached?.removedBooks || []).filter(book => ['local', 'local-offline'].includes(book.source) && !migratedLocalIds.has(book.id));
    const source = fetched ? { ...fetched, books: [...remoteBooks, ...localOnly], removedBooks: [...(fetched.removedBooks || []), ...localRemoved] } : cached ?? null;
    library = normalizeLibrary(source);
    library.bookAliases = { ...(cached?.bookAliases || {}), ...sessionAliases, ...(source?.bookAliases || {}) };
    for (const book of [...library.books, ...(library.removedBooks || [])]) {
      for (const alias of book.aliases || []) library.bookAliases[alias] = book.id;
    }
    // 回写缓存，保证离线下次也有同样的书单。
    try {
      await saveLocalLibrary(library);
    } catch {
      /* 缓存失败不影响内存 */
    }
    setStatus('ready', failure);
    return library;
  }

  /** 读取某本书的状态：内存 → 宿主 → 本地缓存 → 空壳。 */
  async function ensureState(bookId) {
    if (states.has(bookId)) return states.get(bookId);
    let raw = null;
    if (host !== null) {
      try {
        raw = await host.loadState(bookId);
      } catch {
        raw = null;
      }
    }
    const local = await loadLocalState(bookId).catch(() => null);
    // A failed host sync must not replace a newer local reading session on restart.
    const state = normalizeState(local && (!raw || local.updatedAt > raw.updatedAt) ? local : raw || local, bookId);
    states.set(bookId, state);
    return state;
  }

  /** 写入状态：先更新内存并通知 UI，再异步落两处。 */
  function persistState(bookId, nextState) {
    const state = { ...nextState, bookId };
    states.set(bookId, state);
    emit();
    const previous = pendingStateWrites.get(bookId) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      await saveLocalState(bookId, state);
      if (host !== null) await host.saveState(bookId, state);
    });
    pendingStateWrites.set(bookId, pending);
    void pending.catch(error => setStatus('ready', `阅读数据暂未同步到宿主：${error?.message || error}`));
    return state;
  }

  /**
 * 取书籍字节，按确定性回退链：
 *   1. 本次会话已解析的引擎（内存）
 *   2. 浏览器字节缓存（用户导入的书主要靠它）
 *   3. 宿主半（有宿主时才有）
 * 没有真实文件或缓存的旧示例记录不再提供内联正文；不删除其状态或记录。
 */
  async function loadBookBytes(bookId) {
    const cached = engines.get(bookId);
    if (cached !== undefined) return cached.bytes;
    const local = await loadCachedBytes(bookId).catch(() => undefined);
    if (local !== undefined) return local;
    if (host !== null) {
      const result = await host.readBookBytes(bookId);
      if (typeof result?.base64 !== 'string') throw new Error('宿主没有返回书籍内容');
      const bytes = base64ToBytes(result.base64);
      await saveBookBytes(bookId, bytes).catch(() => undefined);
      return bytes;
    }
    throw new Error('这本书的正文不在本地缓存里，请重新导入');
  }

  /** 解析并缓存阅读引擎（超出上限时淘汰最早打开的）。 */
  async function openBook(bookId) {
    const entry = [...library.books, ...(library.removedBooks || [])].find((book) => book.id === bookId);
    if (entry && !BOOK_FORMATS.includes(entry.format)) throw new Error(`不支持打开 ${entry.format.toUpperCase()}`);
    if (engines.has(bookId)) return engines.get(bookId);
    if (opening.has(bookId)) return opening.get(bookId);
    const task = (async () => {
      const bytes = await loadBookBytes(bookId);
      let record;
      if (entry?.format === 'pdf') {
        const { parsePdfBook } = await import('./pdf-book.js');
        record = await parsePdfBook(bytes, entry.title);
      } else if (TEXT_FORMATS.includes(entry?.format)) {
        const { parseTextBook } = await import('./text-book.js');
        record = parseTextBook(bytes, entry.title, entry.format, { layout: entry.textLayout || 1 });
      } else {
        const { parseEpub } = await import('../core/epub.js');
        const parsed = await parseEpub(bytes);
        const { createReaderEngine } = await import('../core/reader.js');
        record = { book: parsed, engine: createReaderEngine(parsed), bytes };
      }
      engines.set(bookId, record);
      while (engines.size > maxCacheBooks) {
        const oldest = engines.keys().next().value;
        if (oldest === bookId) break;
        await engines.get(oldest)?.engine?.dispose?.();
        engines.delete(oldest);
      }
      return record;
    })();
    opening.set(bookId, task);
    try {
      return await task;
    } finally {
      opening.delete(bookId);
    }
  }

  /** 导入一本书：先落宿主，再更新内存与缓存。 */
  async function importBook(file) {
    if (file === undefined || file === null) return { ok: false, error: '没有选择文件' };
    const filename = typeof file.name === 'string' ? file.name : 'book.epub';
    let format;
    try { format = formatOf(filename); } catch (error) { return { ok: false, error: error.message }; }
    let bytes;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      return { ok: false, error: `读取文件失败：${error instanceof Error ? error.message : String(error)}` };
    }
    if (bytes.byteLength === 0) return { ok: false, error: '文件是空的' };
    const legacyId = bookIdOf(bytes);
    const fallbackId = globalThis.crypto?.subtle
      ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)), b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
      : legacyId;
    let meta = null;
    if (format === 'epub') {
      try {
        const { parseEpub } = await import('../core/epub.js');
        const parsed = await parseEpub(bytes);
        const coverBytes = parsed.coverHref ? await parsed.resourceBytes(parsed.coverHref) : null;
        const coverType = parsed.coverHref ? parsed.resources[parsed.coverHref]?.mediaType : null;
        const cover = coverBytes && coverBytes.byteLength <= 1024 * 1024
          && /^image\/(?:jpeg|png|webp|gif)$/i.test(coverType || '')
          ? `data:${coverType};base64,${bytesToBase64(coverBytes)}` : null;
        meta = {
          title: parsed.title,
          author: parsed.author,
          language: parsed.language,
          identifier: parsed.identifier,
          chapterCount: parsed.chapters.length,
          cover,
        };
      } catch (error) {
        return { ok: false, error: `解析 EPUB 失败：${error instanceof Error ? error.message : String(error)}` };
      }
    } else if (TEXT_FORMATS.includes(format)) {
      try {
        const { parseTextBook } = await import('./text-book.js');
        const previous = [...library.books, ...(library.removedBooks || [])].find(book => book.id === fallbackId || book.id === legacyId);
        const textLayout = previous ? previous.textLayout || 1 : 2;
        const parsed = parseTextBook(bytes, filename.replace(/\.[^.]+$/, ''), format, { layout: textLayout }).book;
        meta = { title: parsed.title, author: parsed.author, language: parsed.language, chapterCount: parsed.chapters.length, textLayout };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    } else if (format === 'pdf') {
      try {
        const { parsePdfBook } = await import('./pdf-book.js');
        const record = await parsePdfBook(bytes, filename.replace(/\.[^.]+$/, ''));
        meta = { chapterCount: record.engine.chapterCount() };
        await record.engine.dispose();
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
    if (/^gutenberg:\d+$/.test(file.discoveryIdentifier || '')) meta = { ...meta, identifier: file.discoveryIdentifier };
    let book = null;
    let hostError = '';
    if (host !== null) {
      try {
        const result = await host.import({ filename, base64: bytesToBase64(bytes), ...meta });
        book = result?.book ?? null;
      } catch (error) {
        hostError = error instanceof Error ? error.message : String(error);
      }
    } else hostError = '宿主书库未连接，文件仅保存在本机缓存';
    if (book === null) {
      // 宿主不可用：登记到本地书库，正文进浏览器字节缓存，刷新后仍可打开。
      book = {
        id: fallbackId,
        title: meta?.title || filename.replace(/\.[^.]+$/, ''),
        author: meta?.author ?? '',
        format,
        file: null,
        bytes: bytes.byteLength,
        cover: meta?.cover ?? null,
        addedAt: Date.now(),
        openedAt: null,
        source: hostError === '' ? 'local' : 'local-offline',
        language: meta?.language ?? '',
        chapterCount: meta?.chapterCount ?? 0,
        identifier: meta?.identifier ?? '',
        textLayout: meta?.textLayout,
      };
    }
    if (legacyId !== book.id) {
      const legacyState = await loadLocalState(legacyId);
      if (legacyState) {
        const remote = await ensureState(book.id);
        persistState(book.id, mergeStates(remote, normalizeState({ ...legacyState, bookId: book.id }, book.id)));
        library.bookAliases = { ...(library.bookAliases || {}), [legacyId]: book.id };
      }
    }
    // 无论宿主是否落盘，本机都留一份：脱机与跨版本时可读。
    await saveBookBytes(book.id, bytes).catch(() => undefined);
    if (format === 'epub') {
      try {
        const { parseEpub } = await import('../core/epub.js');
        const parsed = await parseEpub(bytes);
        const { createReaderEngine } = await import('../core/reader.js');
        engines.set(book.id, { book: parsed, engine: createReaderEngine(parsed), bytes });
      } catch {
        /* 前面已经预解析成功过一次；这里失败也不影响入库 */
      }
    }
    library = normalizeLibrary({ ...library, books: [...library.books.filter((entry) => entry.id !== book.id && entry.id !== legacyId), book],
      removedBooks: (library.removedBooks || []).filter(entry => entry.id !== book.id && entry.id !== legacyId) });
    await saveLocalLibrary(library).catch(() => undefined);
    if (hostError) setStatus('ready', hostError);
    emit();
    return { ok: true, book, hostError };
  }

  /** Remove membership only; a failed host operation leaves the local book intact. */
  async function removeBook(bookId) {
    const book = library.books.find(entry => entry.id === bookId);
    if (!book) return { ok: false, error: '书库中没有这本书' };
    await pendingStateWrites.get(bookId);
    const localOnly = ['local', 'local-offline'].includes(book.source);
    if (!localOnly) {
      try {
        if (!host) throw new Error('请连接宿主后再移除这本书');
        await host.remove(bookId);
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
    library = normalizeLibrary({ ...library, books: library.books.filter((book) => book.id !== bookId),
      removedBooks: [...(library.removedBooks || []).filter(entry => entry.id !== bookId), { ...book, removedAt: Date.now() }] });
    await engines.get(bookId)?.engine?.dispose?.();
    engines.delete(bookId);
    await saveLocalLibrary(library).catch(() => undefined);
    emit();
    return { ok: true };
  }

  async function restoreBook(bookId) {
    const book = library.removedBooks?.find(entry => entry.id === bookId);
    if (!book) return { ok: false, error: '没有可恢复的书籍' };
    if (!['local', 'local-offline'].includes(book.source)) {
      try {
        if (!host) throw new Error('请连接宿主后再恢复这本书');
        await host.restore(bookId);
      } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    }
    library = normalizeLibrary({ ...library, books: [...library.books, { ...book, removedAt: null }],
      removedBooks: library.removedBooks.filter(entry => entry.id !== bookId) });
    await saveLocalLibrary(library);
    emit();
    return { ok: true };
  }

  /** 导出 Markdown 阅读笔记。 */
  async function exportNotes(bookId) {
    const book = library.books.find((entry) => entry.id === bookId);
    const state = await ensureState(bookId);
    const markdown = toMarkdown(state, book, engines.get(bookId)?.engine);
    if (host !== null) {
      try {
        await pendingStateWrites.get(bookId);
        await host.exportNotes(bookId);
      } catch {
        /* 落宿主失败不影响复制到剪贴板 */
      }
    }
    return { markdown };
  }

  return {
    setHost,
    getHost: () => host,
    resolveBookId: (id) => library.bookAliases?.[id] || id,
    flushStateWrites: (bookId) => pendingStateWrites.get(bookId) || Promise.resolve(),
    /* --- 读取 --- */
    getLibrary: () => library,
    getStatus: () => ({ status, error: lastError }),
    getState: (bookId) => states.get(bookId),
    getEngine: (bookId) => engines.get(bookId)?.engine,
    getParsedBook: (bookId) => engines.get(bookId)?.book,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /* --- 操作 --- */
    refreshLibrary,
    ensureState,
    openBook,
    importBook,
    removeBook,
    restoreBook,
    exportNotes,
    clearLocalData,

    /* --- 状态改写（全部走不可变纯函数） --- */
    /** 直接落盘一份状态：UI 的 actions.saveState 走这里。 */
    persistState(bookId, nextState) {
      return persistState(bookId, nextState);
    },
    async addHighlight(bookId, input) {
      const state = await ensureState(bookId);
      const result = addHighlight(state, input);
      persistState(bookId, result.state);
      return result;
    },
    async removeHighlight(bookId, id) {
      const state = await ensureState(bookId);
      const result = removeHighlight(state, id);
      persistState(bookId, result.state);
      return result;
    },
    async updateHighlightNote(bookId, id, note) {
      const state = await ensureState(bookId);
      persistState(bookId, updateHighlightNote(state, id, note));
    },
    async addBookmark(bookId, input) {
      const state = await ensureState(bookId);
      const result = addBookmark(state, input);
      persistState(bookId, result.state);
      return result;
    },
    async removeBookmark(bookId, id) {
      const state = await ensureState(bookId);
      persistState(bookId, removeBookmark(state, id));
    },
    /** 保存阅读位置与设置。 */
    async saveProgress(bookId, locator) {
      const state = await ensureState(bookId);
      persistState(bookId, { ...state, locator });
    },
    async saveSettings(bookId, settings) {
      const state = await ensureState(bookId);
      persistState(bookId, { ...state, settings: { ...state.settings, ...settings } });
    },
    /** 进度百分比，供书库卡片与工具条使用。 */
    progressOf(bookId) {
      const book = library.books.find((entry) => entry.id === bookId);
      const state = states.get(bookId);
      if (book === undefined || state === undefined) return 0;
      return progressOf(state, book.chapterCount || 1);
    },
    /** 新建一本书的空状态（避免首次打开时闪烁）。 */
    primeState(bookId) {
      if (!states.has(bookId)) states.set(bookId, createBookState(bookId));
      return states.get(bookId);
    },
  };
}

/** 当前对话文档使用的最小数据入口；旧状态/解析能力留在兼容层逐步退出。 */
export function createDocumentData(options = {}) {
  const data = createDataLayer(options);
  return {
    setHost: data.setHost,
    getHost: data.getHost,
    getLibrary: data.getLibrary,
    refreshLibrary: data.refreshLibrary,
    importBook: data.importBook,
  };
}
