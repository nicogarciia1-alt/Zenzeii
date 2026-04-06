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
import { buildVocabIndex } from '@/lib/vocabHighlight';
import { useTheme } from '@/contexts/ThemeContext';
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
  triggerTranslation
} from '@/lib/api';
import { toast } from 'sonner';

const SENTENCES_PER_PAGE = 50;

export const ReaderPage = () => {
  const { bookId, chapterId } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme, readerSettings, updateReaderSettings } = useTheme();
  const sentinelRef = useRef(null);

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

  // Dictionary popup state
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordData, setWordData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [lookingUp, setLookingUp] = useState(false);

  // Settings
  const [fontSize, setFontSize] = useState(readerSettings.fontSize || 'lg');
  const [lineHeight, setLineHeight] = useState(readerSettings.lineHeight || 'relaxed');
  const [scriptMode, setScriptMode] = useState(readerSettings.scriptMode || 'kanji');
  const [secondaryLayer, setSecondaryLayer] = useState(readerSettings.secondaryLayer || 'none');
  const [showSecondaryText, setShowSecondaryText] = useState(true);
  const [showVocabHighlights, setShowVocabHighlights] = useState(false);

  // Rebuild vocab lookup index only when savedWords changes
  const vocabIndex = useMemo(() => buildVocabIndex(savedWords), [savedWords]);

  // Update savedWords immediately when a word is saved from the popup
  const handleWordSaved = useCallback((wordData) => {
    setSavedWords(prev => [...prev, wordData]);
  }, []);

  useEffect(() => {
    fetchBookData();
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
  }, [hasMore, loadingMore, sentences.length]);

  // Poll for translation updates when in Japanese mode
  useEffect(() => {
    if (scriptMode === 'english' || !currentChapter) return;
    
    // Check if any sentences need translation
    const needsTranslation = sentences.some(s => s.translation_status !== 'completed');
    if (!needsTranslation) return;

    const interval = setInterval(async () => {
      try {
        // Reload sentences to get updated translations
        const res = await getSentences(currentChapter.id, 0, sentences.length || SENTENCES_PER_PAGE);
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
  }, [scriptMode, currentChapter, sentences.length]);

  const fetchBookData = async () => {
    setLoading(true);
    try {
      const [bookRes, chaptersRes, vocabRes, bookmarksRes] = await Promise.all([
        getBook(bookId),
        getChapters(bookId),
        getVocabulary(),
        getBookmarks()
      ]);
      setBook(bookRes.data);
      setChapters(chaptersRes.data);
      setSavedWords(vocabRes.data);
      setBookmarks(bookmarksRes.data.filter(b => b.book_id === bookId));
      
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
      const res = await getSentences(chapId, 0, SENTENCES_PER_PAGE);
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
      const res = await getSentences(currentChapter.id, sentences.length, SENTENCES_PER_PAGE);
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

  const handleWordClick = useCallback(async (word, event) => {
    if (scriptMode === 'english') return;
    
    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    setPopupPosition({ x: rect.left, y: rect.bottom });
    setSelectedWord(word);
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

  return (
    <div className="min-h-screen bg-background" onClick={handleClosePopup}>
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
                  Ch. {chapter.chapter_number}: {chapter.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="reader-theme-toggle">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

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
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="font-serif">Reading Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <ScriptToggle
                    value={scriptMode}
                    onChange={(v) => {
                      setScriptMode(v);
                      updateReaderSettings({ scriptMode: v });
                    }}
                  />

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Font Size</span>
                    <Select value={fontSize} onValueChange={(v) => {
                      setFontSize(v);
                      updateReaderSettings({ fontSize: v });
                    }}>
                      <SelectTrigger data-testid="font-size-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="base">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Line Height</span>
                    <Select value={lineHeight} onValueChange={(v) => {
                      setLineHeight(v);
                      updateReaderSettings({ lineHeight: v });
                    }}>
                      <SelectTrigger data-testid="line-height-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="relaxed">Relaxed</SelectItem>
                        <SelectItem value="loose">Loose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Secondary Layer</span>
                    <p className="text-xs text-muted-foreground/70">Show additional text below each sentence</p>
                    <Select value={secondaryLayer} onValueChange={handleSecondaryLayerChange}>
                      <SelectTrigger data-testid="secondary-layer-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getSecondaryOptions().map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
          <div className="flex items-center justify-between gap-4">
            <SecondaryScriptToggle
              value={secondaryLayer}
              onChange={handleSecondaryLayerChange}
              options={getSecondaryOptions()}
              show={showSecondaryText}
              onToggleShow={() => setShowSecondaryText(prev => !prev)}
            />
            <button
              onClick={() => setShowVocabHighlights(prev => !prev)}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors border',
                showVocabHighlights
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
              ].join(' ')}
              title={showVocabHighlights ? 'Hide vocabulary highlights' : 'Highlight saved vocabulary'}
            >
              <Highlighter className="h-3.5 w-3.5" />
              Vocab
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Chapter Title */}
          <div className="text-center mb-12">
            <p className="text-sm text-muted-foreground mb-2">Chapter {currentChapter?.chapter_number}</p>
            <h1 className="text-3xl font-serif text-foreground">{currentChapter?.title_jp || currentChapter?.title}</h1>
            {currentChapter?.title_jp && currentChapter?.title && (
              <p className="text-lg text-muted-foreground mt-1">{currentChapter.title}</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Page {Math.ceil(sentences.length / SENTENCES_PER_PAGE)} of {Math.ceil(totalSentences / SENTENCES_PER_PAGE)}</span>
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
          <div className={`reader-content space-y-6 ${fontSizeClass} ${lineHeightClass}`} data-testid="reader-content">
            {sentences.map((sentence) => {
              const secondaryText = getSecondaryText(sentence);
              const showSecondary = secondaryLayer !== 'none' && showSecondaryText && secondaryText && sentence.translation_status === 'completed';
              
              return (
                <div
                  key={sentence.id}
                  className={`reader-sentence group relative ${isTranslationPending(sentence) ? 'opacity-70' : ''}`}
                  data-testid={`sentence-${sentence.id}`}
                >
                  {/* Main text */}
                  <div className={`${scriptMode !== 'english' && scriptMode !== 'romaji' ? 'jp-text' : ''}`}>
                    {scriptMode !== 'english' ? (
                      showVocabHighlights ? (
                        <HighlightedText
                          text={getSentenceText(sentence)}
                          vocabIndex={vocabIndex}
                          onWordClick={handleWordClick}
                        />
                      ) : (
                        <span
                          className="reader-word cursor-pointer hover:bg-primary/10 hover:text-primary rounded px-0.5 transition-colors"
                          onClick={(e) => {
                            const text = getSentenceText(sentence);
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim()) {
                              handleWordClick(selection.toString().trim(), e);
                            } else {
                              const firstWord = text.split(/[\s、。！？]/)[0];
                              if (firstWord) handleWordClick(firstWord, e);
                            }
                          }}
                        >
                          {getSentenceText(sentence)}
                        </span>
                      )
                    ) : (
                      <span>{getSentenceText(sentence)}</span>
                    )}
                  </div>

                  {/* Secondary layer - smaller, lighter text */}
                  {showSecondary && (
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
            />
          )}
        </>
      )}
    </div>
  );
};

export default ReaderPage;
