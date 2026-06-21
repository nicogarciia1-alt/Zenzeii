import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getStats, getProgress, getVocabulary, getBooks } from '../lib/api';

const C = {
  bg: '#F9F7F2',
  surface: '#FFFFFF',
  primary: '#D3382F',
  primaryFaint: 'rgba(211,56,47,0.10)',  // web: bg-primary/10
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  muted: '#F0EFE9',                      // web: bg-muted
  success: '#4A7C59',
};

// ── Progress bar (replaces shadcn <Progress>) ─────────────────────────────

function ProgressBar({ value, color = C.primary }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Stat card — matches web's Card/CardHeader/CardContent pattern ─────────

function StatCard({ icon, label, value, sub }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <Ionicons name={icon} size={14} color={C.textMuted} style={{ marginRight: 5 }} />
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
      <Text style={styles.statCardValue} testID={`stat-${label.toLowerCase().replace(/ /g, '-')}`}>
        {value}
      </Text>
      <Text style={styles.statCardSub}>{sub}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { isPremium, isFounder } = useSubscription();
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, progressRes, vocabRes, booksRes] = await Promise.all([
        getStats(),
        getProgress(),
        getVocabulary(),
        getBooks(),
      ]);
      setStats(statsRes.data);
      setProgress(Array.isArray(progressRes.data) ? progressRes.data : []);
      setVocabulary(Array.isArray(vocabRes.data) ? vocabRes.data : []);
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
    } catch {
      // Non-fatal; empty states handle missing data
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ── Mastery distribution (matches web getMasteryDistribution) ─────────

  const masteryData = (() => {
    if (!stats?.mastery_distribution) return [];
    return [0, 1, 2, 3, 4, 5].map(level => ({
      level,
      count: stats.mastery_distribution[String(level)] || 0,
      label: level === 0 ? 'New' : level === 5 ? 'Mastered' : `Level ${level}`,
    }));
  })();
  const totalMasteryWords = masteryData.reduce((sum, d) => sum + d.count, 0);
  const masteryRate = totalMasteryWords > 0
    ? Math.round(((masteryData.find(d => d.level === 5)?.count || 0) / totalMasteryWords) * 100)
    : 0;

  // ── Book title lookup (matches web getBookTitle) ──────────────────────

  const getBookTitle = (bookId) => {
    const match = books.find(b => b.id === bookId);
    if (match) return match.title_jp || match.title;
    const cleaned = bookId.split('-').slice(1).join('-');
    return cleaned.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || bookId;
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Screen header with back button ── */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={styles.backText}>My Books</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
        }
      >

        {/* ── Profile header — matches web: avatar circle + username/email ── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={C.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.username} testID="profile-username">{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.editLink}>Edit profile — coming in Phase 1</Text>
          </View>
        </View>

        {/* ── Subscription card ── */}
        {isFounder ? (
          <View style={[styles.subCard, styles.subCardFounder]}>
            <Ionicons name="shield-checkmark" size={18} color={C.primary} />
            <View style={styles.subCardText}>
              <Text style={styles.subCardTitle}>Founding Member</Text>
              <Text style={styles.subCardSub}>Lifetime access · Thank you for your support.</Text>
            </View>
          </View>
        ) : isPremium ? (
          <View style={[styles.subCard, styles.subCardPremium]}>
            <Ionicons name="star" size={18} color={C.primary} />
            <View style={styles.subCardText}>
              <Text style={styles.subCardTitle}>Premium</Text>
              <Text style={styles.subCardSub}>Active subscription</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.subCardFree}
            onPress={() => navigation.navigate('Paywall')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Premium"
          >
            <View style={styles.subCardFreeLeft}>
              <Text style={styles.subCardFreeTitle}>Free plan</Text>
              <Text style={styles.subCardFreeSub}>Upgrade to unlock everything</Text>
            </View>
            <View style={styles.subCardUpgradeBtn}>
              <Text style={styles.subCardUpgradeBtnText}>Go Premium</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Stats grid — 2×2 on mobile (web is 1×4 on desktop) ── */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="book-open-outline"
            label="Vocabulary Size"
            value={String(stats?.vocabulary_count || 0)}
            sub="words saved"
          />
          <StatCard
            icon="time-outline"
            label="Books in Progress"
            value={String(stats?.books_in_progress || 0)}
            sub="currently reading"
          />
          <StatCard
            icon="bar-chart-outline"
            label="Words Read"
            value={String(stats?.total_words_read || 0)}
            sub="total estimated"
          />
          <StatCard
            icon="star-outline"
            label="Mastery Rate"
            value={`${masteryRate}%`}
            sub="words mastered"
          />
        </View>

        {/* ── Vocabulary Mastery card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vocabulary Mastery</Text>
          {totalMasteryWords === 0 ? (
            <Text style={styles.emptyCardText}>
              Save some words to see your mastery progress
            </Text>
          ) : (
            <View style={styles.masteryList}>
              {masteryData.map(({ level, count, label }) => (
                <View key={level} style={styles.masteryRow}>
                  <View style={styles.masteryLabelRow}>
                    <Text style={styles.masteryLabel}>{label}</Text>
                    <Text style={styles.masteryCount}>{count} words</Text>
                  </View>
                  <ProgressBar value={(count / totalMasteryWords) * 100} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Reading Progress card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reading Progress</Text>
          {progress.length === 0 ? (
            <Text style={styles.emptyCardText}>
              Start reading a book to track your progress
            </Text>
          ) : (
            <View testID="reading-progress-list">
              {progress.map((p) => (
                <View key={p.id} style={styles.progressItem}>
                  <View style={styles.progressItemLeft}>
                    <Text style={styles.progressBookTitle}>{getBookTitle(p.book_id)}</Text>
                    <Text style={styles.progressDate}>
                      Last read: {new Date(p.last_read).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.progressWordsRead}>{p.words_read} words</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Recently Saved Words card ── */}
        <View style={[styles.card, styles.cardLast]}>
          <Text style={styles.cardTitle}>Recently Saved Words</Text>
          {vocabulary.length === 0 ? (
            <Text style={styles.emptyCardText}>
              Save words while reading to build your vocabulary
            </Text>
          ) : (
            <View style={styles.wordChips} testID="recent-vocab">
              {vocabulary.slice(0, 20).map((word) => (
                <View key={word.id} style={styles.wordChip}>
                  <Text style={styles.wordChipWord}>{word.word}</Text>
                  {word.meanings[0] ? (
                    <Text style={styles.wordChipMeaning}> {word.meanings[0]}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Screen header ──
  screenHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '500',
  },

  // ── Profile header — web: flex items-center gap-4 mb-8 ──
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  // web: w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  // web: text-2xl font-serif text-foreground
  username: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 2,
  },
  // web: text-muted-foreground
  email: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 4,
  },
  // web: inline edit link in B5294E
  editLink: {
    fontSize: 13,
    color: C.textMuted,
    fontStyle: 'italic',
  },

  // ── Subscription card ──
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  subCardFounder: {
    backgroundColor: C.primaryFaint,
    borderColor: C.primary,
  },
  subCardPremium: {
    backgroundColor: C.primaryFaint,
    borderColor: C.border,
  },
  subCardText: { flex: 1 },
  subCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 1,
  },
  subCardSub: {
    fontSize: 12,
    color: C.textMuted,
  },
  subCardFree: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  subCardFreeLeft: { flex: 1 },
  subCardFreeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 1,
  },
  subCardFreeSub: {
    fontSize: 12,
    color: C.textMuted,
  },
  subCardUpgradeBtn: {
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  subCardUpgradeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Stats grid — 2×2 (web is 4 across on desktop, same 4 cards) ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  // web: Card with CardHeader/CardContent
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // web: text-sm font-medium text-muted-foreground
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textMuted,
    flexShrink: 1,
  },
  // web: text-3xl font-serif text-foreground
  statCardValue: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: C.textPrimary,
    lineHeight: 34,
    marginBottom: 2,
  },
  // web: text-xs text-muted-foreground
  statCardSub: {
    fontSize: 11,
    color: C.textMuted,
  },

  // ── Cards (Mastery, Reading Progress, Vocab) ──
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 16,
  },
  cardLast: {
    marginBottom: 8,
  },
  // web: CardTitle font-serif
  cardTitle: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 14,
  },
  emptyCardText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 22,
  },

  // ── Mastery distribution ──
  masteryList: { gap: 12 },
  masteryRow: { gap: 4 },
  masteryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // web: text-sm text-muted-foreground
  masteryLabel: { fontSize: 13, color: C.textMuted },
  // web: text-foreground font-medium
  masteryCount: { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  // Progress bar
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.muted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  // ── Reading progress items ──
  // web: flex items-center justify-between p-3 bg-muted rounded-lg
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.muted,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  progressItemLeft: { flex: 1, marginRight: 12 },
  // web: font-medium text-foreground
  progressBookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  // web: text-sm text-muted-foreground
  progressDate: { fontSize: 12, color: C.textMuted },
  // web: text-sm font-medium text-primary
  progressWordsRead: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'right',
  },

  // ── Word chips ──
  // web: flex flex-wrap gap-2
  wordChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // web: px-3 py-2 bg-muted rounded-lg text-sm
  wordChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: C.muted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  // web: font-serif text-foreground
  wordChipWord: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: C.textPrimary,
  },
  // web: text-muted-foreground ml-2
  wordChipMeaning: {
    fontSize: 12,
    color: C.textMuted,
  },
});
