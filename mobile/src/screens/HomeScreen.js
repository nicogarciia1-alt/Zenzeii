import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  getBooks, getProgress, getAvailableBooks, importBook, getBookStatus,
  getBook, getChapters, getSentences, getSentencesCount, deleteBook,
} from '../lib/api';
import {
  storeBookMeta, storeBookChapters, storeChapterSentences, markBookDownloaded,
  getDownloadedBookIds,
  storeBooksList, getCachedBooksList,
  storeProgressMap, getCachedProgressMap,
} from '../lib/offlineStorage';
import { useIsOnline } from '../hooks/useNetInfo';
import BookCover from '../components/BookCover';
import ImportModal from '../components/ImportModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const H_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CARD_MARGIN * 4) / 2;
const CARD_HEIGHT = CARD_WIDTH * (4 / 3);
const CONTINUE_CARD_WIDTH = 110;
const CONTINUE_CARD_HEIGHT = CONTINUE_CARD_WIDTH * (4 / 3);
const TOP_BAR_HEIGHT = 56;

const C = {
  bg: '#F9F7F2',
  surface: '#FFFFFF',
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  warning: '#9B6A00',
  warningBg: '#FFF8E1',
  menuDanger: '#B5294E',
  offlineBg: '#FFF8E1',
  offlineText: '#7A5200',
  success: '#2E7D4A',
};

// ── Settings dropdown ─────────────────────────────────────────────────────────

function SettingsDropdown({ visible, onClose, dropdownTop, logout, navigation }) {
  const items = [
    {
      label: '✦ View Profile',
      onPress: () => { onClose(); navigation.navigate('Profile'); },
      color: C.textPrimary,
    },
    {
      label: '✦ Report Problem',
      onPress: () => { onClose(); Alert.alert('Coming soon', 'Feedback will be available soon.'); },
      color: C.textPrimary,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      <View style={[styles.settingsDropdown, { top: dropdownTop }]}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} style={styles.settingsDropdownItem} onPress={item.onPress}>
            <Text style={[styles.settingsDropdownText, { color: item.color }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.menuSeparator} />
        <TouchableOpacity style={styles.settingsDropdownItem} onPress={() => { onClose(); logout(); }}>
          <Text style={[styles.settingsDropdownText, { color: C.menuDanger }]}>✦ Log Out</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Book card overflow menu (⋮) ───────────────────────────────────────────────
// Mirrors web's DropdownMenu: always-visible dark trigger, white card dropdown.
// Positioned via measureInWindow so the card drops from the button's actual location.

function BookCardMenu({ bookId, dl, isDownloaded, isOnline, onDownload, onDelete }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const handleOpen = () => {
    btnRef.current?.measureInWindow((x, y, w, h) => {
      setPos({ top: y + h + 4, right: SCREEN_WIDTH - x - w });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  const isActivelyDownloading = dl?.status === 'downloading';
  const isDone = isDownloaded || dl?.status === 'done';
  const dlDisabled = isDone || isActivelyDownloading || !isOnline;

  const dlLabel = isDone
    ? 'Available Offline'
    : isActivelyDownloading
    ? 'Downloading…'
    : !isOnline
    ? 'Download for Offline'
    : 'Download for Offline';

  const dlIconName = isDone ? 'cloud-done' : 'cloud-download-outline';
  const dlIconColor = isDone ? C.success : dlDisabled ? C.textMuted : C.textPrimary;

  const handleDownload = () => {
    close();
    onDownload(bookId);
  };

  const handleDelete = () => {
    close();
    Alert.alert(
      'Remove from Library',
      'This will remove the book from your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(bookId) },
      ]
    );
  };

  return (
    <>
      {/* Always-visible trigger — matches web's bg-black/40 circle button */}
      <TouchableOpacity
        ref={btnRef}
        style={styles.menuTrigger}
        onPress={handleOpen}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="ellipsis-vertical" size={14} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Dropdown — rendered in a transparent Modal at measured position */}
      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={close}
          activeOpacity={1}
        />
        <View style={[styles.menuCard, { top: pos.top, right: pos.right }]}>

          {/* Download for Offline */}
          <TouchableOpacity
            style={[styles.menuItem, dlDisabled && styles.menuItemDisabled]}
            onPress={dlDisabled ? undefined : handleDownload}
            disabled={dlDisabled}
          >
            {isActivelyDownloading ? (
              <ActivityIndicator size="small" color={C.textMuted} style={styles.menuItemIcon} />
            ) : (
              <Ionicons name={dlIconName} size={15} color={dlIconColor} style={styles.menuItemIcon} />
            )}
            <Text style={[styles.menuItemText, dlDisabled && { color: C.textMuted }]}>
              {dlLabel}
            </Text>
          </TouchableOpacity>

          <View style={styles.menuSeparator} />

          {/* Remove from Library */}
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={15} color={C.menuDanger} style={styles.menuItemIcon} />
            <Text style={[styles.menuItemText, { color: C.menuDanger }]}>Remove from Library</Text>
          </TouchableOpacity>

        </View>
      </Modal>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();

  const [books, setBooks] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [downloadStates, setDownloadStates] = useState({});
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  const dropdownTop = insets.top + TOP_BAR_HEIGHT;

  // ── Load persisted download index ────────────────────────────────────────────

  useEffect(() => {
    getDownloadedBookIds().then(ids => setDownloadedIds(new Set(ids)));
  }, []);

  // ── Data fetching (each falls back to its own cache) ─────────────────────────

  const fetchBooks = useCallback(async () => {
    try {
      const { data } = await getBooks();
      const list = Array.isArray(data) ? data : [];
      setBooks(list);
      storeBooksList(list);
    } catch {
      const cached = await getCachedBooksList();
      if (cached) setBooks(cached);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await getProgress();
      const map = {};
      (Array.isArray(data) ? data : []).forEach(p => { map[p.book_id] = p; });
      setProgressMap(map);
      storeProgressMap(map);
    } catch {
      const cached = await getCachedProgressMap();
      if (cached) setProgressMap(cached);
    }
  }, []);

  const fetchAvailable = useCallback(async () => {
    try {
      const { data } = await getAvailableBooks();
      setAvailableBooks(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      await Promise.all([fetchBooks(), fetchProgress(), fetchAvailable()]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [fetchBooks, fetchProgress, fetchAvailable]);

  useEffect(() => { fetchAll(); }, []);

  // ── Import status polling ─────────────────────────────────────────────────────

  useEffect(() => {
    const activeIds = books
      .filter(b => b.import_status === 'importing' || b.import_status === 'preparing')
      .map(b => b.id);
    if (!activeIds.length) return;

    const interval = setInterval(async () => {
      let anyFinished = false;
      for (const bookId of activeIds) {
        try {
          const { data } = await getBookStatus(bookId);
          if (data.status !== 'importing' && data.status !== 'preparing') anyFinished = true;
        } catch {}
      }
      if (anyFinished) { fetchBooks(); fetchAvailable(); }
    }, 3000);

    return () => clearInterval(interval);
  }, [books]);

  // ── Download a book for offline use ──────────────────────────────────────────

  const handleDownloadBook = useCallback(async (bookId) => {
    setDownloadStates(prev => ({
      ...prev,
      [bookId]: { status: 'downloading', chapsDone: 0, chapsTotal: 0 },
    }));

    try {
      const [bookRes, chaptersRes] = await Promise.all([
        getBook(bookId),
        getChapters(bookId),
      ]);
      const chapters = chaptersRes.data;

      await storeBookMeta(bookId, bookRes.data);
      await storeBookChapters(bookId, chapters);

      setDownloadStates(prev => ({
        ...prev,
        [bookId]: { status: 'downloading', chapsDone: 0, chapsTotal: chapters.length },
      }));

      for (let i = 0; i < chapters.length; i++) {
        const chap = chapters[i];
        const countRes = await getSentencesCount(chap.id);
        const total = countRes.data.count || 0;
        let all = [];
        while (all.length < total) {
          const res = await getSentences(chap.id, all.length, 100);
          if (!res.data.length) break;
          all = all.concat(res.data);
        }
        await storeChapterSentences(chap.id, all);

        setDownloadStates(prev => ({
          ...prev,
          [bookId]: { status: 'downloading', chapsDone: i + 1, chapsTotal: chapters.length },
        }));
      }

      await markBookDownloaded(bookId);
      setDownloadStates(prev => ({ ...prev, [bookId]: { status: 'done' } }));
      setDownloadedIds(prev => new Set([...prev, bookId]));
    } catch {
      setDownloadStates(prev => ({ ...prev, [bookId]: { status: 'error' } }));
      Alert.alert('Download failed', 'Could not download book. Please try again.');
      setTimeout(() => {
        setDownloadStates(prev => {
          const next = { ...prev };
          if (next[bookId]?.status === 'error') delete next[bookId];
          return next;
        });
      }, 3000);
    }
  }, []);

  // ── Delete a book ─────────────────────────────────────────────────────────────

  const handleDeleteBook = useCallback(async (bookId) => {
    try {
      await deleteBook(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setDownloadStates(prev => { const n = { ...prev }; delete n[bookId]; return n; });
      setDownloadedIds(prev => { const n = new Set(prev); n.delete(bookId); return n; });
    } catch {
      Alert.alert('Error', 'Could not remove book. Please try again.');
    }
  }, []);

  // ── Import ────────────────────────────────────────────────────────────────────

  const handleImport = useCallback(async (params) => {
    try {
      await importBook(params);
      await Promise.all([fetchBooks(), fetchAvailable()]);
    } catch (err) {
      Alert.alert('Import failed', err.response?.data?.detail || 'Could not add this book. Please try again.');
    }
  }, [fetchBooks, fetchAvailable]);

  // ── Navigation — disabled for non-downloaded books when offline ──────────────

  const handleBookPress = useCallback((book) => {
    if (book.import_status !== 'completed') return;
    const downloaded = downloadedIds.has(book.id) || downloadStates[book.id]?.status === 'done';
    if (!isOnline && !downloaded) return;
    navigation.navigate('Reader', { bookId: book.id, bookTitle: book.title_jp || book.title });
  }, [navigation, isOnline, downloadedIds, downloadStates]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const completedBooks = books.filter(b => b.import_status === 'completed');
  const inProgressBooks = completedBooks.filter(b => progressMap[b.id]);
  const importingCount = books.filter(
    b => b.import_status === 'importing' || b.import_status === 'preparing'
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // ── FlatList header ───────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={C.offlineText} />
          <Text style={styles.offlineBannerText}>Offline — downloaded books only</Text>
        </View>
      )}

      {importingCount > 0 && (
        <View style={styles.importingStrip}>
          <ActivityIndicator size="small" color={C.warning} style={{ marginRight: 8 }} />
          <Text style={styles.importingText}>
            {importingCount === 1 ? 'Importing 1 book…' : `Importing ${importingCount} books…`}
          </Text>
        </View>
      )}

      {inProgressBooks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Reading</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.continueScroll}
          >
            {inProgressBooks.map(book => {
              const downloaded = downloadedIds.has(book.id) || downloadStates[book.id]?.status === 'done';
              const disabled = !isOnline && !downloaded;
              return (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.continueCard, disabled && styles.dimmed]}
                  onPress={() => handleBookPress(book)}
                  activeOpacity={disabled ? 1 : 0.8}
                >
                  <View style={styles.continueCover}>
                    <BookCover book={book} />
                  </View>
                  <Text style={styles.continueTitle} numberOfLines={3}>
                    {book.title_jp || book.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {books.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Library</Text>
          <Text style={styles.sectionCount}>{completedBooks.length} books</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Fixed top bar ── */}
      <View style={styles.topBar}>
        <View style={styles.wordmark}>
          <Text style={styles.kanji}>読</Text>
          <Text style={styles.brandName}>Zenzeii</Text>
        </View>
        <View style={styles.topBarRight}>
          {user?.username ? (
            <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Add button row ── */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={[styles.addButton, !isOnline && styles.addButtonDisabled]}
          onPress={() => isOnline && setImportModalVisible(true)}
          activeOpacity={isOnline ? 0.8 : 1}
        >
          <Text style={styles.addButtonText}>＋ Add Book</Text>
        </TouchableOpacity>
      </View>

      {/* ── Book grid ── */}
      <FlatList
        data={books}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item: book }) => {
          const isActive = book.import_status === 'importing' || book.import_status === 'preparing';
          const isCompleted = book.import_status === 'completed';
          const hasProgress = !isActive && progressMap[book.id];
          const dl = downloadStates[book.id] || null;
          const downloaded = downloadedIds.has(book.id) || dl?.status === 'done';
          const disabled = !isOnline && !downloaded && isCompleted;

          return (
            <TouchableOpacity
              style={[styles.gridItem, disabled && styles.dimmed]}
              onPress={() => handleBookPress(book)}
              activeOpacity={isActive || disabled ? 1 : 0.8}
            >
              <View style={styles.coverShell}>
                <BookCover book={book} />

                {/* Importing overlay */}
                {isActive && (
                  <View style={styles.importingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.importingOverlayText}>Importing…</Text>
                  </View>
                )}

                {/* Reading progress bar */}
                {hasProgress && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(Math.round((progressMap[book.id].words_read / 500) * 100), 100)}%` },
                      ]}
                    />
                  </View>
                )}

                {/* Active download: full-cover overlay with progress */}
                {isCompleted && dl?.status === 'downloading' && (
                  <View style={styles.dlProgressOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.dlProgressText}>
                      {dl.chapsTotal > 1 ? `${dl.chapsDone} / ${dl.chapsTotal}` : 'Downloading…'}
                    </Text>
                  </View>
                )}

                {/* ⋮ menu — always visible on completed books not currently downloading */}
                {isCompleted && dl?.status !== 'downloading' && (
                  <BookCardMenu
                    bookId={book.id}
                    dl={dl}
                    isDownloaded={downloaded}
                    isOnline={isOnline}
                    onDownload={handleDownloadBook}
                    onDelete={handleDeleteBook}
                  />
                )}
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>{book.title_jp || book.title}</Text>
              <Text style={styles.cardAuthor} numberOfLines={1}>{book.author_jp || book.author}</Text>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>本</Text>
            <Text style={styles.emptyTitle}>No books yet</Text>
            <Text style={styles.emptyBody}>Add a book to start reading and learning Japanese</Text>
            {isOnline && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setImportModalVisible(true)}>
                <Text style={styles.emptyButtonText}>Browse Books</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.primary} />
        }
      />

      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        availableBooks={availableBooks}
        onImport={handleImport}
      />

      <SettingsDropdown
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        dropdownTop={dropdownTop}
        logout={logout}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // ── Top bar ──
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kanji: { fontFamily: 'Georgia', fontSize: 24, color: C.primary, lineHeight: 28 },
  brandName: { fontSize: 18, fontWeight: '500', color: C.textPrimary, letterSpacing: 0.2 },
  topBarRight: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  username: { fontSize: 13, color: C.textMuted, flexShrink: 1 },

  // ── Add button row ──
  addRow: { alignItems: 'center', paddingVertical: 10, backgroundColor: C.bg },
  addButton: {
    backgroundColor: C.primary, borderRadius: 22,
    paddingHorizontal: 28, paddingVertical: 9,
  },
  addButtonDisabled: { opacity: 0.45 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  // ── Offline banner ──
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.offlineBg,
    paddingHorizontal: H_PAD, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0E0A0',
  },
  offlineBannerText: { fontSize: 13, color: C.offlineText, fontWeight: '500' },

  // ── Settings dropdown ──
  settingsDropdown: {
    position: 'absolute', right: 12,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 8, minWidth: 180, zIndex: 100,
  },
  settingsDropdownItem: { paddingHorizontal: 16, paddingVertical: 11 },
  settingsDropdownText: { fontSize: 15, fontFamily: 'Georgia' },

  // ── Book card overflow menu (⋮) ──
  // Trigger: matches web's h-8 w-8 bg-black/40 button
  menuTrigger: {
    position: 'absolute', top: 6, right: 6,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Dropdown card: matches web's DropdownMenuContent (white, rounded, shadow, border)
  menuCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  menuItemDisabled: { opacity: 0.5 },
  menuItemIcon: { marginRight: 10 },
  menuItemText: {
    fontSize: 14,
    color: C.textPrimary,
    fontFamily: 'Georgia',
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── Importing strip ──
  importingStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.warningBg,
    paddingHorizontal: H_PAD, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0E0A0',
  },
  importingText: { fontSize: 13, color: C.warning, fontWeight: '500' },

  // ── Sections ──
  section: { paddingTop: 20, paddingBottom: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Georgia', fontSize: 18, fontWeight: '700',
    color: C.textPrimary, paddingHorizontal: H_PAD,
  },
  sectionCount: { fontSize: 13, color: C.textMuted, paddingRight: H_PAD },

  // ── Continue Reading ──
  continueScroll: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 4, gap: 12 },
  continueCard: { width: CONTINUE_CARD_WIDTH },
  continueCover: {
    width: CONTINUE_CARD_WIDTH, height: CONTINUE_CARD_HEIGHT,
    borderRadius: 6, overflow: 'hidden', marginBottom: 6,
  },
  continueTitle: { fontSize: 11, color: C.textPrimary, fontFamily: 'Georgia', lineHeight: 15 },

  // ── Book grid ──
  gridContent: { paddingHorizontal: H_PAD, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1 },
  columnWrapper: {},
  gridItem: { flex: 1, margin: CARD_MARGIN },
  dimmed: { opacity: 0.45 },
  coverShell: {
    width: '100%', height: CARD_HEIGHT,
    borderRadius: 8, overflow: 'hidden', marginBottom: 6,
  },
  importingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  importingOverlayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  progressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: { height: '100%', backgroundColor: C.primary },
  dlProgressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  dlProgressText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  cardTitle: {
    fontSize: 13, fontFamily: 'Georgia', fontWeight: '600',
    color: C.textPrimary, lineHeight: 18, marginBottom: 2,
  },
  cardAuthor: { fontSize: 11, color: C.textMuted },

  // ── Empty state ──
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16, opacity: 0.15 },
  emptyTitle: {
    fontFamily: 'Georgia', fontSize: 22, fontWeight: '700',
    color: C.textPrimary, marginBottom: 10, textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15, color: C.textMuted, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  emptyButton: { backgroundColor: C.primary, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
