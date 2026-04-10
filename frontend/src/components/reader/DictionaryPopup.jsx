import React, { useState } from 'react';
import { X, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { saveWord, explainWord } from '@/lib/api';
import { toast } from 'sonner';

export const DictionaryPopup = ({ wordData, position, onClose, savedWords = [], onWordSaved, contextSentence = '' }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    savedWords.some(w => w.word === wordData?.word)
  );

  // AI explanation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(true);

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

  if (!wordData) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveWord({
        word: wordData.word,
        reading: wordData.reading || '',
        romaji: wordData.romaji || '',
        meanings: wordData.meanings || [],
        parts_of_speech: wordData.parts_of_speech || [],
        example_sentence: wordData.example_sentence,
        example_translation: wordData.example_translation,
      });
      setSaved(true);
      toast.success('Word saved to vocabulary!');
      onWordSaved && onWordSaved(wordData);
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
        left: `${Math.min(Math.max(0, position.x), window.innerWidth - 340)}px`,
        top: `${Math.min(Math.max(10, position.y + 10), window.innerHeight - 500)}px`,
      }}
      data-testid="dictionary-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-2xl font-serif text-foreground">{wordData.word}</h3>
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
