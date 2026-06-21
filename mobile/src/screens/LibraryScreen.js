import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { importBook } from '../lib/api';

// ── Screen metrics — computed once at module load ─────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
// 2-column grid: 16px padding each side + 12px gap between columns
const COVER_W = Math.floor((SCREEN_W - 32 - 12) / 2);
const COVER_H = Math.floor(COVER_W * 1.45);
const COVER_MARGIN = Math.floor(COVER_W * 0.07);
const INNER_W = COVER_W - COVER_MARGIN * 2;
const TITLE_FS  = Math.max(11, Math.floor(COVER_W * 0.085));
const AUTHOR_FS = Math.max(8,  Math.floor(COVER_W * 0.06));
const DECO_FS   = Math.max(20, Math.floor(COVER_W * 0.16));

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: '#F9F7F2',
  surface: '#FFFFFF',
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
};

// ── Curated books — identical to web ZenzeiiLibraryPage.jsx ──────────────────
const CURATED_BOOKS = [
  {
    genre: 'Modern Literature',
    books: [
      { title: '吾輩は猫である', author: '夏目漱石', author_en: 'Natsume Soseki',        description: 'A satirical novel narrated by a cat observing the absurdities of Meiji-era Japan.', book_key: 'wagahai-wa-neko',   source: 'aozora' },
      { title: '坊っちゃん',     author: '夏目漱石', author_en: 'Natsume Soseki',        description: 'A spirited young teacher from Tokyo struggles with rural provincial life.',             book_key: 'botchan',            source: 'aozora' },
      { title: '人間失格',       author: '太宰治',   author_en: 'Osamu Dazai',           description: 'A confessional tale of alienation and self-destruction in modern Japan.',             book_key: 'ningen-shikkaku',    source: 'aozora' },
      { title: '羅生門',         author: '芥川龍之介', author_en: 'Ryunosuke Akutagawa', description: 'A servant makes a moral choice in the ruins of Heian-era Kyoto.',                    book_key: 'rashomon',           source: 'aozora' },
      { title: '鼻',             author: '芥川龍之介', author_en: 'Ryunosuke Akutagawa', description: 'A monk obsessed with his unusually long nose seeks a cure.',                          book_key: 'hana',               source: 'aozora' },
    ],
  },
  {
    genre: 'Lyrical & Poetic',
    books: [
      { title: '雪国',     author: '川端康成', author_en: 'Yasunari Kawabata', description: 'A melancholic love story set in the snow country of northern Japan.',            book_key: 'snow-country',    source: 'aozora' },
      { title: '伊豆の踊子', author: '川端康成', author_en: 'Yasunari Kawabata', description: 'A student encounters a young traveling dancer on the Izu Peninsula.',           book_key: 'izu-no-odoriko',  source: 'aozora' },
    ],
  },
  {
    genre: 'Ghost Stories',
    books: [
      { title: '怪談',   author: 'ラフカディオ・ハーン', author_en: 'Lafcadio Hearn',       description: 'Classic Japanese ghost stories and supernatural folk tales.',                           book_key: 'kwaidan',       source: 'aozora' },
      { title: '藪の中', author: '芥川龍之介',           author_en: 'Ryunosuke Akutagawa',  description: 'A murder told through contradictory accounts — the story that inspired Rashomon.',  book_key: 'yabu-no-naka',  source: 'aozora' },
    ],
  },
  {
    genre: 'Historical',
    books: [
      { title: '高瀬舟', author: '森鴎外', author_en: 'Mori Ogai', description: 'A philosophical tale of a man transported on a boat to exile.', book_key: 'takasebune', source: 'aozora' },
    ],
  },
  {
    genre: 'Poetry',
    books: [
      { title: '春と修羅', author: '宮沢賢治', author_en: 'Kenji Miyazawa', description: 'Visionary poetry exploring nature, science, and Buddhist themes.', book_key: 'haru-to-shura', source: 'aozora' },
    ],
  },
];

// ── GeneratedBookCover ────────────────────────────────────────────────────────
// Port of frontend/src/components/books/GeneratedBookCover.jsx
// Deterministic: same title always maps to same palette and deco character.

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Literary publisher palette — rich, muted, high-contrast (exact web values)
const PALETTES = [
  { bg: '#B5451B', text: '#FFF8F0', accent: '#FFD0A8', rule: '#FF9060' }, // Terracotta
  { bg: '#1B3A5C', text: '#EFF5FF', accent: '#A8C8EC', rule: '#5898CC' }, // Midnight blue
  { bg: '#2A5233', text: '#F0FFF4', accent: '#96D4A0', rule: '#4EAA60' }, // Forest green
  { bg: '#5C1B3A', text: '#FFF0F6', accent: '#ECA8C4', rule: '#CC5888' }, // Plum
  { bg: '#1A4A4A', text: '#F0FFFE', accent: '#80D4D0', rule: '#30A8A0' }, // Deep teal
  { bg: '#3D1A5C', text: '#F8F2FF', accent: '#C4A0EC', rule: '#9060CC' }, // Violet
  { bg: '#5C3A1B', text: '#FFF6EC', accent: '#EABF90', rule: '#CC8840' }, // Warm amber
  { bg: '#1B1B5C', text: '#F2F2FF', accent: '#9898EC', rule: '#5050CC' }, // Indigo
  { bg: '#3A3A3A', text: '#FAF8F4', accent: '#D4C8B0', rule: '#A89878' }, // Charcoal
  { bg: '#1B5C40', text: '#F0FFF8', accent: '#88E0B8', rule: '#30B878' }, // Emerald
  { bg: '#5C4A1B', text: '#FFFBF0', accent: '#ECD898', rule: '#CCAC40' }, // Gold
  { bg: '#5C1B1B', text: '#FFF4F0', accent: '#ECA898', rule: '#CC5040' }, // Crimson
];

const DECO_CHARS = ['書', '文', '語', '詩', '話', '夢', '心', '道', '空', '風', '月', '光'];

function GeneratedBookCover({ title, authorEn }) {
  const p    = PALETTES[hashString(title) % PALETTES.length];
  const deco = DECO_CHARS[hashString(authorEn + title) % DECO_CHARS.length];

  return (
    <View style={[cs.cover, { backgroundColor: p.bg }]}>
      <View style={[cs.inner, { margin: COVER_MARGIN }]}>

        {/* Top rule — thick + thin (web: 2px rule + 1px accent 50%) */}
        <View style={{ marginBottom: Math.floor(COVER_H * 0.07) }}>
          <View style={{ height: 2, backgroundColor: p.rule }} />
          <View style={{ height: 3 }} />
          <View style={{ height: 1, backgroundColor: p.accent, opacity: 0.5 }} />
        </View>

        {/* Center — title / divider rule / author */}
        <View style={cs.center}>
          <Text style={[cs.coverTitle, { color: p.text }]} numberOfLines={4}>
            {title}
          </Text>
          <View style={{ height: Math.floor(COVER_H * 0.04) }} />
          {/* web: thin 45%-width accent rule at 70% opacity */}
          <View style={{ height: 1, backgroundColor: p.accent, opacity: 0.7, width: Math.floor(INNER_W * 0.45) }} />
          <View style={{ height: Math.floor(COVER_H * 0.04) }} />
          {/* web: 0.6em uppercase letterSpacing 0.12em accent color */}
          <Text style={[cs.coverAuthor, { color: p.accent }]} numberOfLines={2}>
            {authorEn.toUpperCase()}
          </Text>
        </View>

        {/* Decorative kanji — accent, 25% opacity, bottom of center area */}
        <View style={[cs.decoRow, { paddingTop: Math.floor(COVER_H * 0.05) }]}>
          <Text style={[cs.decoChar, { color: p.accent }]}>{deco}</Text>
        </View>

        {/* Bottom rule — mirror of top */}
        <View style={{ marginTop: Math.floor(COVER_H * 0.04) }}>
          <View style={{ height: 1, backgroundColor: p.accent, opacity: 0.5 }} />
          <View style={{ height: 3 }} />
          <View style={{ height: 2, backgroundColor: p.rule }} />
        </View>

      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  cover: { width: COVER_W, height: COVER_H, borderRadius: 4, overflow: 'hidden' },
  inner: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // web: Noto Serif JP 0.9em fontWeight 600 lineHeight 1.35 letterSpacing 0.02em
  coverTitle: {
    fontFamily: 'NotoSerifJP',
    fontSize: TITLE_FS,
    fontWeight: '600',
    lineHeight: Math.floor(TITLE_FS * 1.35),
    letterSpacing: 0.3,
    textAlign: 'center',
    width: '100%',
  },
  // web: Inter/sans 0.6em uppercase letterSpacing 0.12em accent
  coverAuthor: {
    fontSize: AUTHOR_FS,
    letterSpacing: Math.max(1.2, AUTHOR_FS * 0.12),
    textAlign: 'center',
    width: '100%',
  },
  decoRow: { flexShrink: 0, alignItems: 'center' },
  // web: Noto Serif JP 1.6em accent opacity 0.25
  decoChar: {
    fontFamily: 'NotoSerifJP',
    fontSize: DECO_FS,
    opacity: 0.25,
    lineHeight: Math.floor(DECO_FS * 1.1),
  },
});

// ── LibraryScreen ─────────────────────────────────────────────────────────────

export default function LibraryScreen({ navigation }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addedBook, setAddedBook] = useState(null); // { id, title } from import response

  const closeModal = () => {
    if (adding) return;
    setSelectedBook(null);
    setAdded(false);
    setAddedBook(null);
  };

  const handleAddBook = async () => {
    if (!selectedBook || adding) return;
    setAdding(true);
    try {
      const res = await importBook({ book_key: selectedBook.book_key, source: selectedBook.source });
      setAddedBook({
        id: res.data?.id,
        title: res.data?.title_jp || res.data?.title || selectedBook.title,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAdded(true);
    } catch {
      Alert.alert('Could not add book', 'Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleReadNow = () => {
    const book = addedBook;
    closeModal();
    if (book?.id) {
      navigation.navigate('MyBooks', {
        screen: 'Reader',
        params: { bookId: book.id, bookTitle: book.title },
      });
    } else {
      // Import response had no ID — go to My Books tab and let the user tap when ready
      navigation.navigate('MyBooks');
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        {/* web: garamond 2.5rem fontWeight 600, border-bottom pb-24 mb-40 */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Zenzeii Library</Text>
          <Text style={s.pageSubtitle}>A curated collection of Japanese literary classics</Text>
        </View>

        {/* ── Genre sections ───────────────────────────────────────────────── */}
        {CURATED_BOOKS.map((section, si) => (
          <View
            key={section.genre}
            style={[s.section, si === CURATED_BOOKS.length - 1 && s.sectionLast]}
          >
            {/* web: garamond 1.3rem fontWeight 600, border-bottom pb-8 mb-20 */}
            <View style={s.genreHeader}>
              <Text style={s.genreName}>{section.genre}</Text>
            </View>

            {/* 2-column grid — web: grid auto-fill minmax(160px, 1fr) gap-20 */}
            <View style={s.grid}>
              {section.books.map(book => (
                <TouchableOpacity
                  key={book.book_key}
                  onPress={() => setSelectedBook(book)}
                  activeOpacity={0.82}
                  style={s.bookItem}
                >
                  <GeneratedBookCover title={book.title} authorEn={book.author_en} />
                  {/* web: garamond 0.85rem fontWeight 500 foreground */}
                  <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
                  {/* web: garamond 0.8rem muted-foreground */}
                  <Text style={s.bookAuthorEn} numberOfLines={1}>{book.author_en}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Book preview modal ───────────────────────────────────────────────── */}
      {/* web: fixed inset-0 z-200 rgba(0,0,0,0.5), centered card maxWidth 420 p-32 */}
      <Modal
        visible={!!selectedBook}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={s.backdrop} onPress={closeModal} activeOpacity={1}>
          {selectedBook && (
            <TouchableOpacity style={s.modalCard} activeOpacity={1} onPress={() => {}}>

              {/* web: 0.8rem muted letterSpacing 0.08em */}
              <Text style={s.modalAuthorEn}>{selectedBook.author_en}</Text>

              {/* web: garamond 1.8rem fontWeight 600 foreground */}
              <Text style={s.modalTitle}>{selectedBook.title}</Text>

              {/* web: garamond 1rem muted */}
              <Text style={s.modalAuthorJp}>{selectedBook.author}</Text>

              {/* web: garamond 1rem lineHeight 1.7 foreground mb-24 */}
              <Text style={s.modalDescription}>{selectedBook.description}</Text>

              {added ? (
                // ── Success state ───────────────────────────────────────────
                <>
                  {/* Quiet literary confirmation — Georgia italic, success green */}
                  <Text style={s.modalSuccessLine}>✓ Added to your library</Text>
                  <View style={s.modalButtons}>
                    <TouchableOpacity
                      style={s.modalBtnPrimary}
                      onPress={handleReadNow}
                      activeOpacity={0.8}
                    >
                      <Text style={s.modalBtnPrimaryText}>Read now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.modalBtnOutline}
                      onPress={closeModal}
                      activeOpacity={0.7}
                    >
                      <Text style={s.modalBtnOutlineText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // ── Default state ───────────────────────────────────────────
                // web: flex gap-12
                <View style={s.modalButtons}>
                  <TouchableOpacity
                    style={[s.modalBtnPrimary, adding && s.btnDisabled]}
                    onPress={handleAddBook}
                    disabled={adding}
                    activeOpacity={0.8}
                  >
                    {adding
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={s.modalBtnPrimaryText}>Add to My Library</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalBtnOutline, adding && s.btnDisabled]}
                    onPress={closeModal}
                    disabled={adding}
                    activeOpacity={0.7}
                  >
                    <Text style={s.modalBtnOutlineText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}

            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 40 },

  // ── Page header ──────────────────────────────────────────────────────────────
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  // web: garamond 2.5rem (40px) fontWeight 600 → Georgia 28 bold on mobile
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 6,
  },
  // web: garamond 1.1rem muted
  pageSubtitle: {
    fontFamily: 'Georgia',
    fontSize: 15,
    color: C.textMuted,
  },

  // ── Genre section ─────────────────────────────────────────────────────────────
  // web: marginBottom 48
  section: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  sectionLast: { paddingBottom: 8 },

  // web: garamond 1.3rem fontWeight 600, border-bottom pb-8 mb-20
  genreHeader: {
    paddingBottom: 8,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  genreName: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // ── Book grid (2 columns) ─────────────────────────────────────────────────────
  // web: grid-template-columns repeat(auto-fill, minmax(160px, 1fr)) gap-20
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bookItem: {
    width: COVER_W,
    marginRight: 12,
    marginBottom: 20,
  },

  // web: garamond 0.85rem fontWeight 500 foreground
  bookTitle: {
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
    marginTop: 8,
    lineHeight: 18,
  },
  // web: garamond 0.8rem muted-foreground
  bookAuthorEn: {
    fontFamily: 'Georgia',
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  // web: fixed inset-0 z-200 rgba(0,0,0,0.5) flex items-center justify-center p-24
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // web: bg background borderRadius 8 p-32 maxWidth 420 garamond
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 28,
    width: Math.min(SCREEN_W * 0.875, 380),
  },

  // web: 0.8rem muted letterSpacing 0.08em → 0.08 × 12 = ~1px
  modalAuthorEn: {
    fontFamily: 'Georgia',
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  // web: garamond 1.8rem (28.8px) fontWeight 600 foreground
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 32,
    marginBottom: 4,
  },
  // web: garamond 1rem muted
  modalAuthorJp: {
    fontFamily: 'Georgia',
    fontSize: 15,
    color: C.textMuted,
    marginBottom: 16,
  },
  // web: garamond 1rem lineHeight 1.7 foreground mb-24
  modalDescription: {
    fontFamily: 'Georgia',
    fontSize: 15,
    lineHeight: 25,
    color: C.textPrimary,
    marginBottom: 24,
  },

  // Quiet confirmation line shown after successful add
  modalSuccessLine: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: '#4A7C59',   // success green — same as VocabularyScreen's C.success
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // web: flex gap-12
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  // web: Button default (primary) flex-1 garamond
  modalBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // web: Button variant="outline" → border-input bg-background
  modalBtnOutline: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnOutlineText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: C.textPrimary,
  },
  btnDisabled: { opacity: 0.55 },
});
