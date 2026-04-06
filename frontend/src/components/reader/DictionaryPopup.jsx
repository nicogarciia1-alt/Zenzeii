import React, { useState } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { saveWord } from '@/lib/api';
import { toast } from 'sonner';

export const DictionaryPopup = ({ wordData, position, onClose, savedWords = [], onWordSaved }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    savedWords.some(w => w.word === wordData?.word)
  );

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
        left: `${Math.min(position.x, window.innerWidth - 340)}px`,
        top: `${Math.min(position.y + 10, window.innerHeight - 300)}px`,
      }}
      data-testid="dictionary-popup"
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
