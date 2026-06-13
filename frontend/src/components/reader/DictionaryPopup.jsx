import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { saveWord, explainWord, textToSpeech } from '@/lib/api';
import { isCJK } from '@/lib/vocabHighlight';
import { toast } from 'sonner';

export const DictionaryPopup = ({ wordData, position, onClose, savedWords = [], onWordSaved, contextSentence = '' }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    savedWords.some(w => w.word === wordData?.word)
  );

  // Drag-to-move state — initialised once from the clamped position prop
  const [dragPos, setDragPos] = useState(() => ({
    x: Math.min(Math.max(0, position.x), window.innerWidth - 340),
    y: Math.min(Math.max(10, position.y + 10), window.innerHeight - 500),
  }));
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      setDragPos({
        x: Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 340),
        y: Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 80),
      });
    };
    const onMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleDragStart = (e) => {
    // Don't hijack clicks on the close button
    if (e.target.closest('[data-testid="dictionary-close"]')) return;
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - dragPos.x, y: e.clientY - dragPos.y };
  };

  // AI explanation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedKanji, setSavedKanji] = useState({});

  const kanjiBreakdown = useMemo(() =>
    wordData ? [...wordData.word].map(char => ({
      char,
      isKanji: isCJK(char),
      alreadySaved: savedWords.some(w => w.word === char && w.type === 'kanji'),
    })) : [],
  [wordData?.word, savedWords]);

  const showBreakdown = !!wordData?.word && wordData.word.length > 1 && kanjiBreakdown.some(c => c.isKanji);

  const handleAskAI = async (e) => {
    e.stopPropagation();
    setAiOpen(true);
    if (aiExplanation) return; // already fetched for this word
    setAiLoading(true);
    setAiError('');
    try {
      const res = await explainWord(wordData.word, contextSentence);
      setAiExplanation(res.data.explanation);
    } catch (err) {
      if (err.response?.status === 503) {
        setAiAvailable(false);
        setAiOpen(false);
      } else {
        setAiError('Could not fetch explanation. Please try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!wordData?.word || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const res = await textToSpeech(wordData.word, 'nova');
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSaveKanji = async (char) => {
    if (savedKanji[char] === 'saved' || savedKanji[char] === 'saving') return;
    setSavedKanji(prev => ({ ...prev, [char]: 'saving' }));
    try {
      const res = await saveWord({
        word: char, reading: '', romaji: '',
        meanings: [], parts_of_speech: [], type: 'kanji',
      });
      setSavedKanji(prev => ({ ...prev, [char]: 'saved' }));
      onWordSaved && onWordSaved(res.data);
      toast.success(`${char} saved`);
    } catch (error) {
      if (error.response?.status === 400) {
        setSavedKanji(prev => ({ ...prev, [char]: 'saved' }));
        toast.info(`${char} already in vocabulary`);
      } else {
        setSavedKanji(prev => ({ ...prev, [char]: null }));
        toast.error('Failed to save kanji');
      }
    }
  };

  if (!wordData) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const type = wordData.word.length === 1 &&
        /[一-鿿㐀-䶿豈-﫿]/.test(wordData.word)
          ? 'kanji' : 'word';
      const res = await saveWord({
        word: wordData.word,
        reading: wordData.reading || '',
        romaji: wordData.romaji || '',
        meanings: wordData.meanings || [],
        parts_of_speech: wordData.parts_of_speech || [],
        example_sentence: wordData.example_sentence,
        example_translation: wordData.example_translation,
        type,
      });
      setSaved(true);
      toast.success('Word saved to vocabulary!');
      onWordSaved && onWordSaved(res.data);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.info('Word already in your vocabulary');
        setSaved(true);
      } else {
        toast.error('Failed to save word');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className="fixed z-50 w-80 p-4 shadow-float border border-border animate-scale-in"
      style={{
        left: `${dragPos.x}px`,
        top: `${dragPos.y}px`,
      }}
      data-testid="dictionary-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — drag handle */}
      <div
        className="flex items-start justify-between mb-3 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-serif text-foreground">{wordData.word}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: isSpeaking ? 'wait' : 'pointer',
                fontSize: '16px',
                opacity: isSpeaking ? 0.5 : 1,
              }}
              title="Listen to pronunciation"
            >
              {isSpeaking ? '⏸' : '🔊'}
            </button>
          </div>
          {wordData.reading && (
            <p className="text-sm text-muted-foreground">{wordData.reading}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={onClose}
          data-testid="dictionary-close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Romaji */}
      {wordData.romaji && (
        <p className="text-sm text-secondary mb-3 font-mono">{wordData.romaji}</p>
      )}

      {/* Kanji Breakdown */}
      {showBreakdown && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Breakdown</p>
          <div className="flex flex-wrap gap-1 items-center">
            {kanjiBreakdown.map(({ char, isKanji, alreadySaved }, idx) => {
              const charState = savedKanji[char];
              const isSaved = alreadySaved || charState === 'saved';
              const isSaving = charState === 'saving';
              if (!isKanji) {
                return (
                  <span key={idx} className="text-sm text-muted-foreground px-0.5 font-serif select-none">
                    {char}
                  </span>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleSaveKanji(char)}
                  disabled={isSaved || isSaving}
                  className={`px-2 py-0.5 rounded border text-sm font-serif transition-colors ${
                    isSaved
                      ? 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800 cursor-default'
                      : isSaving
                      ? 'bg-muted text-muted-foreground border-border cursor-wait'
                      : 'bg-card text-foreground border-border hover:bg-muted cursor-pointer'
                  }`}
                  title={isSaved ? `${char} already saved` : `Save ${char} to vocabulary`}
                >
                  {char}
                  {isSaved && <Check className="inline h-3 w-3 ml-0.5 -mt-0.5" />}
                  {isSaving && <Loader2 className="inline h-3 w-3 ml-0.5 -mt-0.5 animate-spin" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Parts of Speech */}
      {wordData.parts_of_speech?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {wordData.parts_of_speech.slice(0, 3).map((pos, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {pos}
            </Badge>
          ))}
        </div>
      )}

      {/* Meanings */}
      <div className="space-y-1 mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Meanings</p>
        <ul className="space-y-1">
          {wordData.meanings?.slice(0, 5).map((meaning, i) => (
            <li key={i} className="text-sm text-foreground">
              {i + 1}. {meaning}
            </li>
          ))}
        </ul>
      </div>

      {/* Example Sentence */}
      {wordData.example_sentence && (
        <div className="mb-4 p-2 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Example</p>
          <p className="text-sm text-foreground jp-text">{wordData.example_sentence}</p>
          {wordData.example_translation && (
            <p className="text-xs text-muted-foreground mt-1">{wordData.example_translation}</p>
          )}
        </div>
      )}

      {/* AI Explanation */}
      {aiAvailable && (
        <div className="mb-4">
          {!aiOpen ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs h-8"
              onClick={handleAskAI}
              data-testid="ask-zenzeii-btn"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Zenzeii
            </Button>
          ) : (
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Zenzeii explains
                </span>
                {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
              {aiLoading ? (
                <p className="text-xs text-muted-foreground">Thinking...</p>
              ) : aiError ? (
                <p className="text-xs text-destructive">{aiError}</p>
              ) : (
                <p className="text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line">
                  {aiExplanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <Button
        variant={saved ? "secondary" : "default"}
        className="w-full"
        onClick={handleSave}
        disabled={saving || saved}
        data-testid="dictionary-save-btn"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        {saved ? 'Saved' : 'Save to Vocabulary'}
      </Button>
    </Card>
  );
};

export default DictionaryPopup;
