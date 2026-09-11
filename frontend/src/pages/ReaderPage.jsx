import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Bookmark,
  BookmarkCheck,
  List,
  Moon,
  Sun,
  Loader2,
  Home,
  ChevronDown,
  Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import ScriptToggle from '@/components/reader/ScriptToggle';
import SecondaryScriptToggle from '@/components/reader/SecondaryScriptToggle';
import HighlightedText from '@/components/reader/HighlightedText';
import DictionaryPopup from '@/components/reader/DictionaryPopup';
import ReaderCustomizationPanel, {
  READER_THEMES,
  FONT_OPTIONS,
  FONT_SIZE_STEPS,
} from '@/components/reader/ReaderCustomizationPanel';
import ZenzeiiChat from '@/components/reader/ZenzeiiChat';
import { buildVocabIndex } from '@/lib/vocabHighlight';
import { useTheme } from '@/contexts/ThemeContext';
import { useToshokanGate } from '@/features/toshokan/context/ToshokanGateContext';
import { TOSHOKAN_GATE } from '@/features/toshokan/constants/toshokanGates';
import { AudioGateModal } from '@/features/audio/components/gates/AudioGateModal';
import { AudioToolbarButton } from '@/features/audio/components/reader/AudioToolbarButton';
import { ReaderAudioBar } from '@/features/audio/components/reader/ReaderAudioBar';
import { AudioLowBalancePill } from '@/features/audio/components/player/AudioLowBalancePill';
import { AUDIO_GATE, getAudioAccessState, isLowBalance } from '@/features/audio/constants/audioGateTypes';
import {
  getBook,
  getChapters,
  getSentences,
  getSentencesCount,
  lookupWord,
  getVocabulary,
  createBookmark,
  getBookmarks,
  deleteBookmark,
  updateProgress,
  triggerTranslation,
  getAudioBalance,
  getChapterAudio,
  getCachedChapters,
  getAiUsage,
  translateNextChunk,
} from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AUDIO_ENABLED = true;

const DEFAULT_SENTENCES_PER_PAGE = 50;

const TokenizedSentence = ({ text, sentenceId, onWordClick, tokenCache, getTokens, showFurigana, highlightedSentenceId, highlightedWordIndex }) => {
  const hasKanji = (str) => /[一-龯㐀-䶿]/.test(str);
  const [tokens, setTokens] = React.useState(null);

  React.useEffect(() => {
    const cacheKey = `${sentenceId}:${text}`;
    if (tokenCache[cacheKey]) {
      setTokens(tokenCache[cacheKey]);
    } else {
      getTokens(sentenceId, text).then(setTokens);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceId, text]);

  if (!tokens) return <span>{text}</span>;

  return (
    <>
      {(() => {
        let charOffset = 0;
        return tokens.map((token, i) => {
          const tokenStart = charOffset;
          charOffset += token.surface.length;
          const isHighlighted =
            highlightedSentenceId === sentenceId &&
            highlightedWordIndex >= tokenStart &&
            highlightedWordIndex < charOffset;

          const highlightStyle = isHighlighted ? {
            backgroundColor: 'hsl(var(--primary) / 0.3)',
            borderRadius: '3px',
          } : {};

          return showFurigana && hasKanji(token.surface) && token.reading && token.reading !== token.surface ? (
            <ruby
              key={i}
              className="reader-word cursor-pointer hover:bg-primary/10 rounded px-0.5"
              style={{ rubyPosition: 'under', ...highlightStyle }}
              onClick={(e) => {
                e.stopPropagation();
                onWordClick(token.surface, token.pos, e);
              }}
            >
              {token.surface}
              <rt style={{ fontSize: '0.55em', color: 'hsl(var(--muted-foreground))' }}>
                {token.reading}
              </rt>
            </ruby>
          ) : (
            <span
              key={i}
              className="reader-word cursor-pointer hover:bg-primary/10 rounded px-0.5"
              style={highlightStyle}
              onClick={(e) => {
                e.stopPropagation();
                onWordClick(token.surface, token.pos, e);
              }}
            >
              {token.surface}
            </span>
          );
        });
      })()}
    </>
  );
};

export const ReaderPage = () => {
  const { bookId, chapterId } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme, readerSettings, updateReaderSettings } = useTheme();
  const { openGate } = useToshokanGate();
  const sentinelRef = useRef(null);
  const touchStartX = useRef(null);
  const translateChunkInFlight = useRef(false);
  const translateTriggerRef = useRef(null);

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [totalSentences, setTotalSentences] = useState(0);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedWords, setSavedWords] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [audioMode, setAudioMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioBalanceData, setAudioBalanceData] = useState(null);
  const [cachedChapterIds, setCachedChapterIds] = useState(new Set());
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const [audioBarHeight, setAudioBarHeight] = useState(0);
  const [showAudioPrompt, setShowAudioPrompt] = useState(null); // null | AUDIO_GATE.TASTER | AUDIO_GATE.PURCHASE
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState(null);
  const audioRef = useRef(null);
  const audioBarObserverRef = useRef(null);

  // Dev-only visual-QA harness (Visual Recovery brief §I) — forces one
  // console/modal state for screenshotting without a real low/zero balance
  // account. Reads ?audioDebugState=idle|generating|playback|low-balance|taster|purchase
  // from the URL. The whole branch is dead-code-eliminated from production
  // bundles (process.env.NODE_ENV is inlined at build time), makes no
  // network/Stripe calls, and never writes to audioBalanceData — real
  // entitlement state is untouched, this only overrides what's rendered.
  const debugAudioState = process.env.NODE_ENV !== 'production'
    ? new URLSearchParams(window.location.search).get('audioDebugState')
    : null;

  // Dictionary popup state
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordData, setWordData] = useState(null);
  const [wordPos, setWordPos] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [lookingUp, setLookingUp] = useState(false);
  const [contextSentence, setContextSentence] = useState('');

  // Settings
  const [fontSize, setFontSize] = useState(readerSettings.fontSize || 'lg');
  const [lineHeight, setLineHeight] = useState(readerSettings.lineHeight || 'relaxed');
  const [scriptMode, setScriptMode] = useState(readerSettings.scriptMode || 'kanji');
  const [secondaryLayer, setSecondaryLayer] = useState(readerSettings.secondaryLayer || 'none');
  const [showSecondaryText, setShowSecondaryText] = useState(true);
  const [showWordHighlights, setShowWordHighlights] = useState(false);
  const [showKanjiHighlights, setShowKanjiHighlights] = useState(false);
  const [zenzeiiOpen, setZenzeiiOpen] = useState(false);
  const [aiUsage, setAiUsage] = useState(null);
  const [verticalMode, setVerticalMode] = useState(false);
  const [tokenCache, setTokenCache] = useState({});

  // Customization settings
  const [readerTheme, setReaderTheme] = useState(readerSettings.readerTheme || 'default');
  const [fontFamily, setFontFamily] = useState(readerSettings.fontFamily || 'noto-serif');
  const [sentencesPerPage, setSentencesPerPage] = useState(
    readerSettings.sentencesPerPage || DEFAULT_SENTENCES_PER_PAGE
  );

  // Rebuild vocab lookup index only when savedWords changes
  const vocabIndex = useMemo(() => buildVocabIndex(savedWords), [savedWords]);

  // Index of the sentence at which to place the lazy-translation trigger sentinel.
  // Positions it ~200 words before the first "not_requested" sentence so the request
  // fires while the user still has translated content ahead of them.
  const translateTriggerIndex = useMemo(() => {
    const watermark = sentences.findIndex(s => s.translation_status === 'not_requested');
    if (watermark <= 0) return null;
    let words = 0;
    for (let i = watermark - 1; i >= 0; i--) {
      words += (sentences[i].english || '').split(/\s+/).filter(Boolean).length;
      if (words >= 200) return i;
    }
    return 0;
  }, [sentences]);

  // Update savedWords immediately when a word is saved from the popup
  const handleWordSaved = useCallback((wordData) => {
    setSavedWords(prev => [...prev, wordData]);
  }, []);

  const handleAiUsed = useCallback(() => {
    setAiUsage(prev => prev && prev.ai_messages_remaining !== null ? {
      ...prev,
      ai_messages_today: prev.ai_messages_today + 1,
      ai_messages_remaining: Math.max(0, prev.ai_messages_remaining - 1),
    } : prev);
  }, []);

  const handleAiLimitReached = useCallback(() => {
    setAiUsage(prev => prev ? { ...prev, ai_messages_remaining: 0 } : prev);
    openGate(TOSHOKAN_GATE.ASK_ZENZEII_LIMIT);
  }, [openGate]);

  useEffect(() => {
    fetchBookData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  useEffect(() => {
    if (chapterId && chapters.length > 0) {
      const chapter = chapters.find(c => c.id === chapterId);
      if (chapter) {
        setCurrentChapter(chapter);
        loadChapterSentences(chapterId, true);
      }
    } else if (chapters.length > 0 && !chapterId) {
      const firstChapter = chapters[0];
      setCurrentChapter(firstChapter);
      navigate(`/read/${bookId}/${firstChapter.id}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, chapters, bookId, navigate]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreSentences();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, sentences.length]);

  // Lazy-translation trigger: when the user scrolls within ~200 words of the
  // not_requested boundary, silently request the next chunk from the backend.
  useEffect(() => {
    if (translateTriggerIndex === null || !currentChapter || !translateTriggerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || translateChunkInFlight.current) return;
      translateChunkInFlight.current = true;
      translateNextChunk(currentChapter.id)
        .catch(() => {})
        .finally(() => { translateChunkInFlight.current = false; });
    }, { threshold: 0.1 });

    observer.observe(translateTriggerRef.current);
    return () => observer.disconnect();
  }, [translateTriggerIndex, currentChapter]);

  // Poll for translation updates when in Japanese mode
  useEffect(() => {
    if (scriptMode === 'english' || !currentChapter) return;
    
    // Check if any sentences need translation
    const needsTranslation = sentences.some(s => s.translation_status !== 'completed');
    if (!needsTranslation) return;

    const interval = setInterval(async () => {
      try {
        // Reload sentences to get updated translations
        const res = await getSentences(currentChapter.id, 0, sentences.length || sentencesPerPage);
        setSentences(res.data);
        
        // Check if all translated now
        const stillPending = res.data.some(s => s.translation_status !== 'completed');
        if (!stillPending) {
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Failed to refresh sentences:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptMode, currentChapter, sentences.length]);

  const fetchBookData = async () => {
    setLoading(true);
    try {
      const [bookRes, chaptersRes, vocabRes, bookmarksRes, cachedAudioRes, aiUsageRes] = await Promise.all([
        getBook(bookId),
        getChapters(bookId),
        getVocabulary(),
        getBookmarks(),
        getCachedChapters(bookId).catch(() => ({ data: { cached_chapter_ids: [] } })),
        getAiUsage().catch(() => null),
      ]);
      setBook(bookRes.data);
      setChapters(chaptersRes.data);
      setSavedWords(vocabRes.data);
      setBookmarks(bookmarksRes.data.filter(b => b.book_id === bookId));
      setCachedChapterIds(new Set(cachedAudioRes.data.cached_chapter_ids));
      if (aiUsageRes) setAiUsage(aiUsageRes.data);
      
      // Set default script mode based on book language
      // Japanese source books should default to showing Japanese (kanji)
      // English source books can default to kanji to learn Japanese translations
      const bookLang = bookRes.data.book_language || 'en';
      if (bookLang === 'ja' && !readerSettings.scriptMode) {
        setScriptMode('kanji');
      }
    } catch (error) {
      console.error('Failed to fetch book:', error);
      toast.error('Failed to load book');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadChapterSentences = async (chapId, reset = false) => {
    try {
      // Get count info
      const countRes = await getSentencesCount(chapId);
      setTotalSentences(countRes.data.count);
      setTranslatedCount(countRes.data.translated || 0);
      
      // Load sentences
      const res = await getSentences(chapId, 0, sentencesPerPage);
      setSentences(res.data);
      setHasMore(res.data.length < countRes.data.count);
      
      // Trigger background translation for upcoming sentences
      triggerTranslation(chapId, 1).catch(e => {
        console.log('Translation trigger:', e.message);
      });
      
      // Update reading progress
      if (res.data.length > 0) {
        await updateProgress({
          book_id: bookId,
          chapter_id: chapId,
          sentence_id: res.data[0].id,
          words_read: res.data.length * 5
        });
      }
    } catch (error) {
      console.error('Failed to fetch sentences:', error);
      toast.error('Failed to load chapter');
    }
  };

  const loadMoreSentences = async () => {
    if (!currentChapter || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const res = await getSentences(currentChapter.id, sentences.length, sentencesPerPage);
      setSentences(prev => [...prev, ...res.data]);
      setHasMore(sentences.length + res.data.length < totalSentences);
      
      // Trigger translation for next batch
      const nextPosition = sentences.length + res.data.length;
      triggerTranslation(currentChapter.id, nextPosition).catch(() => {});
      
      if (res.data.length > 0) {
        await updateProgress({
          book_id: bookId,
          chapter_id: currentChapter.id,
          sentence_id: res.data[res.data.length - 1].id,
          words_read: res.data.length * 5
        });
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleWordClick = useCallback(async (word, pos, event, sentenceText = '') => {
    if (scriptMode === 'english') return;

    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    setPopupPosition({ x: rect.left, y: rect.bottom });
    setSelectedWord(word);
    setWordPos(pos || '');
    setContextSentence(sentenceText);
    setLookingUp(true);

    try {
      const res = await lookupWord(word);
      setWordData(res.data);
    } catch (error) {
      setWordData({
        word,
        reading: word,
        romaji: word,
        meanings: ['Definition not found'],
        parts_of_speech: ['unknown']
      });
    } finally {
      setLookingUp(false);
    }
  }, [scriptMode]);

  const handleClosePopup = () => {
    setSelectedWord(null);
    setWordData(null);
  };

  const getTokens = async (sentenceId, text) => {
    const cacheKey = `${sentenceId}:${text}`;
    if (tokenCache[cacheKey]) return tokenCache[cacheKey];
    try {
      const res = await axios.post(`${API}/tokenize`, { text });
      const tokens = res.data.tokens || [];
      setTokenCache(prev => ({ ...prev, [cacheKey]: tokens }));
      return tokens;
    } catch {
      return [{ surface: text, reading: '', pos: '' }];
    }
  };

  // Reset audio + lazy-translation state whenever the chapter changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioUrl(null);
    setAudioCurrentTime(0);
    setIsPlaying(false);
    setAudioError(null);
    setShowAudioPrompt(null);
    setIsAudioMuted(false);
    translateChunkInFlight.current = false;
  }, [chapterId]);

  // Reserve bottom space under the chapter text equal to the audio bar's
  // real rendered height, so the last paragraph is never hidden behind it —
  // measured rather than hardcoded since the bar's height differs between
  // idle/generating/playback and the two mobile breakpoints. A callback ref
  // (rather than an effect keyed on audioMode) so the observer attaches the
  // instant the bar's DOM node actually mounts, not on ReaderPage's own
  // render pass — the bar mounts one tick later via its own open/close effect.
  const setAudioBarNode = useCallback((node) => {
    if (audioBarObserverRef.current) {
      audioBarObserverRef.current.disconnect();
      audioBarObserverRef.current = null;
    }
    if (node && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setAudioBarHeight(entry.contentRect.height);
      });
      observer.observe(node);
      audioBarObserverRef.current = observer;
    } else {
      setAudioBarHeight(0);
    }
  }, []);

  // Stripe checkout is an external redirect (no in-app return route yet),
  // so refresh the backend-authoritative balance whenever the reader tab
  // regains focus — covers a user returning after completing a purchase.
  useEffect(() => {
    const refreshBalanceOnFocus = () => {
      if (document.visibilityState !== 'visible' || audioBalanceData === null) return;
      getAudioBalance().then(r => setAudioBalanceData(r.data)).catch(() => {});
    };
    document.addEventListener('visibilitychange', refreshBalanceOnFocus);
    return () => document.removeEventListener('visibilitychange', refreshBalanceOnFocus);
  }, [audioBalanceData]);

  const loadChapterAudio = async () => {
    if (!chapterId) return;
    if (audioBalanceData !== null && audioBalanceData.total_minutes_available <= 0) {
      setShowAudioPrompt(AUDIO_GATE.PURCHASE);
      return;
    }
    setAudioError(null);
    setAudioLoading(true);
    try {
      const res = await getChapterAudio(chapterId);
      setAudioUrl(res.data.url);
      setAudioDuration(res.data.duration_minutes);
      if (res.data.balance_after) {
        const b = res.data.balance_after;
        const freeRemaining = Math.max(0, 1.0 - b.audio_free_minutes_used);
        setAudioBalanceData(prev => prev ? {
          ...prev,
          audio_free_minutes_used: b.audio_free_minutes_used,
          audio_free_minutes_remaining: freeRemaining,
          is_free_taster_exhausted: b.audio_free_minutes_used >= 1.0,
          audio_monthly_minutes_balance: b.audio_monthly_minutes_balance,
          audio_pack_minutes_balance: b.audio_pack_minutes_balance,
          total_minutes_available: parseFloat(
            (freeRemaining + b.audio_monthly_minutes_balance + b.audio_pack_minutes_balance).toFixed(4)
          ),
        } : prev);
      }
      if (res.data.cached) {
        setCachedChapterIds(prev => new Set([...prev, chapterId]));
      }
    } catch (err) {
      if (err.response?.status === 402) {
        setShowAudioPrompt(AUDIO_GATE.PURCHASE);
      } else {
        setAudioError('generation_failed');
      }
    } finally {
      setAudioLoading(false);
    }
  };

  // Resolve eligibility from the real balance fields (never invented
  // client-side): purchased minutes play immediately, an untouched free
  // taster gets an explicit consent step, otherwise show the purchase gate.
  const handleListenClick = () => {
    const access = getAudioAccessState(audioBalanceData);
    if (access === AUDIO_GATE.TASTER) {
      setShowAudioPrompt(AUDIO_GATE.TASTER);
      return;
    }
    if (access === AUDIO_GATE.PURCHASE) {
      setShowAudioPrompt(AUDIO_GATE.PURCHASE);
      return;
    }
    loadChapterAudio();
  };

  const handleAudioToggle = () => {
    const next = !audioMode;
    setAudioMode(next);
    if (next && audioBalanceData === null) {
      getAudioBalance()
        .then(r => setAudioBalanceData(r.data))
        .catch(() => {});
    }
    if (!next) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioPlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
  };

  const handleAudioSeek = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkipBack = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - 15);
  };

  const handleSkipForward = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    el.currentTime = Math.min(el.duration, el.currentTime + 15);
  };

  const handleToggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    const next = !isAudioMuted;
    el.muted = next;
    setIsAudioMuted(next);
  };

  const handlePlaybackRateChange = (rate) => {
    setAudioSpeed(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const handleAudioRetry = () => {
    setAudioError(null);
    loadChapterAudio();
  };

  // Taster modal's "Play now" never cleared showAudioPrompt itself, so the
  // modal stayed open indefinitely over a bar that had already moved on to
  // Generating/Playback behind it. Close it in the same tick generation
  // starts (both setState calls batch together) so there's no frame where
  // the bar is visible mid-modal and no frame where it's still idle.
  const handleTasterPlayNow = () => {
    setShowAudioPrompt(null);
    loadChapterAudio();
  };

  // One visual state at a time — never "Listen + spinner" or
  // "Generating + playback controls" simultaneously (Screen 2 brief §28).
  const debugBarStateOverride = debugAudioState === 'low-balance' ? 'playback' : debugAudioState;
  const audioBarState = ['idle', 'generating', 'playback'].includes(debugBarStateOverride)
    ? debugBarStateOverride
    : audioError
      ? 'error'
      : audioLoading
        ? 'generating'
        : audioUrl
          ? 'playback'
          : 'idle';
  const isAudioBarOpen = debugBarStateOverride ? true : audioMode;
  const debugPlaybackDisplay = audioBarState === 'playback' && debugBarStateOverride
    ? { currentTime: 42, duration: 750, isPlaying: false }
    : null;

  const handleChapterChange = (chapId) => {
    setSentences([]);
    setHasMore(true);
    navigate(`/read/${bookId}/${chapId}`);
  };

  const goToNextChapter = () => {
    if (!currentChapter) return;
    const idx = chapters.findIndex(c => c.id === currentChapter.id);
    if (idx < chapters.length - 1) {
      handleChapterChange(chapters[idx + 1].id);
    }
  };

  const goToPrevChapter = () => {
    if (!currentChapter) return;
    const idx = chapters.findIndex(c => c.id === currentChapter.id);
    if (idx > 0) {
      handleChapterChange(chapters[idx - 1].id);
    }
  };

  const isBookmarked = (sentenceId) => bookmarks.some(b => b.sentence_id === sentenceId);

  const toggleBookmark = async (sentenceId) => {
    const existing = bookmarks.find(b => b.sentence_id === sentenceId);
    if (existing) {
      await deleteBookmark(existing.id);
      setBookmarks(bookmarks.filter(b => b.id !== existing.id));
      toast.success('Bookmark removed');
    } else {
      const newBookmark = await createBookmark({
        book_id: bookId,
        chapter_id: currentChapter.id,
        sentence_id: sentenceId,
        name: `Chapter ${currentChapter.chapter_number}`
      });
      setBookmarks([...bookmarks, newBookmark.data]);
      toast.success('Bookmark added');
    }
  };

  const getSentenceText = (sentence) => {
    const isJapaneseSource = sentence.source_language === 'ja';
    
    switch (scriptMode) {
      case 'kanji':
        // For Japanese source: kanji is the original, always available
        // For English source: kanji is the translation, may be pending
        return sentence.japanese_kanji || (isJapaneseSource ? '' : sentence.english);
      case 'hiragana':
        return sentence.japanese_hiragana || sentence.japanese_kanji || (isJapaneseSource ? '' : sentence.english);
      case 'katakana':
        return sentence.japanese_katakana || sentence.japanese_kanji || (isJapaneseSource ? '' : sentence.english);
      case 'romaji':
        return sentence.japanese_romaji || (isJapaneseSource ? '' : sentence.english);
      case 'english':
      default:
        // For Japanese source: English is the translation
        // For English source: English is the original
        return sentence.english;
    }
  };

  // Check if sentence has readable content (used for rendering)
  const hasReadableContent = (sentence) => {
    const isJapaneseSource = sentence.source_language === 'ja';
    
    if (scriptMode === 'english') {
      return !!sentence.english && sentence.english !== '(English translation pending)';
    }
    
    // For Japanese modes, Japanese source books always have content
    if (isJapaneseSource) {
      return !!(sentence.japanese_kanji || sentence.japanese_hiragana);
    }
    
    // For English source, check if translation exists
    return !!(sentence.japanese_kanji || sentence.english);
  };

  const isTranslationPending = (sentence) => {
    const isJapaneseSource = sentence.source_language === 'ja';
    
    if (isJapaneseSource) {
      // For Japanese books: only pending if viewing English and no English translation
      if (scriptMode === 'english') {
        return !sentence.english || sentence.english === '(English translation pending)';
      }
      // Japanese modes always have content for Japanese source
      return false;
    }
    
    // For English source books: pending if viewing Japanese but no Japanese text
    return sentence.translation_status !== 'completed' && scriptMode !== 'english';
  };

  const handleSecondaryLayerChange = (v) => {
    setSecondaryLayer(v);
    updateReaderSettings({ secondaryLayer: v });
    if (v !== 'none') setShowSecondaryText(true);
  };

  const handleThemeChange = (v) => {
    setReaderTheme(v);
    updateReaderSettings({ readerTheme: v });
  };

  const handleFontFamilyChange = (v) => {
    setFontFamily(v);
    updateReaderSettings({ fontFamily: v });
  };

  const handleFontSizeChange = (index) => {
    const newSize = FONT_SIZE_STEPS[index];
    setFontSize(newSize);
    updateReaderSettings({ fontSize: newSize });
  };

  const handleSentencesPerPageChange = (n) => {
    setSentencesPerPage(n);
    updateReaderSettings({ sentencesPerPage: n });
  };

  const getSecondaryText = (sentence) => {
    if (secondaryLayer === 'none') return null;
    
    switch (secondaryLayer) {
      case 'furigana':
        // Show hiragana as furigana reading
        return sentence.japanese_hiragana || null;
      case 'kanji':
        // Show kanji version
        return sentence.japanese_kanji || null;
      case 'english':
        // Show English translation
        return sentence.english || null;
      default:
        return null;
    }
  };

  // Determine available secondary layer options based on main script mode
  const getSecondaryOptions = () => {
    const options = [{ value: 'none', label: 'None' }];
    
    if (scriptMode === 'kanji') {
      options.push({ value: 'furigana', label: 'Furigana (Hiragana)' });
      options.push({ value: 'english', label: 'English' });
    } else if (scriptMode === 'hiragana') {
      options.push({ value: 'kanji', label: 'Kanji' });
      options.push({ value: 'english', label: 'English' });
    } else if (scriptMode === 'katakana') {
      options.push({ value: 'kanji', label: 'Kanji' });
      options.push({ value: 'furigana', label: 'Furigana (Hiragana)' });
      options.push({ value: 'english', label: 'English' });
    } else if (scriptMode === 'romaji') {
      options.push({ value: 'kanji', label: 'Kanji' });
      options.push({ value: 'english', label: 'English' });
    } else if (scriptMode === 'english') {
      options.push({ value: 'kanji', label: 'Japanese (Kanji)' });
      options.push({ value: 'furigana', label: 'Japanese (Hiragana)' });
    }
    
    return options;
  };

  const fontSizeClass = {
    sm: 'text-base',
    base: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  }[fontSize];

  const lineHeightClass = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose'
  }[lineHeight];

  const themeClass = readerTheme !== 'default' ? `reader-theme-${readerTheme}` : '';
  const selectedFont = FONT_OPTIONS.find(f => f.value === fontFamily);
  const fontCSSValue = selectedFont?.css || '"Noto Serif JP", serif';
  const fontSizeIndex = FONT_SIZE_STEPS.indexOf(fontSize);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentChapterIndex = chapters.findIndex(c => c.id === currentChapter?.id);
  const hasPrev = currentChapterIndex > 0;
  const hasNext = currentChapterIndex < chapters.length - 1;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    if (selectedWord) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -50) setZenzeiiOpen(true);
    if (deltaX > 50) setZenzeiiOpen(false);
    touchStartX.current = null;
  };

  return (
    <div className={`min-h-screen bg-background ${themeClass}`} onClick={handleClosePopup} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" data-testid="reader-home-btn">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground line-clamp-1">{book?.title_jp || book?.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{currentChapter?.title_jp || currentChapter?.title}</p>
            </div>
          </div>

          <Select value={currentChapter?.id || ''} onValueChange={handleChapterChange}>
            <SelectTrigger className="w-48" data-testid="chapter-select">
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((chapter) => (
                <SelectItem key={chapter.id} value={chapter.id}>
                  {AUDIO_ENABLED && cachedChapterIds.has(chapter.id) ? '🎧 ' : ''}Ch. {chapter.chapter_number}: {chapter.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="reader-theme-toggle">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {AUDIO_ENABLED && (
              <div style={{ marginRight: '16px' }}>
                <AudioToolbarButton isOpen={audioMode} onToggle={handleAudioToggle} />
              </div>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="reader-toc-btn">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="font-serif">Chapters</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <Button
                        key={chapter.id}
                        variant={chapter.id === currentChapter?.id ? 'default' : 'ghost'}
                        className="w-full justify-start text-left"
                        onClick={() => handleChapterChange(chapter.id)}
                      >
                        <span className="truncate">
                          {chapter.chapter_number}. {chapter.title_jp || chapter.title}
                          {AUDIO_ENABLED && cachedChapterIds.has(chapter.id) && (
                            <span title="Audio ready — instant playback" style={{ marginLeft: '6px', fontSize: '0.8em' }}>🎧</span>
                          )}
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="reader-settings-btn">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-serif">Reading Preferences</SheetTitle>
                </SheetHeader>
                <ReaderCustomizationPanel
                  readerTheme={readerTheme}
                  onThemeChange={handleThemeChange}
                  fontFamily={fontFamily}
                  onFontFamilyChange={handleFontFamilyChange}
                  fontSizeIndex={fontSizeIndex >= 0 ? fontSizeIndex : 2}
                  onFontSizeChange={handleFontSizeChange}
                  sentencesPerPage={sentencesPerPage}
                  onSentencesPerPageChange={handleSentencesPerPageChange}
                  lineHeight={lineHeight}
                  onLineHeightChange={(v) => {
                    setLineHeight(v);
                    updateReaderSettings({ lineHeight: v });
                  }}
                  scriptMode={scriptMode}
                  onScriptModeChange={(v) => {
                    setScriptMode(v);
                    updateReaderSettings({ scriptMode: v });
                    const validValues = getSecondaryOptions().map(o => o.value);
                    if (!validValues.includes(secondaryLayer)) {
                      handleSecondaryLayerChange('none');
                    }
                  }}
                  secondaryLayer={secondaryLayer}
                  onSecondaryLayerChange={handleSecondaryLayerChange}
                  secondaryOptions={getSecondaryOptions()}
                  showSecondaryText={showSecondaryText}
                  onToggleSecondaryText={() => setShowSecondaryText(prev => !prev)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Script Toggle Bar */}
      <div className="border-b border-border bg-card py-3">
        <div className="container mx-auto px-4 space-y-2">
          <ScriptToggle
            value={scriptMode}
            onChange={(v) => {
              setScriptMode(v);
              updateReaderSettings({ scriptMode: v });
              // Reset secondary if it's no longer valid for the new primary mode
              const validValues = getSecondaryOptions().map(o => o.value);
              if (!validValues.includes(secondaryLayer)) {
                handleSecondaryLayerChange('none');
              }
            }}
          />
          <button
            onClick={() => setVerticalMode(v => !v)}
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: '0.85rem',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid hsl(var(--border))',
              backgroundColor: verticalMode ? 'hsl(var(--primary))' : 'transparent',
              color: verticalMode ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
              cursor: 'pointer',
            }}
          >
            縦
          </button>
          <div className="flex items-center justify-between gap-4">
            <SecondaryScriptToggle
              value={secondaryLayer}
              onChange={handleSecondaryLayerChange}
              options={getSecondaryOptions()}
              show={showSecondaryText}
              onToggleShow={() => setShowSecondaryText(prev => !prev)}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowWordHighlights(prev => !prev)}
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors border',
                  showWordHighlights
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
                ].join(' ')}
                title={showWordHighlights ? 'Hide word highlights' : 'Highlight saved words'}
              >
                <Highlighter className="h-3.5 w-3.5" />
                Words
              </button>
              <button
                onClick={() => setShowKanjiHighlights(prev => !prev)}
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors border',
                  showKanjiHighlights
                    ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
                ].join(' ')}
                title={showKanjiHighlights ? 'Hide kanji highlights' : 'Highlight saved kanji'}
              >
                <Highlighter className="h-3.5 w-3.5" />
                漢字
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main
        className="container mx-auto px-4 py-8"
        style={isAudioBarOpen ? { paddingBottom: `${audioBarHeight + 44}px` } : undefined}
      >
        <div className="max-w-3xl mx-auto">
          {/* Chapter Title */}
          <div className="text-center mb-12">
            <p className="text-sm text-muted-foreground mb-2">Chapter {currentChapter?.chapter_number}</p>
            <h1 className="text-3xl font-serif text-foreground">{currentChapter?.title_jp || currentChapter?.title}</h1>
            {currentChapter?.title_jp && currentChapter?.title && (
              <p className="text-lg text-muted-foreground mt-1">{currentChapter.title}</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Page {Math.ceil(sentences.length / sentencesPerPage)} of {Math.ceil(totalSentences / sentencesPerPage)}</span>
              <span>•</span>
              <span>{sentences.length} / {totalSentences} sentences</span>
              {translatedCount < totalSentences && (
                <>
                  <span>•</span>
                  <span className="text-primary animate-pulse">
                    {book?.book_language === 'ja' 
                      ? `EN translation ${translatedCount}/${totalSentences}`
                      : `JP translation ${translatedCount}/${totalSentences}`
                    }
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sentences */}
          <div
            className={`reader-content ${verticalMode ? 'space-y-0' : 'space-y-6'} ${fontSizeClass} ${lineHeightClass}`}
            style={{
              '--jp-font-family': fontCSSValue,
              '--reader-line-height': lineHeight === 'normal' ? '1.5' : lineHeight === 'relaxed' ? '1.8' : '2.2',
              fontFamily: fontCSSValue,
              ...(verticalMode && {
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                height: '70vh',
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                flexDirection: 'row',
                lineHeight: '1.8',
              })
            }}
            data-testid="reader-content"
          >
            {sentences.map((sentence, index) => {
              const secondaryText = getSecondaryText(sentence);
              const showSecondary = secondaryLayer !== 'none' && showSecondaryText && secondaryText && (secondaryLayer === 'english' || sentence.translation_status === 'completed');

              return (
                <React.Fragment key={sentence.id}>
                  {index === translateTriggerIndex && (
                    <div ref={translateTriggerRef} style={{ height: 0, overflow: 'hidden' }} aria-hidden="true" />
                  )}
                  <div
                  className={`reader-sentence group relative ${isTranslationPending(sentence) ? 'opacity-70' : ''}`}
                  data-testid={`sentence-${sentence.id}`}
                >
                  {/* Main text */}
                  <div className={`${scriptMode !== 'english' && scriptMode !== 'romaji' ? 'jp-text' : ''}`}>
                    {scriptMode !== 'english' ? (
                      (showWordHighlights || showKanjiHighlights) ? (
                        <HighlightedText
                          text={getSentenceText(sentence)}
                          vocabIndex={vocabIndex}
                          showWords={showWordHighlights}
                          showKanji={showKanjiHighlights}
                          onWordClick={(word, e) =>
                            handleWordClick(word, '', e, getSentenceText(sentence))
                          }
                        />
                      ) : (
                        <TokenizedSentence
                          text={getSentenceText(sentence)}
                          sentenceId={sentence.id}
                          onWordClick={(word, pos, e) => {
                            handleWordClick(word, pos, e);
                          }}
                          tokenCache={tokenCache}
                          getTokens={getTokens}
                          showFurigana={secondaryLayer === 'furigana'}
                          highlightedSentenceId={highlightedSentenceId}
                          highlightedWordIndex={highlightedWordIndex}
                        />
                      )
                    ) : (
                      <span>{getSentenceText(sentence)}</span>
                    )}
                  </div>

                  {/* Secondary layer - smaller, lighter text */}
                  {showSecondary && !(secondaryLayer === 'furigana' && !(showWordHighlights || showKanjiHighlights) && scriptMode !== 'english') && (
                    <div 
                      className={`mt-1 text-muted-foreground/70 ${
                        secondaryLayer === 'english' ? '' : 'jp-text'
                      }`}
                      style={{ 
                        fontSize: '0.75em',
                        lineHeight: '1.4'
                      }}
                    >
                      {secondaryText}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(sentence.id);
                    }}
                    data-testid={`bookmark-btn-${sentence.id}`}
                  >
                    {isBookmarked(sentence.id) ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                </React.Fragment>
              );
            })}

            {hasMore && (
              <div ref={sentinelRef} className="py-8 text-center">
                {loadingMore ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                ) : (
                  <Button variant="ghost" onClick={loadMoreSentences}>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load more
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Chapter Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
            <Button variant="outline" onClick={goToPrevChapter} disabled={!hasPrev} data-testid="prev-chapter-btn">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>
            <Button variant="outline" onClick={goToNextChapter} disabled={!hasNext} data-testid="next-chapter-btn">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* Dictionary Popup */}
      {selectedWord && (
        <>
          {lookingUp ? (
            <Card
              className="fixed z-50 w-80 p-8 shadow-float border border-border flex items-center justify-center"
              style={{
                left: `${Math.min(popupPosition.x, window.innerWidth - 340)}px`,
                top: `${Math.min(popupPosition.y + 10, window.innerHeight - 300)}px`,
              }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Card>
          ) : (
            <DictionaryPopup
              wordData={wordData}
              position={popupPosition}
              onClose={handleClosePopup}
              savedWords={savedWords}
              onWordSaved={handleWordSaved}
              contextSentence={contextSentence}
              pos={wordPos}
              aiUsage={aiUsage}
              onAiUsed={handleAiUsed}
              onAiLimitReached={handleAiLimitReached}
            />
          )}
        </>
      )}

      {/* Zenzeii chat trigger — lifted clear of the audio bar while it's open,
          reusing the same measured bar height as the reader's bottom-padding
          compensation rather than a hardcoded offset. */}
      <div
        style={{
          position: 'fixed',
          bottom: isAudioBarOpen ? `calc(${audioBarHeight}px + 38px)` : '24px',
          left: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          transition: 'bottom 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {aiUsage?.subscription_tier === 'free' &&
          typeof aiUsage?.ai_messages_remaining === 'number' &&
          aiUsage.ai_messages_remaining > 0 &&
          aiUsage.ai_messages_remaining <= 2 && (
          <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontFamily: 'EB Garamond, serif', paddingLeft: '2px' }}>
            {aiUsage.ai_messages_remaining} AI {aiUsage.ai_messages_remaining === 1 ? 'message' : 'messages'} left today
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setZenzeiiOpen(true); }}
          style={{
            fontFamily: 'EB Garamond, serif',
            fontSize: '14px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            padding: '8px 16px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          文 Zenzeii
        </button>
      </div>

      {AUDIO_ENABLED && (() => {
        // Balance display — same entitlement/formatting rules as before,
        // just relocated: healthy balance renders quiet text, low balance
        // renders the existing (unredesigned) AudioLowBalancePill. Never both.
        let audioBalanceNode = null;
        if (audioBalanceData !== null && audioBalanceData.total_minutes_available > 0) {
          const { subscription_tier, audio_free_minutes_remaining, audio_monthly_minutes_balance,
                  audio_pack_minutes_balance, total_minutes_available, audio_monthly_reset_date } = audioBalanceData;

          let minsNum;
          let resetLabel = null;
          if (subscription_tier === 'free') {
            minsNum = audio_free_minutes_remaining ?? total_minutes_available;
          } else if (subscription_tier === 'premium' && audio_monthly_minutes_balance > 0) {
            minsNum = audio_monthly_minutes_balance;
            if (audio_monthly_reset_date) {
              const d = new Date(audio_monthly_reset_date + 'T00:00:00');
              d.setMonth(d.getMonth() + 1);
              resetLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          } else {
            minsNum = audio_pack_minutes_balance ?? total_minutes_available;
          }

          audioBalanceNode = isLowBalance(minsNum) ? (
            <AudioLowBalancePill
              minutesRemaining={minsNum}
              onTopUp={() => setShowAudioPrompt(AUDIO_GATE.PURCHASE)}
            />
          ) : (
            <span className="reader-audio-balance">
              {Math.round(minsNum)}<span className="reader-audio-balance__suffix"> min remaining</span>
              {resetLabel ? <span style={{ opacity: 0.7 }}> · resets {resetLabel}</span> : null}
            </span>
          );
        }

        // Debug-only override (see debugAudioState above) — presentational
        // swap for a screenshot, never written back into audioBalanceData.
        if (debugAudioState === 'low-balance') {
          audioBalanceNode = (
            <AudioLowBalancePill
              minutesRemaining={2}
              onTopUp={() => setShowAudioPrompt(AUDIO_GATE.PURCHASE)}
            />
          );
        }

        return (
          <ReaderAudioBar
            ref={setAudioBarNode}
            isOpen={isAudioBarOpen}
            barState={audioBarState}
            book={book}
            chapterLabel={currentChapter ? `Chapter ${currentChapter.chapter_number}` : ''}
            audioUrl={audioUrl}
            audioElRef={audioRef}
            onTimeUpdate={() => setAudioCurrentTime(audioRef.current?.currentTime || 0)}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            isPlaying={debugPlaybackDisplay ? debugPlaybackDisplay.isPlaying : isPlaying}
            currentTime={debugPlaybackDisplay ? debugPlaybackDisplay.currentTime : audioCurrentTime}
            duration={debugPlaybackDisplay ? debugPlaybackDisplay.duration : (audioRef.current?.duration || 0)}
            playbackRate={audioSpeed}
            isMuted={isAudioMuted}
            balance={audioBalanceNode}
            onListen={handleListenClick}
            onPlayPause={handleAudioPlayPause}
            onSeek={handleAudioSeek}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onPlaybackRateChange={handlePlaybackRateChange}
            onToggleMute={handleToggleMute}
            onRetry={handleAudioRetry}
            onClose={handleAudioToggle}
          />
        );
      })()}

      <AudioGateModal
        open={debugAudioState === 'taster' || debugAudioState === 'purchase' ? true : !!showAudioPrompt}
        gateType={
          debugAudioState === 'taster' ? AUDIO_GATE.TASTER
          : debugAudioState === 'purchase' ? AUDIO_GATE.PURCHASE
          : showAudioPrompt
        }
        onClose={() => setShowAudioPrompt(null)}
        onPlayNow={handleTasterPlayNow}
      />

      <ZenzeiiChat
        bookTitle={book?.title || ''}
        currentSentence={contextSentence || ''}
        isOpen={zenzeiiOpen}
        onClose={() => setZenzeiiOpen(false)}
        aiUsage={aiUsage}
        onAiUsed={handleAiUsed}
        onAiLimitReached={handleAiLimitReached}
      />

    </div>
  );
};

export default ReaderPage;
