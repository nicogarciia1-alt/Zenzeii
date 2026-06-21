import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
// Direct weight imports — prevents all 8 Noto Serif JP weights bundling (~61 MB → ~15 MB)
const NotoSerifJP_400Regular = require('@expo-google-fonts/noto-serif-jp/400Regular/NotoSerifJP_400Regular.ttf');
const NotoSerifJP_700Bold = require('@expo-google-fonts/noto-serif-jp/700Bold/NotoSerifJP_700Bold.ttf');
import {
  getBook, getChapters, getVocabulary, getBookmarks,
  getSentences, getSentencesCount, triggerTranslation, updateProgress, tokenize,
  getBookProgress,
} from '../../lib/api';
import {
  getCachedBookMeta, getCachedBookChapters, getCachedChapterSentences,
  getCachedBookProgress, storeBookProgress,
  getCachedVocab, storeVocab,
} from '../../lib/offlineStorage';
import { enqueue } from '../../lib/offlineQueue';
import { useIsOnline } from '../../hooks/useNetInfo';
import DictionarySheet from '../../components/reader/DictionarySheet';
import SettingsSheet from '../../components/reader/SettingsSheet';
import { buildVocabIndex, segmentText } from '../../lib/vocabHighlight';
import {
  READER_THEMES, FONT_FAMILY_MAP, FONT_SIZE_MAP, LINE_HEIGHT_MAP,
} from '../../lib/readerConstants';

// ── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  appBg: '#F9F7F2',
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  offlineBg: '#FFF8E1',
  offlineText: '#7A5200',
};

// ── Vocab highlight styles ────────────────────────────────────────────────────
const HIGHLIGHT = {
  word: { backgroundColor: 'rgba(253, 230, 138, 0.6)', color: '#78350f', borderRadius: 3 },
  kanji: { backgroundColor: 'rgba(186, 230, 253, 0.6)', color: '#0c4a6e', borderRadius: 3 },
  'word-and-kanji': {
    backgroundColor: 'rgba(253, 230, 138, 0.6)', color: '#78350f', borderRadius: 3,
    textDecorationLine: 'underline', textDecorationColor: '#0ea5e9',
  },
};

const SCRIPT_MODES = [
  { value: 'kanji',    label: '漢字' },
  { value: 'hiragana', label: 'ひらがな' },
  { value: 'katakana', label: 'カタカナ' },
  { value: 'romaji',   label: 'Romaji' },
  { value: 'english',  label: 'EN' },
];

// ── Pure helpers ─────────────────────────────────────────────────────────────

function getSentenceText(sentence, scriptMode) {
  const isJaSrc = sentence.source_language === 'ja';
  switch (scriptMode) {
    case 'kanji':    return sentence.japanese_kanji    || (isJaSrc ? '' : sentence.english);
    case 'hiragana': return sentence.japanese_hiragana || sentence.japanese_kanji || (isJaSrc ? '' : sentence.english);
    case 'katakana': return sentence.japanese_katakana || sentence.japanese_kanji || (isJaSrc ? '' : sentence.english);
    case 'romaji':   return sentence.japanese_romaji   || (isJaSrc ? '' : sentence.english);
    default:         return sentence.english;
  }
}

function getSecondaryText(sentence, secondaryLayer) {
  switch (secondaryLayer) {
    case 'furigana': return sentence.japanese_hiragana || null;
    case 'kanji':    return sentence.japanese_kanji    || null;
    case 'english':  return sentence.english           || null;
    default:         return null;
  }
}

function isTranslationPending(sentence, scriptMode) {
  const isJaSrc = sentence.source_language === 'ja';
  if (isJaSrc) {
    return scriptMode === 'english'
      && (!sentence.english || sentence.english === '(English translation pending)');
  }
  return sentence.translation_status !== 'completed' && scriptMode !== 'english';
}

function getSecondaryOptions(scriptMode) {
  const none = { value: 'none', label: 'None' };
  switch (scriptMode) {
    case 'kanji':
      return [none, { value: 'furigana', label: 'Furigana' }, { value: 'english', label: 'English' }];
    case 'hiragana':
      return [none, { value: 'kanji', label: 'Kanji' }, { value: 'english', label: 'English' }];
    case 'katakana':
      return [none, { value: 'kanji', label: 'Kanji' }, { value: 'furigana', label: 'Furigana' }, { value: 'english', label: 'English' }];
    case 'romaji':
      return [none, { value: 'kanji', label: 'Kanji' }, { value: 'english', label: 'English' }];
    case 'english':
      return [none, { value: 'kanji', label: 'Japanese (Kanji)' }, { value: 'furigana', label: 'Japanese (Hiragana)' }];
    default:
      return [none];
  }
}

// ── SentenceItem ─────────────────────────────────────────────────────────────

const SentenceItem = React.memo(function SentenceItem({
  sentence, scriptMode, secondaryLayer, showSecondaryText,
  themeText, themeMuted, themeBorder,
  fontFamily, fontSizePx, lineHeightMult,
  tokenCacheRef, onGetTokens,
  onTokenPress,
  vocabIndex,
  showWordHighlights,
  showKanjiHighlights,
}) {
  const [tokens, setTokens] = useState(null);

  const mainText = getSentenceText(sentence, scriptMode);
  const secondaryText = getSecondaryText(sentence, secondaryLayer);
  const isJaScript = scriptMode !== 'english' && scriptMode !== 'romaji';

  const pending = isTranslationPending(sentence, scriptMode);

  const showSecondary = secondaryLayer !== 'none'
    && showSecondaryText
    && !!secondaryText
    && (secondaryLayer === 'english' || sentence.translation_status === 'completed');

  useEffect(() => {
    if (!isJaScript || !mainText) return;
    let cancelled = false;
    const sid = sentence.id;
    if (tokenCacheRef.current[sid]) {
      setTokens(tokenCacheRef.current[sid]);
      return;
    }
    onGetTokens(sid, mainText).then(result => {
      if (!cancelled) setTokens(result);
    });
    return () => { cancelled = true; };
  }, [sentence.id, mainText, isJaScript]);

  const charTypeMap = useMemo(() => {
    if (!isJaScript || !mainText || !vocabIndex) return null;
    if (!showWordHighlights && !showKanjiHighlights) return null;
    if (vocabIndex.formEntries.length === 0 && vocabIndex.kanjiSet.size === 0) return null;
    const segs = segmentText(mainText, vocabIndex, {
      showWords: showWordHighlights,
      showKanji: showKanjiHighlights,
    });
    const map = [];
    for (const seg of segs) {
      for (let j = 0; j < seg.text.length; j++) map.push(seg.type);
    }
    return map;
  }, [isJaScript, mainText, vocabIndex, showWordHighlights, showKanjiHighlights]);

  const textStyle = {
    color: themeText,
    fontFamily,
    fontSize: fontSizePx,
    lineHeight: fontSizePx * lineHeightMult,
  };

  const renderTokens = () => {
    let charPos = 0;
    return tokens.map((token, i) => {
      const type = charTypeMap ? (charTypeMap[charPos] || 'normal') : 'normal';
      charPos += token.surface.length;
      return (
        <Text
          key={i}
          suppressHighlighting
          onPress={onTokenPress ? () => onTokenPress(token.surface, token.pos, mainText) : undefined}
          style={type !== 'normal' ? HIGHLIGHT[type] : undefined}
        >
          {token.surface}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.sentenceBlock, pending && styles.sentencePending]}>
      <Text style={[styles.sentenceText, textStyle]}>
        {isJaScript && tokens ? renderTokens() : mainText}
      </Text>
      {showSecondary && (
        <Text
          style={[
            styles.secondaryText,
            {
              color: themeMuted,
              fontFamily: secondaryLayer === 'english' ? 'Georgia' : fontFamily,
              fontSize: fontSizePx * 0.72,
              lineHeight: fontSizePx * 0.72 * 1.5,
            },
          ]}
        >
          {secondaryText}
        </Text>
      )}
    </View>
  );
});

// ── ReaderScreen ─────────────────────────────────────────────────────────────

export default function ReaderScreen({ navigation, route }) {
  const { bookId, bookTitle: initialTitle } = route.params || {};
  const isOnline = useIsOnline();

  const [fontsLoaded] = useFonts({
    'NotoSerifJP': NotoSerifJP_400Regular,
    'NotoSerifJP-Bold': NotoSerifJP_700Bold,
  });

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [savedWords, setSavedWords] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offlineOnly, setOfflineOnly] = useState(false); // opened from cache, no network

  const [sentences, setSentences] = useState([]);
  const [totalSentences, setTotalSentences] = useState(0);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sentencesLoading, setSentencesLoading] = useState(false);

  const [dictOpen, setDictOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [wordPos, setWordPos] = useState('');
  const [contextSentence, setContextSentence] = useState('');

  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [readerTheme, setReaderTheme] = useState('default');
  const [fontFamily, setFontFamily] = useState('noto-serif');
  const [fontSize, setFontSize] = useState('lg');
  const [lineHeight, setLineHeight] = useState('relaxed');
  const [scriptMode, setScriptMode] = useState('kanji');
  const [secondaryLayer, setSecondaryLayer] = useState('none');
  const [showSecondaryText, setShowSecondaryText] = useState(true);
  const [showWordHighlights, setShowWordHighlights] = useState(true);
  const [showKanjiHighlights, setShowKanjiHighlights] = useState(true);
  const [sentencesPerPage, setSentencesPerPage] = useState(50);

  const activeTheme = READER_THEMES.find(t => t.value === readerTheme) || READER_THEMES[0];
  const activeFontFamily = FONT_FAMILY_MAP[fontFamily] || 'NotoSerifJP';
  const fontSizePx = FONT_SIZE_MAP[fontSize] || 20;
  const lineHeightMult = LINE_HEIGHT_MAP[lineHeight] || 1.8;
  const secondaryOptions = getSecondaryOptions(scriptMode);

  const tokenCacheRef = useRef({});
  const flatListRef = useRef(null);
  const resumeSentenceIdRef = useRef(null);

  const vocabIndex = useMemo(() => buildVocabIndex(savedWords), [savedWords]);

  // ── Book + initial chapter ────────────────────────────────────────────────
  const fetchBookData = useCallback(async () => {
    if (!bookId) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    setOfflineOnly(false);

    try {
      const [bookRes, chaptersRes, vocabRes, bookmarksRes, progressRes] = await Promise.all([
        getBook(bookId),
        getChapters(bookId),
        getVocabulary(),
        getBookmarks(),
        getBookProgress(bookId).catch(() => ({ data: null })),
      ]);
      setBook(bookRes.data);
      setChapters(chaptersRes.data);

      const vocab = vocabRes.data;
      setSavedWords(vocab);
      storeVocab(vocab); // keep vocab cache fresh for next offline session

      setBookmarks(bookmarksRes.data.filter(b => b.book_id === bookId));

      const chapterList = chaptersRes.data;
      const progress = progressRes?.data;
      const savedChapter = progress?.chapter_id
        ? chapterList.find(c => c.id === progress.chapter_id)
        : null;
      if (chapterList.length > 0) setCurrentChapter(savedChapter || chapterList[0]);
      if (progress?.sentence_id) resumeSentenceIdRef.current = progress.sentence_id;
    } catch {
      // Network unavailable — try offline cache
      const [cachedMeta, cachedChapters, cachedVocab] = await Promise.all([
        getCachedBookMeta(bookId),
        getCachedBookChapters(bookId),
        getCachedVocab(),
      ]);

      if (cachedMeta && cachedChapters) {
        setBook(cachedMeta);
        setChapters(cachedChapters);
        setSavedWords(cachedVocab || []);
        setBookmarks([]);
        setOfflineOnly(true);

        const progress = await getCachedBookProgress(bookId);
        const savedChapter = progress?.chapter_id
          ? cachedChapters.find(c => c.id === progress.chapter_id)
          : null;
        if (cachedChapters.length > 0) setCurrentChapter(savedChapter || cachedChapters[0]);
        if (progress?.sentence_id) resumeSentenceIdRef.current = progress.sentence_id;
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { fetchBookData(); }, [fetchBookData]);

  // ── Load sentences for a chapter ─────────────────────────────────────────
  // Always tries the API first. If that fails (network down), serves from the
  // downloaded sentence cache. Works the same whether the book has one large
  // chapter or many small ones — the cache stores all sentences per chapter.
  const loadChapterSentences = useCallback(async (chapId) => {
    setSentencesLoading(true);
    setSentences([]);
    setHasMore(false);
    setTotalSentences(0);
    setTranslatedCount(0);
    try {
      const [countRes, sentencesRes] = await Promise.all([
        getSentencesCount(chapId),
        getSentences(chapId, 0, sentencesPerPage),
      ]);
      const total = countRes.data.count;
      setTotalSentences(total);
      setTranslatedCount(countRes.data.translated || 0);
      setSentences(sentencesRes.data);
      setHasMore(sentencesRes.data.length < total);

      triggerTranslation(chapId, 1).catch(() => {});

      if (sentencesRes.data.length > 0) {
        const progressPayload = {
          book_id: bookId,
          chapter_id: chapId,
          sentence_id: sentencesRes.data[0].id,
          words_read: sentencesRes.data.length * 5,
        };
        updateProgress(progressPayload)
          .then(() => storeBookProgress(bookId, { chapter_id: chapId, sentence_id: sentencesRes.data[0].id }))
          .catch(() => {
            enqueue('updateProgress', progressPayload);
            storeBookProgress(bookId, { chapter_id: chapId, sentence_id: sentencesRes.data[0].id });
          });
      }

      const resumeId = resumeSentenceIdRef.current;
      if (resumeId) {
        resumeSentenceIdRef.current = null;
        const idx = sentencesRes.data.findIndex(s => s.id === resumeId);
        if (idx > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0 });
          }, 250);
        }
      }
    } catch {
      // Fall back to downloaded cache for this chapter
      const cached = await getCachedChapterSentences(chapId);
      if (cached && cached.length > 0) {
        setSentences(cached);
        setTotalSentences(cached.length);
        setHasMore(false); // all sentences are in the cache; no pagination needed
        setTranslatedCount(cached.filter(s => s.translation_status === 'completed').length);

        const resumeId = resumeSentenceIdRef.current;
        if (resumeId) {
          resumeSentenceIdRef.current = null;
          const idx = cached.findIndex(s => s.id === resumeId);
          if (idx > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0 });
            }, 250);
          }
        }
      }
    } finally {
      setSentencesLoading(false);
    }
  }, [bookId, sentencesPerPage]);

  // ── Paginate ─────────────────────────────────────────────────────────────
  const loadMoreSentences = useCallback(async () => {
    if (!currentChapter || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getSentences(currentChapter.id, sentences.length, sentencesPerPage);
      setSentences(prev => {
        const next = [...prev, ...res.data];
        setHasMore(next.length < totalSentences);
        return next;
      });
      triggerTranslation(currentChapter.id, sentences.length + res.data.length).catch(() => {});
      if (res.data.length > 0) {
        const last = res.data[res.data.length - 1];
        const progressPayload = {
          book_id: bookId,
          chapter_id: currentChapter.id,
          sentence_id: last.id,
          words_read: res.data.length * 5,
        };
        updateProgress(progressPayload)
          .then(() => storeBookProgress(bookId, { chapter_id: currentChapter.id, sentence_id: last.id }))
          .catch(() => {
            enqueue('updateProgress', progressPayload);
            storeBookProgress(bookId, { chapter_id: currentChapter.id, sentence_id: last.id });
          });
      }
    } catch {}
    finally { setLoadingMore(false); }
  }, [currentChapter, loadingMore, hasMore, sentences.length, totalSentences, bookId, sentencesPerPage]);

  // ── Per-sentence tokenization (in-memory cache, session only) ────────────
  const onGetTokens = useCallback(async (sentenceId, text) => {
    if (tokenCacheRef.current[sentenceId]) return tokenCacheRef.current[sentenceId];
    try {
      const res = await tokenize(text);
      const tokens = res.data.tokens || [];
      tokenCacheRef.current[sentenceId] = tokens;
      return tokens;
    } catch {
      // Tokenize API unavailable (offline or error) — fall back to whole-text token
      const fallback = [{ surface: text, reading: '', pos: '' }];
      tokenCacheRef.current[sentenceId] = fallback;
      return fallback;
    }
  }, []);

  // ── Chapter selection ─────────────────────────────────────────────────────
  const handleChapterSelect = useCallback((chapter) => {
    setCurrentChapter(chapter);
    setTocOpen(false);
  }, []);

  const handleScriptModeChange = useCallback((mode) => {
    setScriptMode(mode);
    const validValues = getSecondaryOptions(mode).map(o => o.value);
    setSecondaryLayer(prev => validValues.includes(prev) ? prev : 'none');
  }, []);

  const handleTokenPress = useCallback((surface, pos, sentenceText) => {
    setSelectedWord(surface);
    setWordPos(pos || '');
    setContextSentence(sentenceText || '');
    setDictOpen(true);
  }, []);

  const handleCloseDict = useCallback(() => setDictOpen(false), []);

  const handleWordSaved = useCallback((savedWord) => {
    setSavedWords(prev => [...prev, savedWord]);
  }, []);

  useEffect(() => {
    if (currentChapter?.id) loadChapterSentences(currentChapter.id);
  }, [currentChapter?.id]);

  // ── Poll for in-progress translations (online only) ───────────────────────
  useEffect(() => {
    if (offlineOnly) return; // cached sentences won't be updated by the server
    if (scriptMode === 'english' || !currentChapter || sentences.length === 0) return;
    const needsTranslation = sentences.some(s => s.translation_status !== 'completed');
    if (!needsTranslation) return;

    const interval = setInterval(async () => {
      try {
        const res = await getSentences(currentChapter.id, 0, sentences.length);
        setSentences(res.data);
        setTranslatedCount(res.data.filter(s => s.translation_status === 'completed').length);
        if (res.data.every(s => s.translation_status === 'completed')) clearInterval(interval);
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [scriptMode, currentChapter, sentences.length, offlineOnly]);

  // ── Shared back bar ───────────────────────────────────────────────────────
  const BackBar = () => (
    <View style={[styles.topBar, { borderBottomColor: C.border }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={22} color={C.primary} />
        <Text style={styles.backText}>My Books</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading || !fontsLoaded) {
    return (
      <SafeAreaView style={[styles.shell, { backgroundColor: C.appBg }]} edges={['top']}>
        <BackBar />
        <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    const notDownloaded = !isOnline;
    return (
      <SafeAreaView style={[styles.shell, { backgroundColor: C.appBg }]} edges={['top']}>
        <BackBar />
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>
            {notDownloaded
              ? "This book isn't available offline"
              : "Couldn't load book"}
          </Text>
          <Text style={styles.errorBody}>
            {notDownloaded
              ? 'Download it from your library while connected to read offline.'
              : ''}
          </Text>
          {!notDownloaded && (
            <TouchableOpacity onPress={fetchBookData} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const chapterLabel = currentChapter
    ? `Ch. ${currentChapter.chapter_number} · ${currentChapter.title_jp || currentChapter.title}`
    : '';

  const currentChapterIndex = chapters.findIndex(c => c.id === currentChapter?.id);

  const chapterHeader = (
    <View style={styles.chapterHeader}>
      <Text style={[styles.chapterTitle, { color: activeTheme.text }]}>
        {currentChapter?.title_jp || currentChapter?.title || ''}
      </Text>
      {currentChapter?.title_jp && currentChapter.title !== currentChapter.title_jp && (
        <Text style={[styles.chapterTitleEn, { color: activeTheme.muted }]}>
          {currentChapter.title}
        </Text>
      )}
      <Text style={[styles.chapterMeta, { color: activeTheme.muted }]}>
        {`Chapter ${currentChapter?.chapter_number}`}
        {totalSentences > 0 ? `  ·  ${sentences.length} / ${totalSentences} sentences` : ''}
      </Text>
      {translatedCount < totalSentences && totalSentences > 0 && (
        <Text style={styles.translationBadge}>
          {book?.book_language === 'ja' ? 'EN' : 'JP'} translation {translatedCount}/{totalSentences}
        </Text>
      )}
    </View>
  );

  const chapterFooter = (
    <View style={styles.chapterFooter}>
      {hasMore ? (
        loadingMore ? (
          <View style={styles.loadingMoreRow}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : null
      ) : (
        <>
          <View style={[styles.chapterFooterDivider, { borderTopColor: activeTheme.border }]} />
          <View style={styles.chapterNav}>
            <TouchableOpacity
              onPress={() => currentChapterIndex > 0 && handleChapterSelect(chapters[currentChapterIndex - 1])}
              disabled={currentChapterIndex <= 0}
              style={[styles.chapterNavBtn, currentChapterIndex <= 0 && styles.chapterNavBtnDisabled]}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={16} color={currentChapterIndex > 0 ? activeTheme.text : activeTheme.muted} />
              <Text style={[styles.chapterNavText, { color: currentChapterIndex > 0 ? activeTheme.text : activeTheme.muted }]}>
                Previous
              </Text>
            </TouchableOpacity>
            <Text style={[styles.chapterNavLabel, { color: activeTheme.muted }]}>
              {currentChapterIndex + 1} / {chapters.length}
            </Text>
            <TouchableOpacity
              onPress={() => currentChapterIndex < chapters.length - 1 && handleChapterSelect(chapters[currentChapterIndex + 1])}
              disabled={currentChapterIndex >= chapters.length - 1}
              style={[styles.chapterNavBtn, currentChapterIndex >= chapters.length - 1 && styles.chapterNavBtnDisabled]}
              activeOpacity={0.6}
            >
              <Text style={[styles.chapterNavText, { color: currentChapterIndex < chapters.length - 1 ? activeTheme.text : activeTheme.muted }]}>
                Next
              </Text>
              <Ionicons name="chevron-forward" size={16} color={currentChapterIndex < chapters.length - 1 ? activeTheme.text : activeTheme.muted} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: activeTheme.bg }]} edges={['top']}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: activeTheme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={styles.backText}>My Books</Text>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.bookTitleText, { color: activeTheme.text }]} numberOfLines={1}>
            {book?.title_jp || book?.title || initialTitle}
          </Text>
          <Text style={[styles.chapterLabelText, { color: activeTheme.muted }]} numberOfLines={1}>
            {chapterLabel}
          </Text>
        </View>

        <View style={styles.topBarRight}>
          {/* Subtle offline indicator */}
          {!isOnline && (
            <Ionicons name="cloud-offline-outline" size={16} color={activeTheme.muted} />
          )}
          <TouchableOpacity
            onPress={() => setTocOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconButton}
          >
            <Ionicons name="list-outline" size={22} color={activeTheme.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSettingsOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={21} color={activeTheme.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Script toggle bar ── */}
      <View style={[styles.scriptBar, { borderBottomColor: activeTheme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scriptChipsRow}
        >
          {SCRIPT_MODES.map(mode => {
            const active = mode.value === scriptMode;
            return (
              <TouchableOpacity
                key={mode.value}
                onPress={() => handleScriptModeChange(mode.value)}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: C.primary, borderColor: C.primary }
                    : { backgroundColor: 'transparent', borderColor: activeTheme.border },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : activeTheme.muted }]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.secondaryRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryChipsRow}
          >
            {secondaryOptions.map(opt => {
              const active = opt.value === secondaryLayer;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSecondaryLayer(opt.value)}
                  style={[
                    styles.chipSm,
                    active
                      ? { backgroundColor: activeTheme.muted, borderColor: activeTheme.muted }
                      : { backgroundColor: 'transparent', borderColor: activeTheme.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipSmText, { color: active ? activeTheme.bg : activeTheme.muted }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {secondaryLayer !== 'none' && (
            <TouchableOpacity
              onPress={() => setShowSecondaryText(v => !v)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showSecondaryText ? 'eye-outline' : 'eye-off-outline'}
                size={17}
                color={activeTheme.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sentence list ── */}
      <FlatList
        ref={flatListRef}
        data={sentences}
        keyExtractor={item => item.id}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          flatListRef.current?.scrollToOffset({
            offset: index * averageItemLength,
            animated: false,
          });
        }}
        renderItem={({ item }) => (
          <SentenceItem
            sentence={item}
            scriptMode={scriptMode}
            secondaryLayer={secondaryLayer}
            showSecondaryText={showSecondaryText}
            themeText={activeTheme.text}
            themeMuted={activeTheme.muted}
            themeBorder={activeTheme.border}
            fontFamily={activeFontFamily}
            fontSizePx={fontSizePx}
            lineHeightMult={lineHeightMult}
            tokenCacheRef={tokenCacheRef}
            onGetTokens={onGetTokens}
            onTokenPress={handleTokenPress}
            vocabIndex={vocabIndex}
            showWordHighlights={showWordHighlights}
            showKanjiHighlights={showKanjiHighlights}
          />
        )}
        ListHeaderComponent={chapterHeader}
        ListFooterComponent={chapterFooter}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            {sentencesLoading
              ? <ActivityIndicator size="large" color={C.primary} />
              : <Text style={[styles.emptyListText, { color: activeTheme.muted }]}>No sentences found</Text>
            }
          </View>
        }
        onEndReached={loadMoreSentences}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        initialNumToRender={20}
        windowSize={5}
        contentContainerStyle={[styles.listContent, { backgroundColor: activeTheme.bg }]}
        style={{ backgroundColor: activeTheme.bg }}
      />

      {/* ── TOC modal ── */}
      <Modal
        visible={tocOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTocOpen(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chapters</Text>
            <TouchableOpacity onPress={() => setTocOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {chapters.map((chapter) => {
              const isCurrent = chapter.id === currentChapter?.id;
              return (
                <TouchableOpacity
                  key={chapter.id}
                  onPress={() => handleChapterSelect(chapter)}
                  style={[styles.tocRow, isCurrent && styles.tocRowActive]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.tocNum, isCurrent && { color: C.primary }]}>
                    {chapter.chapter_number}.
                  </Text>
                  <Text style={[styles.tocTitle, isCurrent && styles.tocTitleActive]} numberOfLines={2}>
                    {chapter.title_jp || chapter.title}
                  </Text>
                  {isCurrent && <Ionicons name="checkmark" size={18} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Dictionary bottom sheet ── */}
      <DictionarySheet
        visible={dictOpen}
        word={selectedWord}
        pos={wordPos}
        contextSentence={contextSentence}
        savedWords={savedWords}
        onClose={handleCloseDict}
        onWordSaved={handleWordSaved}
      />

      {/* ── Settings sheet ── */}
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        readerTheme={readerTheme}
        onThemeChange={setReaderTheme}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
        showWordHighlights={showWordHighlights}
        onToggleWordHighlights={() => setShowWordHighlights(v => !v)}
        showKanjiHighlights={showKanjiHighlights}
        onToggleKanjiHighlights={() => setShowKanjiHighlights(v => !v)}
        sentencesPerPage={sentencesPerPage}
        onSentencesPerPageChange={setSentencesPerPage}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 6,
  },
  backText: { fontSize: 16, color: C.primary, fontWeight: '500' },
  titleBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  bookTitleText: { fontSize: 13, fontWeight: '600' },
  chapterLabelText: { fontSize: 11, marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconButton: { padding: 8 },

  scriptBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 8, paddingBottom: 6,
  },
  scriptChipsRow: { paddingHorizontal: 12, gap: 6 },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  secondaryChipsRow: { paddingHorizontal: 12, gap: 5 },
  eyeButton: { paddingHorizontal: 10, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500', fontFamily: 'NotoSerifJP' },
  chipSm: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5, borderWidth: 1 },
  chipSmText: { fontSize: 11, fontWeight: '500', fontFamily: 'NotoSerifJP' },

  listContent: { paddingBottom: 64 },
  chapterHeader: {
    paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20, alignItems: 'center',
  },
  chapterTitle: {
    fontFamily: 'Georgia', fontSize: 24, fontWeight: '700',
    textAlign: 'center', marginBottom: 4, lineHeight: 32,
  },
  chapterTitleEn: { fontSize: 15, textAlign: 'center', marginBottom: 4 },
  chapterMeta: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  translationBadge: { fontSize: 11, color: C.primary, marginTop: 4, textAlign: 'center' },

  sentenceBlock: { paddingHorizontal: 20, paddingBottom: 24 },
  sentencePending: { opacity: 0.6 },
  sentenceText: {},
  secondaryText: { marginTop: 4 },

  emptyList: { paddingVertical: 60, alignItems: 'center' },
  emptyListText: { fontSize: 14 },
  loadingMoreRow: { paddingVertical: 24, alignItems: 'center' },

  chapterFooter: { paddingBottom: 32 },
  chapterFooterDivider: {
    marginHorizontal: 20, marginTop: 24, marginBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chapterNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
  },
  chapterNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  chapterNavBtnDisabled: { opacity: 0.35 },
  chapterNavText: { fontSize: 15, fontWeight: '500' },
  chapterNavLabel: { fontSize: 13 },

  errorTitle: {
    fontFamily: 'Georgia', fontSize: 18, color: C.textPrimary,
    marginBottom: 8, textAlign: 'center', paddingHorizontal: 32,
  },
  errorBody: {
    fontSize: 14, color: C.textMuted, textAlign: 'center',
    paddingHorizontal: 32, lineHeight: 20, marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: C.primary,
  },
  retryText: { fontSize: 15, color: C.primary, fontWeight: '500' },

  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  modalTitle: {
    fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: C.textPrimary,
  },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingBottom: 32 },
  tocRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    gap: 10,
  },
  tocRowActive: { backgroundColor: 'rgba(211,56,47,0.04)' },
  tocNum: { fontSize: 14, fontWeight: '600', color: C.textMuted, width: 28, flexShrink: 0 },
  tocTitle: { flex: 1, fontSize: 15, color: C.textSecondary, lineHeight: 20 },
  tocTitleActive: { color: C.textPrimary, fontWeight: '600' },
});
