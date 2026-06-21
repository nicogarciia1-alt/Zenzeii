import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchGutenberg } from '../lib/api';

const C = {
  bg: '#F9F7F2',
  surface: '#FFFFFF',
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  success: '#4A7C59',
};

export default function ImportModal({ visible, onClose, availableBooks, onImport }) {
  const [activeTab, setActiveTab] = useState('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inFlight, setInFlight] = useState(new Set());
  const searchInputRef = useRef(null);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data } = await searchGutenberg(q);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const startImport = useCallback(async (key, params) => {
    if (inFlight.has(key)) return;
    setInFlight(prev => new Set([...prev, key]));
    try {
      await onImport(params);
    } finally {
      setInFlight(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [inFlight, onImport]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  }, [onClose]);

  // ── Quick Add item ──────────────────────────────────────────────────────

  const renderAvailableItem = useCallback(({ item: book }) => {
    const key = `${book.source}-${book.book_key}`;
    const isReady = book.is_imported && book.import_status === 'completed';
    const isImporting =
      book.is_imported &&
      (book.import_status === 'importing' || book.import_status === 'preparing');
    const loading = inFlight.has(key);

    return (
      <View style={styles.listItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {book.title_en || book.title}
          </Text>
          <Text style={styles.itemAuthor} numberOfLines={1}>
            {book.author_en || book.author}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, book.language === 'ja' ? styles.badgeJP : styles.badgeEN]}>
              <Text style={styles.badgeText}>{book.language === 'ja' ? 'JA' : 'EN'}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{book.genre}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemAction}>
          {isReady ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : isImporting || loading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                startImport(key, { book_key: book.book_key, source: book.source })
              }
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [inFlight, startImport]);

  // ── Gutenberg search result item ────────────────────────────────────────

  const renderSearchItem = useCallback(({ item: result }) => {
    const key = `gutenberg-${result.gutenberg_id}`;
    const loading = inFlight.has(key);
    const alreadyIn = availableBooks.some(
      b =>
        b.gutenberg_id === result.gutenberg_id &&
        b.is_imported &&
        b.import_status === 'completed'
    );

    return (
      <View style={styles.listItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{result.title}</Text>
          <Text style={styles.itemAuthor} numberOfLines={1}>{result.author}</Text>
          {result.download_count > 0 && (
            <Text style={styles.itemMeta}>
              {result.download_count.toLocaleString()} downloads
            </Text>
          )}
        </View>
        <View style={styles.itemAction}>
          {alreadyIn ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : loading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                startImport(key, {
                  gutenberg_id: result.gutenberg_id,
                  title: result.title,
                  author: result.author,
                  source: 'gutenberg',
                })
              }
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [inFlight, startImport, availableBooks]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Modal header ── */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Books</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            {['quick', 'search'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'quick' ? 'Quick Add' : 'Search Gutenberg'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Quick Add ── */}
          {activeTab === 'quick' && (
            <FlatList
              data={availableBooks}
              keyExtractor={item => `${item.source}-${item.book_key}`}
              renderItem={renderAvailableItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* ── Gutenberg Search ── */}
          {activeTab === 'search' && (
            <View style={styles.flex}>
              <View style={styles.searchBar}>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by title or author…"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[
                    styles.searchBtn,
                    (!searchQuery.trim() || searching) && styles.searchBtnDisabled,
                  ]}
                  onPress={handleSearch}
                  disabled={!searchQuery.trim() || searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchBtnText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={item => String(item.gutenberg_id)}
                  renderItem={renderSearchItem}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                />
              ) : (
                <View style={styles.searchPlaceholder}>
                  <Text style={styles.searchPlaceholderText}>
                    {searchQuery.trim() && !searching
                      ? 'No results found'
                      : 'Search Project Gutenberg for public domain books'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
  },
  doneText: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  tab: {
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
    color: C.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: C.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'Georgia',
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  itemAuthor: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 6,
  },
  itemMeta: {
    fontSize: 11,
    color: C.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#F0EFE9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeEN: {
    backgroundColor: '#EFF5FF',
  },
  badgeJP: {
    backgroundColor: '#FFF0F6',
  },
  badgeText: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemAction: {
    width: 56,
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: C.success,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: C.textPrimary,
    backgroundColor: C.bg,
  },
  searchBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    minWidth: 72,
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  searchPlaceholderText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
