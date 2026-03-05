import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronDown
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
import DictionaryPopup from '@/components/reader/DictionaryPopup';
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
  updateProgress
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
      // Get total count first
      const countRes = await getSentencesCount(chapId);
      setTotalSentences(countRes.data.count);
      
      // Load first batch
      const res = await getSentences(chapId, 0, SENTENCES_PER_PAGE);
      setSentences(res.data);
      setHasMore(res.data.length < countRes.data.count);
      
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
      toast.error('Failed to load chapter content');
    }
  };

  const loadMoreSentences = async () => {
    if (!currentChapter || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const res = await getSentences(currentChapter.id, sentences.length, SENTENCES_PER_PAGE);
      setSentences(prev => [...prev, ...res.data]);
      setHasMore(sentences.length + res.data.length < totalSentences);
      
      // Update progress
      if (res.data.length > 0) {
        await updateProgress({
          book_id: bookId,
          chapter_id: currentChapter.id,
          sentence_id: res.data[res.data.length - 1].id,
          words_read: res.data.length * 5
        });
      }
    } catch (error) {
      console.error('Failed to load more sentences:', error);
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
    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    if (currentIndex < chapters.length - 1) {
      handleChapterChange(chapters[currentIndex + 1].id);
    }
  };

  const goToPrevChapter = () => {
    if (!currentChapter) return;
    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    if (currentIndex > 0) {
      handleChapterChange(chapters[currentIndex - 1].id);
    }
  };

  const isBookmarked = (sentenceId) => {
    return bookmarks.some(b => b.sentence_id === sentenceId);
  };

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
    switch (scriptMode) {
      case 'kanji':
        return sentence.japanese_kanji;
      case 'hiragana':
        return sentence.japanese_hiragana;
      case 'katakana':
        return sentence.japanese_katakana;
      case 'romaji':
        return sentence.japanese_romaji;
      case 'english':
        return sentence.english;
      default:
        return sentence.japanese_kanji;
    }
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
          {/* Left */}
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

          {/* Center - Chapter Select */}
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

          {/* Right */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="reader-theme-toggle">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Table of Contents */}
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

            {/* Settings */}
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Script Toggle Bar */}
      <div className="border-b border-border bg-card py-3">
        <div className="container mx-auto px-4">
          <ScriptToggle
            value={scriptMode}
            onChange={(v) => {
              setScriptMode(v);
              updateReaderSettings({ scriptMode: v });
            }}
          />
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
            {totalSentences > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {sentences.length} / {totalSentences} sentences loaded
              </p>
            )}
          </div>

          {/* Sentences */}
          <div className={`reader-content space-y-4 ${fontSizeClass} ${lineHeightClass}`} data-testid="reader-content">
            {sentences.map((sentence) => (
              <div
                key={sentence.id}
                className="reader-sentence group relative"
                data-testid={`sentence-${sentence.id}`}
              >
                <div className={`${scriptMode !== 'english' && scriptMode !== 'romaji' ? 'jp-text' : ''}`}>
                  {scriptMode !== 'english' ? (
                    <span
                      className="reader-word cursor-pointer hover:bg-primary/10 hover:text-primary rounded px-0.5 transition-colors"
                      onClick={(e) => {
                        const text = getSentenceText(sentence);
                        // Get clicked word (simplified - click anywhere triggers lookup)
                        const selection = window.getSelection();
                        if (selection && selection.toString().trim()) {
                          handleWordClick(selection.toString().trim(), e);
                        } else {
                          // Look up first word/phrase
                          const firstWord = text.split(/[\s、。！？]/)[0];
                          if (firstWord) handleWordClick(firstWord, e);
                        }
                      }}
                    >
                      {getSentenceText(sentence)}
                    </span>
                  ) : (
                    <span>{getSentenceText(sentence)}</span>
                  )}
                </div>

                {/* Bookmark button */}
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
            ))}
            
            {/* Load more sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="py-8 text-center">
                {loadingMore ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                ) : (
                  <Button variant="ghost" onClick={loadMoreSentences}>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load more sentences
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Chapter Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
            <Button
              variant="outline"
              onClick={goToPrevChapter}
              disabled={!hasPrev}
              data-testid="prev-chapter-btn"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>

            <Button
              variant="outline"
              onClick={goToNextChapter}
              disabled={!hasNext}
              data-testid="next-chapter-btn"
            >
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
            />
          )}
        </>
      )}
    </div>
  );
};

export default ReaderPage;
