import AsyncStorage from '@react-native-async-storage/async-storage';

// Key namespace: "z:" prefix, short segments to keep key size small
const K = {
  bookMeta:         (id)    => `z:bm:${id}`,
  bookChapters:     (id)    => `z:bc:${id}`,
  chapterSentences: (cid)   => `z:cs:${cid}`,
  bookDownloaded:   (id)    => `z:bd:${id}`,
  downloadedIndex:           'z:di',          // JSON array of downloaded bookIds
  booksList:                 'z:bl',
  progressMap:               'z:pm',
  bookProgress:     (id)    => `z:bp:${id}`,
  dict:             (word)  => `z:d:${word}`,
  vocab:                     'z:v',
};

async function load(key) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

async function save(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Book download storage ─────────────────────────────────────────────────────

export async function storeBookMeta(bookId, meta) {
  await save(K.bookMeta(bookId), meta);
}

export async function getCachedBookMeta(bookId) {
  return load(K.bookMeta(bookId));
}

export async function storeBookChapters(bookId, chapters) {
  await save(K.bookChapters(bookId), chapters);
}

export async function getCachedBookChapters(bookId) {
  return load(K.bookChapters(bookId));
}

export async function storeChapterSentences(chapterId, sentences) {
  await save(K.chapterSentences(chapterId), sentences);
}

export async function getCachedChapterSentences(chapterId) {
  return load(K.chapterSentences(chapterId));
}

export async function markBookDownloaded(bookId) {
  await save(K.bookDownloaded(bookId), { at: Date.now() });
  const index = (await load(K.downloadedIndex)) || [];
  if (!index.includes(bookId)) {
    await save(K.downloadedIndex, [...index, bookId]);
  }
}

export async function isBookDownloaded(bookId) {
  return !!(await load(K.bookDownloaded(bookId)));
}

export async function getDownloadedBookIds() {
  return (await load(K.downloadedIndex)) || [];
}

// ── Books list (home screen offline fallback) ─────────────────────────────────

export async function storeBooksList(books) {
  await save(K.booksList, books);
}

export async function getCachedBooksList() {
  return load(K.booksList);
}

// ── Progress ─────────────────────────────────────────────────────────────────

export async function storeProgressMap(map) {
  await save(K.progressMap, map);
}

export async function getCachedProgressMap() {
  return load(K.progressMap);
}

export async function storeBookProgress(bookId, progress) {
  await save(K.bookProgress(bookId), progress);
}

export async function getCachedBookProgress(bookId) {
  return load(K.bookProgress(bookId));
}

// ── Dictionary (write-through cache on every successful lookup) ───────────────

export async function storeDictEntry(word, data) {
  await save(K.dict(word), data);
}

export async function getCachedDictEntry(word) {
  return load(K.dict(word));
}

// ── Vocabulary ────────────────────────────────────────────────────────────────

export async function storeVocab(vocab) {
  await save(K.vocab, vocab);
}

export async function getCachedVocab() {
  return load(K.vocab);
}
