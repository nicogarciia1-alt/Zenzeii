import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getVocabulary,
  getReviewWords,
  deleteSavedWord,
  updateSavedWord,
  submitReview,
} from '../lib/api';

// ── Color palette — direct hex translations of web's categoryColors.js ──────
// Web uses Tailwind classes; these are the exact hex values for those classes.

const CATEGORY_COLORS = {
  kanji: {
    bg: '#93C5FD',        // blue-300 (softened from blue-400 for card background readability)
    badgeBg: '#1D4ED8',   // blue-700
    badgeText: '#FFFFFF',
    label: '漢字',
  },
  verb: {
    bg: '#FDE68A',        // yellow-200 (softened)
    badgeBg: '#CA8A04',   // yellow-600
    badgeText: '#FFFFFF',
    label: 'Verb',
  },
  noun: {
    bg: '#FCD34D',        // amber-300 (softened)
    badgeBg: '#92400E',   // amber-800
    badgeText: '#FFFFFF',
    label: 'Noun',
  },
  adjective: {
    bg: '#C4B5FD',        // violet-300 (softened)
    badgeBg: '#6D28D9',   // violet-700
    badgeText: '#FFFFFF',
    label: 'Adj.',
  },
  expression: {
    bg: '#FCA5A5',        // rose-300 (softened)
    badgeBg: '#BE123C',   // rose-700
    badgeText: '#FFFFFF',
    label: 'Expr.',
  },
  particle: {
    bg: '#5EEAD4',        // teal-300 (softened)
    badgeBg: '#0F766E',   // teal-700
    badgeText: '#FFFFFF',
    label: 'Particle',
  },
  other: {
    bg: '#CBD5E1',        // slate-300
    badgeBg: '#475569',   // slate-600
    badgeText: '#FFFFFF',
    label: 'Other',
  },
};

// Words that are type='word' but have no category fall through to 'other'
const WORD_BADGE = {
  badgeBg: '#F59E0B',     // amber-500
  badgeText: '#FFFFFF',
  label: 'Word',
  bg: '#FEF3C7',          // amber-100
};

function getWordCategory(item) {
  if (item.type === 'kanji') return 'kanji';
  return item.category || 'other';
}

function getColors(item) {
  const cat = getWordCategory(item);
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
}

const C = {
  bg: '#F9F7F2',
  surface: '#FFFFFF',
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  success: '#4A7C59',
  successLight: '#EAF4EE',
  danger: '#D3382F',
  dangerLight: '#FEF0EF',
  romaji: '#4A7C59',    // web: text-secondary (green-ish)
};

const FILTER_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'word',       label: 'Words' },
  { value: 'kanji',      label: '漢字' },
  { value: 'verb',       label: 'Verbs' },
  { value: 'noun',       label: 'Nouns' },
  { value: 'adjective',  label: 'Adj.' },
  { value: 'particle',   label: 'Particles' },
  { value: 'expression', label: 'Expressions' },
  { value: 'other',      label: 'Other' },
];

// ── Mastery stars ────────────────────────────────────────────────────────────

function MasteryStars({ level }) {
  return (
    <View style={styles.starsRow}>
      {[0, 1, 2, 3, 4].map(i => (
        <Ionicons
          key={i}
          name={i < level ? 'star' : 'star-outline'}
          size={11}
          color={i < level ? '#F59E0B' : '#D1D5DB'}
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );
}

// ── Inline notes editor ───────────────────────────────────────────────────────

function NotesEditor({ word, onSave, onCancel }) {
  const [text, setText] = useState(word.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(word.id, text);
    setSaving(false);
  };

  return (
    <View style={styles.notesEditor}>
      <TextInput
        style={styles.notesInput}
        value={text}
        onChangeText={setText}
        placeholder="Add notes…"
        placeholderTextColor={C.textMuted}
        multiline
        numberOfLines={3}
        autoFocus
      />
      <View style={styles.notesButtons}>
        <TouchableOpacity
          style={styles.notesSaveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <><Ionicons name="checkmark" size={13} color="#FFFFFF" /><Text style={styles.notesSaveTxt}> Save</Text></>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.notesCancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={13} color={C.textSecondary} />
          <Text style={styles.notesCancelTxt}> Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Word card ─────────────────────────────────────────────────────────────────

function WordCard({ word, onDelete, onNotesUpdate }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const colors = getColors(word);

  const handleDelete = () => {
    Alert.alert(
      'Delete word?',
      `This will remove "${word.word}" from your vocabulary.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(word.id) },
      ]
    );
  };

  const handleSaveNotes = async (id, notes) => {
    await onNotesUpdate(id, notes);
    setEditingNotes(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bg }]} testID={`vocab-card-${word.id}`}>
      {/* ── Row 1: word + badge + stars ── */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.wordText}>{word.word}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: colors.badgeBg }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.badgeText }]}>
              {colors.label}
            </Text>
          </View>
        </View>
        <MasteryStars level={word.mastery_level} />
      </View>

      {/* ── Reading ── */}
      <Text style={styles.reading}>{word.reading}</Text>

      {/* ── Romaji ── */}
      <Text style={styles.romaji}>{word.romaji}</Text>

      {/* ── Parts of speech badges ── */}
      {word.parts_of_speech && word.parts_of_speech.length > 0 && (
        <View style={styles.posRow}>
          {word.parts_of_speech.slice(0, 2).map((pos, i) => (
            <View key={i} style={styles.posBadge}>
              <Text style={styles.posBadgeText}>{pos}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Meanings ── */}
      <View style={styles.meaningsBlock}>
        {word.meanings.slice(0, 3).map((m, i) => (
          <Text key={i} style={styles.meaning}>{i + 1}. {m}</Text>
        ))}
      </View>

      {/* ── Notes section ── */}
      {editingNotes ? (
        <NotesEditor
          word={word}
          onSave={handleSaveNotes}
          onCancel={() => setEditingNotes(false)}
        />
      ) : (
        <View>
          {word.notes ? (
            <View style={styles.notesDisplay}>
              <Text style={styles.notesText}>{word.notes}</Text>
            </View>
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setEditingNotes(true)}
              testID={`vocab-edit-btn-${word.id}`}
            >
              <Ionicons name="create-outline" size={13} color={C.textSecondary} />
              <Text style={styles.actionBtnText}> {word.notes ? 'Edit' : 'Add'} Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleDelete}
              testID={`vocab-delete-btn-${word.id}`}
            >
              <Ionicons name="trash-outline" size={13} color={C.danger} />
              <Text style={[styles.actionBtnText, { color: C.danger }]}> Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Flashcard review ──────────────────────────────────────────────────────────

function ReviewTab({ vocabulary, reviewWords }) {
  const [reviewDeck, setReviewDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const deckInitialized = useRef(false);

  useEffect(() => {
    if (vocabulary.length > 0 && !deckInitialized.current) {
      deckInitialized.current = true;
      setReviewDeck([...vocabulary].sort(() => Math.random() - 0.5));
    }
  }, [vocabulary]);

  const handleAnswer = async (correct) => {
    if (reviewDeck.length === 0 || submitting) return;
    setSubmitting(true);
    const word = reviewDeck[currentIndex];
    try {
      await submitReview(word.id, correct);
      if (correct) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (currentIndex < reviewDeck.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Reshuffle and restart
        setReviewDeck([...vocabulary].sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    } catch {
      Alert.alert('Error', 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (vocabulary.length === 0) {
    return (
      <View style={styles.reviewEmpty}>
        <Text style={styles.reviewEmptyText}>
          Save some words while reading to start reviewing them.
        </Text>
      </View>
    );
  }

  const card = reviewDeck[currentIndex];
  if (!card) return null;

  const colors = getColors(card);

  return (
    <ScrollView
      contentContainerStyle={styles.reviewContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Progress ── */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Card {currentIndex + 1} of {reviewDeck.length}
        </Text>
      </View>

      {/* ── Flashcard ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowAnswer(s => !s)}
        style={[styles.flashcard, { backgroundColor: showAnswer ? '#F0EFE9' : colors.bg }]}
        testID="flashcard"
      >
        {/* Category badge top-right */}
        <View style={styles.flashcardBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.badgeBg }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.badgeText }]}>
              {colors.label}
            </Text>
          </View>
        </View>

        {!showAnswer ? (
          // Front
          <View style={styles.flashcardFront}>
            <Text style={styles.flashcardWord}>{card.word}</Text>
            <Text style={styles.flashcardReading}>{card.reading}</Text>
            <Text style={styles.flashcardHint}>Tap to reveal meaning</Text>
          </View>
        ) : (
          // Back
          <View style={styles.flashcardBack}>
            <Text style={styles.flashcardWordBack}>{card.word}</Text>
            <Text style={styles.flashcardRomajiBack}>{card.romaji}</Text>
            <View style={styles.flashcardMeanings}>
              {card.meanings.slice(0, 3).map((m, i) => (
                <Text key={i} style={styles.flashcardMeaning}>{m}</Text>
              ))}
            </View>
            {card.example_sentence ? (
              <View style={styles.exampleBlock}>
                <Text style={styles.exampleSentence}>{card.example_sentence}</Text>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>

      {/* ── Again / Got it ── */}
      {showAnswer && (
        <View style={styles.reviewButtons}>
          <TouchableOpacity
            style={[styles.reviewBtn, styles.reviewBtnAgain]}
            onPress={() => handleAnswer(false)}
            disabled={submitting}
            testID="review-incorrect"
          >
            {submitting
              ? <ActivityIndicator size="small" color={C.danger} />
              : <><Ionicons name="close" size={18} color={C.danger} /><Text style={[styles.reviewBtnText, { color: C.danger }]}> Again</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewBtn, styles.reviewBtnCorrect]}
            onPress={() => handleAnswer(true)}
            disabled={submitting}
            testID="review-correct"
          >
            {submitting
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <><Ionicons name="checkmark" size={18} color="#FFFFFF" /><Text style={[styles.reviewBtnText, { color: '#FFFFFF' }]}> Got it!</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── Previous / Skip ── */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setShowAnswer(false); } }}
          disabled={currentIndex === 0}
        >
          <Ionicons name="chevron-back" size={16} color={currentIndex === 0 ? C.textMuted : C.textSecondary} />
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnDisabled]}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => { if (currentIndex < reviewDeck.length - 1) { setCurrentIndex(i => i + 1); setShowAnswer(false); } }}
          disabled={currentIndex === reviewDeck.length - 1}
        >
          <Text style={[styles.navBtnText, currentIndex === reviewDeck.length - 1 && styles.navBtnDisabled]}>Skip</Text>
          <Ionicons name="chevron-forward" size={16} color={currentIndex === reviewDeck.length - 1 ? C.textMuted : C.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function VocabularyScreen() {
  const [vocabulary, setVocabulary] = useState([]);
  const [reviewWords, setReviewWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState('words');     // 'words' | 'review'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [vocabRes, reviewRes] = await Promise.all([
        getVocabulary(),
        getReviewWords(),
      ]);
      setVocabulary(Array.isArray(vocabRes.data) ? vocabRes.data : []);
      setReviewWords(Array.isArray(reviewRes.data) ? reviewRes.data : []);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleDelete = useCallback(async (wordId) => {
    try {
      await deleteSavedWord(wordId);
      setVocabulary(v => v.filter(w => w.id !== wordId));
    } catch {
      Alert.alert('Error', 'Failed to delete word.');
    }
  }, []);

  const handleNotesUpdate = useCallback(async (wordId, notes) => {
    try {
      await updateSavedWord(wordId, { notes });
      setVocabulary(v => v.map(w => w.id === wordId ? { ...w, notes } : w));
    } catch {
      Alert.alert('Error', 'Failed to save notes.');
    }
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredVocabulary = vocabulary.filter(word => {
    const wordType = word.type || 'word';
    if (activeFilter === 'word') {
      if (wordType !== 'word') return false;
    } else if (activeFilter === 'kanji') {
      if (wordType !== 'kanji') return false;
    } else if (activeFilter !== 'all') {
      if (wordType !== 'word') return false;
      if (getWordCategory(word) !== activeFilter) return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      word.word.includes(searchQuery) ||
      word.reading.includes(searchQuery) ||
      word.romaji.toLowerCase().includes(q) ||
      word.meanings.some(m => m.toLowerCase().includes(q))
    );
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Page header — matches web: text-3xl font-serif + muted subtitle ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Vocabulary</Text>
        <Text style={styles.pageSubtitle}>
          {vocabulary.length} {vocabulary.length === 1 ? 'word' : 'words'} saved
          {reviewWords.length > 0 ? ` · ${reviewWords.length} due for review` : ''}
        </Text>
      </View>

      {/* ── Top tabs: Word List | Review ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mainTab === 'words' && styles.tabActive]}
          onPress={() => setMainTab('words')}
          testID="vocab-tab-words"
        >
          <Ionicons
            name="book-open-outline"
            size={15}
            color={mainTab === 'words' ? C.primary : C.textMuted}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.tabText, mainTab === 'words' && styles.tabTextActive]}>
            Word List ({vocabulary.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mainTab === 'review' && styles.tabActive]}
          onPress={() => setMainTab('review')}
          testID="vocab-tab-review"
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color={mainTab === 'review' ? C.primary : C.textMuted}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.tabText, mainTab === 'review' && styles.tabTextActive]}>
            Review ({reviewWords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Word List tab ── */}
      {mainTab === 'words' && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={C.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search words…"
              placeholderTextColor={C.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              testID="vocab-search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips — horizontal scroll (web wraps; phone adapts to scroll) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.filterBar}
          >
            {FILTER_TABS.map(({ value, label }) => {
              const isActive = activeFilter === value;
              const chipColors = isActive && value !== 'all' && value !== 'word'
                ? CATEGORY_COLORS[value]
                : null;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.filterChip,
                    isActive && !chipColors && styles.filterChipActiveDefault,
                    chipColors && { backgroundColor: chipColors.badgeBg, borderColor: chipColors.badgeBg },
                  ]}
                  onPress={() => setActiveFilter(value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && !chipColors && styles.filterChipTextActive,
                      chipColors && { color: '#FFFFFF' },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Word cards */}
          <FlatList
            data={filteredVocabulary}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <WordCard
                word={item}
                onDelete={handleDelete}
                onNotesUpdate={handleNotesUpdate}
              />
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData(true)}
                tintColor={C.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>語</Text>
                <Text style={styles.emptyTitle}>
                  {vocabulary.length === 0 ? 'No saved words yet' : 'No matching words'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {vocabulary.length === 0
                    ? 'Tap on words while reading to save them'
                    : 'Try a different search or filter'}
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      )}

      {/* ── Review tab ── */}
      {mainTab === 'review' && (
        <ReviewTab vocabulary={vocabulary} reviewWords={reviewWords} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // ── Page header ──
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },

  // ── Main tabs ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.primary,
    fontWeight: '600',
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    height: 40,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.surface,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 7 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
  },

  // ── Filter chips ──
  filterBar: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  filterChipActiveDefault: {
    backgroundColor: '#2B2B2B',
    borderColor: '#2B2B2B',
  },
  filterChipText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ── Word list ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // ── Word card ──
  card: {
    borderWidth: 1,
    borderColor: '#2B2B2B',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  wordText: {
    fontFamily: 'Georgia',
    fontSize: 26,
    color: C.textPrimary,
    lineHeight: 30,
  },
  categoryBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 6,
  },
  reading: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 3,
  },
  romaji: {
    fontSize: 13,
    color: C.romaji,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  posRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  posBadge: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  posBadgeText: {
    fontSize: 11,
    color: C.textSecondary,
  },
  meaningsBlock: {
    marginBottom: 10,
  },
  meaning: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 21,
  },

  // ── Notes ──
  notesDisplay: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 13,
    color: C.textSecondary,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  notesEditor: {
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.surface,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  notesButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  notesSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notesSaveTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  notesCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  notesCancelTxt: {
    color: C.textSecondary,
    fontSize: 13,
  },

  // ── Card actions ──
  cardActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(211,56,47,0.07)',
  },
  actionBtnText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 52,
    opacity: 0.1,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Review tab ──
  reviewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  reviewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  reviewEmptyText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Progress row
  progressRow: {
    marginBottom: 14,
  },
  progressText: {
    fontSize: 13,
    color: C.textMuted,
  },

  // Flashcard
  flashcard: {
    borderWidth: 1,
    borderColor: '#2B2B2B',
    borderRadius: 10,
    minHeight: 280,
    padding: 20,
    marginBottom: 20,
  },
  flashcardBadgeRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  flashcardFront: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  flashcardWord: {
    fontFamily: 'Georgia',
    fontSize: 52,
    color: C.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  flashcardReading: {
    fontSize: 18,
    color: C.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  flashcardHint: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
  },
  flashcardBack: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  flashcardWordBack: {
    fontFamily: 'Georgia',
    fontSize: 32,
    color: C.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  flashcardRomajiBack: {
    fontSize: 17,
    color: C.romaji,
    fontWeight: '500',
    marginBottom: 14,
    textAlign: 'center',
  },
  flashcardMeanings: {
    marginBottom: 14,
    alignItems: 'center',
  },
  flashcardMeaning: {
    fontSize: 17,
    color: C.textPrimary,
    lineHeight: 26,
    textAlign: 'center',
  },
  exampleBlock: {
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginTop: 4,
  },
  exampleSentence: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Review buttons
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 150,
    paddingVertical: 13,
    borderRadius: 10,
  },
  reviewBtnAgain: {
    borderWidth: 1.5,
    borderColor: C.danger,
    backgroundColor: 'transparent',
  },
  reviewBtnCorrect: {
    backgroundColor: C.success,
  },
  reviewBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  navBtnText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  navBtnDisabled: {
    color: C.textMuted,
  },
});
