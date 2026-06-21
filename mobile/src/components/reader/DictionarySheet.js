import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { lookupWord, saveWord, explainWord } from '../../lib/api';
import { storeDictEntry, getCachedDictEntry } from '../../lib/offlineStorage';
import { enqueue } from '../../lib/offlineQueue';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const C = {
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  muted: '#F0EFE9',
  success: '#4A7C59',
};

const CATEGORY_BADGE = {
  kanji:      { bg: '#1D4ED8', text: '#FFFFFF', label: '漢字' },
  verb:       { bg: '#CA8A04', text: '#FFFFFF', label: 'Verb' },
  noun:       { bg: '#92400E', text: '#FFFFFF', label: 'Noun' },
  adjective:  { bg: '#6D28D9', text: '#FFFFFF', label: 'Adjective' },
  expression: { bg: '#BE123C', text: '#FFFFFF', label: 'Expression' },
  particle:   { bg: '#0F766E', text: '#FFFFFF', label: 'Particle' },
  other:      { bg: '#475569', text: '#FFFFFF', label: 'Other' },
};

function isCJK(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

function posToCategory(pos) {
  if (!pos) return 'other';
  if (pos === '動詞') return 'verb';
  if (pos === '名詞') return 'noun';
  if (pos === '形容詞' || pos === '形状詞') return 'adjective';
  if (pos === '助詞') return 'particle';
  if (pos === '副詞' || pos === '感動詞' || pos === '接続詞') return 'expression';
  return 'other';
}

function getWordCategory(item) {
  if (item.type === 'kanji') return 'kanji';
  return item.category || 'other';
}

export default function DictionarySheet({
  visible,
  word,
  pos,
  contextSentence,
  savedWords,
  onClose,
  onWordSaved,
}) {
  const insets = useSafeAreaInsets();

  const [wordData, setWordData] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false); // queued, not yet synced
  const [savedKanji, setSavedKanji] = useState({});

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiError, setAiError] = useState('');

  // ── Lookup on each new word ───────────────────────────────────────────────
  // Always tries the API. On success the result is cached (write-through).
  // On failure the cache is checked so previously-looked-up words work offline.
  useEffect(() => {
    if (!word || !visible) return;
    let cancelled = false;

    setWordData(null);
    setLookingUp(true);
    setSaved(savedWords.some(w => w.word === word));
    setSaving(false);
    setSavedOffline(false);
    setSavedKanji({});
    setAiOpen(false);
    setAiExplanation('');
    setAiError('');

    lookupWord(word)
      .then(res => {
        if (cancelled) return;
        setWordData(res.data);
        storeDictEntry(word, res.data); // write-through: cache every successful lookup
      })
      .catch(async () => {
        if (cancelled) return;
        const cached = await getCachedDictEntry(word);
        if (cached) {
          setWordData(cached);
        } else {
          setWordData({
            word,
            reading: '',
            romaji: '',
            meanings: ['Definition not available offline'],
            parts_of_speech: [],
            _offlineNotFound: true,
          });
        }
      })
      .finally(() => { if (!cancelled) setLookingUp(false); });

    return () => { cancelled = true; };
  }, [word, visible]);

  const kanjiBreakdown = useMemo(() => {
    if (!wordData?.word) return [];
    return [...wordData.word].map(char => ({
      char,
      isKanji: isCJK(char),
      alreadySaved: savedWords.some(w => w.word === char && w.type === 'kanji'),
    }));
  }, [wordData?.word, savedWords]);

  const showBreakdown = wordData?.word?.length > 1 && kanjiBreakdown.some(c => c.isKanji);

  const savedEntry = savedWords.find(w => w.word === wordData?.word);
  const displayCategory = saved
    ? savedEntry
      ? getWordCategory(savedEntry)
      : (wordData?.word?.length === 1 && isCJK(wordData.word[0]) ? 'kanji' : posToCategory(pos))
    : null;
  const badgeColors = displayCategory ? CATEGORY_BADGE[displayCategory] : null;

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving || saved || savedOffline || !wordData || wordData._offlineNotFound) return;
    setSaving(true);

    const type = wordData.word.length === 1 && isCJK(wordData.word[0]) ? 'kanji' : 'word';
    const payload = {
      word: wordData.word,
      reading: wordData.reading || '',
      romaji: wordData.romaji || '',
      meanings: wordData.meanings || [],
      parts_of_speech: wordData.parts_of_speech || [],
      example_sentence: wordData.example_sentence,
      example_translation: wordData.example_translation,
      type,
      ...(type === 'word' && { category: posToCategory(pos) }),
    };

    try {
      const res = await saveWord(payload);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSaved(true);
      onWordSaved?.(res.data);
    } catch (error) {
      if (error.response?.status === 400) {
        // Word already exists on server
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSaved(true);
      } else {
        // Network unavailable — queue the save for when connection returns
        await enqueue('saveWord', payload);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSavedOffline(true);
        // Notify parent so the highlight appears immediately this session
        onWordSaved?.({ ...payload, id: `offline-${Date.now()}`, _offline: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKanji = async (char) => {
    if (savedKanji[char] === 'saved' || savedKanji[char] === 'saving') return;
    setSavedKanji(prev => ({ ...prev, [char]: 'saving' }));
    const payload = { word: char, reading: '', romaji: '', meanings: [], parts_of_speech: [], type: 'kanji' };
    try {
      const res = await saveWord(payload);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSavedKanji(prev => ({ ...prev, [char]: 'saved' }));
      onWordSaved?.(res.data);
    } catch (error) {
      if (error.response?.status === 400) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSavedKanji(prev => ({ ...prev, [char]: 'saved' }));
      } else {
        // Queue it
        await enqueue('saveWord', payload);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSavedKanji(prev => ({ ...prev, [char]: 'saved' }));
        onWordSaved?.({ ...payload, id: `offline-${Date.now()}`, _offline: true });
      }
    }
  };

  const handleAskZenzeii = async () => {
    setAiOpen(true);
    if (aiExplanation) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await explainWord(wordData.word, contextSentence);
      setAiExplanation(res.data.explanation);
    } catch {
      setAiError('Could not fetch explanation. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { maxHeight: SCREEN_HEIGHT * 0.72 }]}>
          <View style={styles.handle} />

          {/* Fixed header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.wordRow}>
                <Text style={styles.wordText}>{word}</Text>
                <Text style={styles.speakerDisabled}>🔊</Text>
              </View>
              {!lookingUp && wordData?.reading ? (
                <Text style={styles.readingText}>{wordData.reading}</Text>
              ) : null}
              {badgeColors && (
                <View style={[styles.categoryBadge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.categoryBadgeText, { color: badgeColors.text }]}>
                    {badgeColors.label}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {lookingUp && (
            <View style={styles.loadingBody}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          )}

          {!lookingUp && wordData && (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 80 }}
              showsVerticalScrollIndicator={false}
            >
              {wordData.romaji ? (
                <Text style={styles.romajiText}>{wordData.romaji}</Text>
              ) : null}

              {showBreakdown && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Breakdown</Text>
                  <View style={styles.breakdownRow}>
                    {kanjiBreakdown.map(({ char, isKanji, alreadySaved }, i) => {
                      const state = savedKanji[char];
                      const isSaved = alreadySaved || state === 'saved';
                      const isSaving = state === 'saving';
                      if (!isKanji) {
                        return <Text key={i} style={styles.breakdownPlain}>{char}</Text>;
                      }
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => handleSaveKanji(char)}
                          disabled={isSaved || isSaving}
                          style={[
                            styles.kanjiChip,
                            isSaved && styles.kanjiChipSaved,
                            isSaving && styles.kanjiChipSaving,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.kanjiChipText, isSaved && styles.kanjiChipTextSaved]}>
                            {char}
                          </Text>
                          {isSaved && (
                            <Ionicons name="checkmark" size={11} color="#0369A1" style={{ marginLeft: 2 }} />
                          )}
                          {isSaving && (
                            <ActivityIndicator size="small" color={C.textMuted} style={{ marginLeft: 2, transform: [{ scale: 0.5 }] }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {wordData.parts_of_speech?.length > 0 && (
                <View style={styles.posBadges}>
                  {wordData.parts_of_speech.slice(0, 3).map((p, i) => (
                    <View key={i} style={styles.posBadge}>
                      <Text style={styles.posBadgeText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Meanings</Text>
                {wordData.meanings?.slice(0, 5).map((meaning, i) => (
                  <Text key={i} style={styles.meaningLine}>{i + 1}. {meaning}</Text>
                ))}
              </View>

              {wordData.example_sentence ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Example</Text>
                  <View style={styles.exampleBlock}>
                    <Text style={styles.exampleSentence}>{wordData.example_sentence}</Text>
                    {wordData.example_translation ? (
                      <Text style={styles.exampleTranslation}>{wordData.example_translation}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Ask Zenzeii — disabled when definition came from offline cache */}
              {!wordData._offlineNotFound && (
                <View style={styles.section}>
                  {!aiOpen ? (
                    <TouchableOpacity onPress={handleAskZenzeii} style={styles.aiButton} activeOpacity={0.7}>
                      <Text style={styles.aiButtonText}>✦ Ask Zenzeii</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.aiCard}>
                      <View style={styles.aiCardHeader}>
                        <Text style={styles.aiCardTitle}>✦ Zenzeii explains</Text>
                        {aiLoading && <ActivityIndicator size="small" color={C.primary} />}
                      </View>
                      {aiLoading ? (
                        <Text style={styles.aiCardMuted}>Thinking…</Text>
                      ) : aiError ? (
                        <Text style={styles.aiCardError}>{aiError}</Text>
                      ) : (
                        <Text style={styles.aiCardText}>{aiExplanation}</Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* Fixed save button */}
          {!lookingUp && wordData && !wordData._offlineNotFound && (
            <View style={[styles.saveRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || saved || savedOffline}
                style={[
                  styles.saveButton,
                  (saved || savedOffline) && styles.saveButtonSaved,
                ]}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : saved ? (
                  <Ionicons name="checkmark" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
                ) : savedOffline ? (
                  <Ionicons name="cloud-upload-outline" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.saveButtonText, (saved || savedOffline) && styles.saveButtonTextSaved]}>
                  {saved ? 'Saved' : savedOffline ? 'Saved (syncing)' : 'Save to Vocabulary'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D4D4D4',
    alignSelf: 'center', marginTop: 10, marginBottom: 2,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordText: {
    fontFamily: 'Georgia', fontSize: 28, fontWeight: '700',
    color: C.textPrimary, lineHeight: 34,
  },
  speakerDisabled: { fontSize: 18, opacity: 0.3 },
  readingText: { fontSize: 14, color: C.textMuted, marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 6,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  closeButton: { padding: 4 },

  loadingBody: { height: 140, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 20 },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 10, color: C.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  romajiText: { fontSize: 13, color: C.success, fontFamily: 'System', marginTop: 12 },

  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  breakdownPlain: { fontFamily: 'NotoSerifJP', fontSize: 15, color: C.textMuted },
  kanjiChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 5, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF',
  },
  kanjiChipSaved: { backgroundColor: '#EFF6FF', borderColor: '#BAE6FD' },
  kanjiChipSaving: { backgroundColor: C.muted, borderColor: C.border },
  kanjiChipText: { fontFamily: 'NotoSerifJP', fontSize: 15, color: C.textPrimary },
  kanjiChipTextSaved: { color: '#0369A1' },

  posBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  posBadge: { backgroundColor: C.muted, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  posBadgeText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  meaningLine: { fontSize: 14, color: C.textPrimary, lineHeight: 22, marginBottom: 2 },

  exampleBlock: { backgroundColor: C.muted, borderRadius: 8, padding: 12 },
  exampleSentence: { fontFamily: 'NotoSerifJP', fontSize: 14, color: C.textPrimary, lineHeight: 22 },
  exampleTranslation: { fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 18 },

  aiButton: { borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 9, alignItems: 'center' },
  aiButtonText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  aiCard: { borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: 'rgba(240,239,233,0.7)', padding: 12 },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  aiCardTitle: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  aiCardMuted: { fontSize: 12, color: C.textMuted },
  aiCardError: { fontSize: 12, color: C.primary },
  aiCardText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },

  saveRow: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primary, borderRadius: 8, paddingVertical: 13,
  },
  saveButtonSaved: { backgroundColor: C.muted },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  saveButtonTextSaved: { color: C.textSecondary },
});
