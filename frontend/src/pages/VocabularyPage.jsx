import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Trash2,
  Edit3,
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Layout from '@/components/layout/Layout';
import { CATEGORY_COLORS, getWordCategory } from '@/lib/categoryColors';
import {
  getVocabulary,
  deleteSavedWord,
  updateSavedWord,
  getReviewWords,
  submitReview
} from '@/lib/api';
import { toast } from 'sonner';

export const VocabularyPage = () => {
  const [vocabulary, setVocabulary] = useState([]);
  const [reviewWords, setReviewWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Flashcard state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vocabRes, reviewRes] = await Promise.all([
        getVocabulary(),
        getReviewWords()
      ]);
      setVocabulary(vocabRes.data);
      setReviewWords(reviewRes.data);
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (wordId) => {
    try {
      await deleteSavedWord(wordId);
      setVocabulary(vocabulary.filter(w => w.id !== wordId));
      toast.success('Word deleted');
    } catch (error) {
      toast.error('Failed to delete word');
    }
  };

  const handleUpdateNotes = async (wordId) => {
    try {
      await updateSavedWord(wordId, { notes: editNotes });
      setVocabulary(vocabulary.map(w =>
        w.id === wordId ? { ...w, notes: editNotes } : w
      ));
      setEditingId(null);
      toast.success('Notes updated');
    } catch (error) {
      toast.error('Failed to update notes');
    }
  };

  const handleReviewAnswer = async (correct) => {
    if (reviewWords.length === 0) return;

    setReviewing(true);
    const currentWord = reviewWords[currentCardIndex];

    try {
      await submitReview(currentWord.id, correct);
      toast.success(correct ? 'Great job!' : 'Keep practicing!');

      // Move to next card or finish
      if (currentCardIndex < reviewWords.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setShowAnswer(false);
      } else {
        toast.success('Review session complete!');
        // Refresh review words
        const reviewRes = await getReviewWords();
        setReviewWords(reviewRes.data);
        setCurrentCardIndex(0);
        setShowAnswer(false);
      }
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const filteredVocabulary = vocabulary.filter(word => {
    if (typeFilter !== 'all' && (word.type || 'word') !== typeFilter) return false;
    return (
      word.word.includes(searchQuery) ||
      word.reading.includes(searchQuery) ||
      word.romaji.toLowerCase().includes(searchQuery.toLowerCase()) ||
      word.meanings.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getMasteryStars = (level) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < level ? 'fill-warning text-warning' : 'text-muted'}`}
      />
    ));
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const currentReviewWord = reviewWords[currentCardIndex];
  const currentCategory = currentReviewWord ? getWordCategory(currentReviewWord) : 'other';
  const currentColors = CATEGORY_COLORS[currentCategory];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-foreground mb-2">Vocabulary</h1>
          <p className="text-muted-foreground">
            {vocabulary.length} words saved • {reviewWords.length} due for review
          </p>
        </div>

        <Tabs defaultValue="words" className="space-y-6">
          <TabsList>
            <TabsTrigger value="words" data-testid="vocab-tab-words">
              <BookOpen className="h-4 w-4 mr-2" />
              Word List ({vocabulary.length})
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="vocab-tab-review">
              <RotateCcw className="h-4 w-4 mr-2" />
              Review ({reviewWords.length})
            </TabsTrigger>
          </TabsList>

          {/* Word List Tab */}
          <TabsContent value="words">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search words..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="vocab-search"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-1 mb-6">
              {[
                { value: 'all',   label: 'All'   },
                { value: 'word',  label: 'Words' },
                { value: 'kanji', label: '漢字'  },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                    typeFilter === value
                      ? value === 'kanji'
                        ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800'
                        : value === 'word'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-secondary/20 text-secondary-foreground border-border'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Word Cards */}
            {filteredVocabulary.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-serif text-foreground mb-2">
                  {vocabulary.length === 0 ? 'No saved words yet' : 'No matching words'}
                </h2>
                <p className="text-muted-foreground">
                  {vocabulary.length === 0
                    ? 'Click on words while reading to save them'
                    : 'Try a different search term'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="vocab-list">
                {filteredVocabulary.map((word) => {
                  const category = getWordCategory(word);
                  const colors = CATEGORY_COLORS[category];
                  return (
                  <Card key={word.id} className={`overflow-hidden border-border ${colors.bg}`} data-testid={`vocab-card-${word.id}`}>
                    <div className={`h-1.5 ${colors.strip}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-serif text-foreground">{word.word}</h3>
                            <Badge className={`text-[10px] px-1.5 py-0 border ${colors.badge}`}>
                              {colors.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{word.reading}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getMasteryStars(word.mastery_level)}
                        </div>
                      </div>

                      <p className="text-sm text-secondary font-mono mb-2">{word.romaji}</p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {word.parts_of_speech.slice(0, 2).map((pos, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {pos}
                          </Badge>
                        ))}
                      </div>

                      <ul className="text-sm text-foreground space-y-1 mb-3">
                        {word.meanings.slice(0, 3).map((meaning, i) => (
                          <li key={i}>{i + 1}. {meaning}</li>
                        ))}
                      </ul>

                      {/* Notes Section */}
                      {editingId === word.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="min-h-[80px]"
                            data-testid={`vocab-notes-input-${word.id}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateNotes(word.id)}
                              data-testid={`vocab-notes-save-${word.id}`}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {word.notes && (
                            <p className="text-sm text-muted-foreground italic bg-muted p-2 rounded">
                              {word.notes}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(word.id);
                                setEditNotes(word.notes || '');
                              }}
                              data-testid={`vocab-edit-btn-${word.id}`}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              {word.notes ? 'Edit' : 'Add'} Notes
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  data-testid={`vocab-delete-btn-${word.id}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete word?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove "{word.word}" from your vocabulary.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(word.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review">
            {reviewWords.length === 0 ? (
              <div className="text-center py-16">
                <Check className="h-16 w-16 mx-auto text-success mb-4" />
                <h2 className="text-xl font-serif text-foreground mb-2">All caught up!</h2>
                <p className="text-muted-foreground">
                  No words due for review. Keep reading to add more vocabulary!
                </p>
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-muted-foreground">
                    Card {currentCardIndex + 1} of {reviewWords.length}
                  </span>
                  <div className="flex gap-1">
                    {reviewWords.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < currentCardIndex
                            ? 'bg-success'
                            : i === currentCardIndex
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Flashcard */}
                <Card
                  className={`min-h-[300px] cursor-pointer transition-all duration-300 overflow-hidden border-border ${
                    showAnswer ? 'bg-muted' : currentColors.bg
                  }`}
                  onClick={() => setShowAnswer(!showAnswer)}
                  data-testid="flashcard"
                >
                  <div className={`h-1.5 ${currentColors.strip}`} />
                  <CardContent className="p-8 flex flex-col">
                    <div className="flex justify-end mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${currentColors.badge}`}>
                        {currentColors.label}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {!showAnswer ? (
                        // Front of card
                        <div className="text-center">
                          <h2 className="text-5xl font-serif text-foreground mb-4">
                            {currentReviewWord?.word}
                          </h2>
                          <p className="text-lg text-muted-foreground">
                            {currentReviewWord?.reading}
                          </p>
                          <p className="text-sm text-muted-foreground mt-8">
                            Tap to reveal meaning
                          </p>
                        </div>
                      ) : (
                        // Back of card
                        <div className="text-center space-y-4">
                          <h2 className="text-3xl font-serif text-foreground">
                            {currentReviewWord?.word}
                          </h2>
                          <p className="text-lg text-secondary font-mono">
                            {currentReviewWord?.romaji}
                          </p>
                          <div className="space-y-1">
                            {currentReviewWord?.meanings.slice(0, 3).map((m, i) => (
                              <p key={i} className="text-lg text-foreground">{m}</p>
                            ))}
                          </div>
                          {currentReviewWord?.example_sentence && (
                            <div className="mt-4 p-3 bg-background rounded">
                              <p className="text-sm jp-text">{currentReviewWord.example_sentence}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Review Buttons */}
                {showAnswer && (
                  <div className="flex gap-4 mt-6 justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 max-w-[150px] border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleReviewAnswer(false)}
                      disabled={reviewing}
                      data-testid="review-incorrect"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Again
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 max-w-[150px] bg-success hover:bg-success/90"
                      onClick={() => handleReviewAnswer(true)}
                      disabled={reviewing}
                      data-testid="review-correct"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Got it!
                    </Button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (currentCardIndex > 0) {
                        setCurrentCardIndex(currentCardIndex - 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentCardIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (currentCardIndex < reviewWords.length - 1) {
                        setCurrentCardIndex(currentCardIndex + 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentCardIndex === reviewWords.length - 1}
                  >
                    Skip
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default VocabularyPage;
