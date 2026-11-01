// Keep Host registration and Client descriptors in sync.
export const READER_REMOTE_METHODS = [
  'info', 'library', 'importBook', 'importSessionDocument', 'removeBook', 'restoreBook',
  'speechVoices', 'speechAudio', 'sendToAnki', 'searchBooks', 'downloadBook',
  'loadState', 'saveState', 'readBookBytes', 'highlights', 'exportNotes', 'setReadingContext',
  'documentHistory', 'recordDocumentHistory', 'createPastedDocument',
];
