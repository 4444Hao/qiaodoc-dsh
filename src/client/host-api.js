/** Browser-to-host data API over Harness Typert Remote. */
export function remoteHostApi(ctx) {
  const call = async (name, request) => {
    const method = ctx.remote?.qiaoDoc?.[name];
    if (typeof method !== 'function') throw new Error('乔木阅读宿主书库未就绪');
    const result = request === undefined ? await method() : await method(request);
    if (result?.ok) return result.value;
    throw result?.error || new Error(`乔木阅读宿主调用失败：${name}`);
  };
  return {
    info: () => call('info'),
    library: () => call('library'),
    documentHistory: () => call('documentHistory'),
    recordDocumentHistory: (request) => call('recordDocumentHistory', request),
    createPastedDocument: (request) => call('createPastedDocument', request),
    import: (request) => call('importBook', request),
    importSessionDocument: (request) => call('importSessionDocument', request),
    remove: (bookId) => call('removeBook', { bookId }),
    restore: (bookId) => call('restoreBook', { bookId }),
    speechVoices: () => call('speechVoices'),
    speechAudio: (request) => call('speechAudio', request),
    sendToAnki: (request) => call('sendToAnki', request),
    searchBooks: (request) => call('searchBooks', request),
    downloadBook: (request) => call('downloadBook', request),
    loadState: (bookId) => call('loadState', { bookId }),
    saveState: (bookId, state) => call('saveState', { bookId, state }),
    readBookBytes: (bookId) => call('readBookBytes', { bookId }),
    highlights: (bookId) => call('highlights', { bookId }),
    exportNotes: (bookId) => call('exportNotes', { bookId }),
  };
}
