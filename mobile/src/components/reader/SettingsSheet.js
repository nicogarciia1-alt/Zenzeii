import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  READER_THEMES,
  SENTENCES_PER_PAGE_OPTIONS,
} from '../../lib/readerConstants';

// ── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
};

// ── Mobile font options (only fonts available on iOS without additional install)
const FONT_OPTIONS = [
  { value: 'noto-serif',   label: 'Noto Serif JP', fontFamily: 'NotoSerifJP', sample: '美しい日本語' },
  { value: 'noto-sans',    label: 'System',          fontFamily: null,          sample: 'Aa 日本語' },
  { value: 'merriweather', label: 'Georgia',          fontFamily: 'Georgia',     sample: 'Aa 日本語' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'sm', label: 'S' }, { value: 'base', label: 'M' },
  { value: 'lg', label: 'L' }, { value: 'xl',   label: 'XL' },
];

const LINE_HEIGHT_OPTIONS = [
  { value: 'normal',  label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'loose',   label: 'Loose' },
];

// ── Segmented control — shared by font size and line spacing ─────────────────
function SegmentedControl({ options, value, onSelect }) {
  return (
    <View style={styles.segRow}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.segBtn,
              i === 0 && styles.segBtnFirst,
              active && styles.segBtnActive,
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── SettingsSheet ─────────────────────────────────────────────────────────────

export default function SettingsSheet({
  visible, onClose,
  readerTheme, onThemeChange,
  fontFamily, onFontFamilyChange,
  fontSize, onFontSizeChange,
  lineHeight, onLineHeightChange,
  showWordHighlights, onToggleWordHighlights,
  showKanjiHighlights, onToggleKanjiHighlights,
  sentencesPerPage, onSentencesPerPageChange,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top']}>

        {/* Fixed header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reading Settings</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Aesthetic Theme ── */}
          {/* web: "Aesthetic Theme" label + 5-column grid of colour swatches */}
          <Text style={styles.sectionLabel}>Aesthetic Theme</Text>
          <View style={styles.themeRow}>
            {READER_THEMES.map(theme => {
              const isSelected = readerTheme === theme.value;
              return (
                <TouchableOpacity
                  key={theme.value}
                  onPress={() => onThemeChange(theme.value)}
                  style={[styles.themeSwatch, isSelected && styles.themeSwatchSelected]}
                  activeOpacity={0.7}
                >
                  {/* Colour swatch — default gets a half-light / half-dark split
                      mirroring the web's linear-gradient(135deg, #f5f5f5 50%, #1a1a2e 50%) */}
                  {theme.value === 'default' ? (
                    <View style={[styles.themeCircle, styles.themeCircleClip]}>
                      <View style={styles.themeCircleHalves}>
                        <View style={styles.themeHalfLight} />
                        <View style={styles.themeHalfDark} />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.themeCircle, { backgroundColor: theme.bg }]}>
                      {/* web: 10px bold あ in theme text colour */}
                      <Text style={[styles.themePreviewChar, { color: theme.text }]}>あ</Text>
                    </View>
                  )}
                  <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected]}>
                    {theme.value === 'default' ? 'Auto' : theme.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.separator} />

          {/* ── Font ── */}
          {/* web: Select dropdown with font name rendered in that font.
              Mobile fork: touchable rows with checkmark — native dropdowns
              are heavy on iOS; rows are cleaner at 3 options. */}
          <Text style={styles.sectionLabel}>Font</Text>
          {FONT_OPTIONS.map(opt => {
            const isSelected = fontFamily === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onFontFamilyChange(opt.value)}
                style={styles.fontRow}
                activeOpacity={0.6}
              >
                <View style={styles.fontRowLeft}>
                  <Text style={styles.fontRowLabel}>{opt.label}</Text>
                  <Text style={[styles.fontRowSample, opt.fontFamily ? { fontFamily: opt.fontFamily } : null]}>
                    {opt.sample}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={C.primary} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* ── Font Size ── */}
          {/* web: range input with S/M/L/XL labels.
              Mobile fork: segmented control — touch targets cleaner than a slider. */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Font Size</Text>
          <SegmentedControl
            options={FONT_SIZE_OPTIONS}
            value={fontSize}
            onSelect={onFontSizeChange}
          />

          {/* ── Line Spacing ── */}
          {/* web: Select dropdown. Mobile: segmented control. */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Line Spacing</Text>
          <SegmentedControl
            options={LINE_HEIGHT_OPTIONS}
            value={lineHeight}
            onSelect={onLineHeightChange}
          />

          <View style={styles.separator} />

          {/* ── Highlights ── */}
          {/* web: two toggle buttons in the top bar (Highlighter icon + "Words" / "漢字").
              Mobile: same pair, moved into settings alongside the other reader controls. */}
          <Text style={styles.sectionLabel}>Highlights</Text>
          <View style={styles.highlightRow}>

            {/* Words — amber when active, mirrors web's bg-amber-100/text-amber-800/border-amber-300 */}
            <TouchableOpacity
              onPress={onToggleWordHighlights}
              style={[
                styles.highlightBtn,
                showWordHighlights ? styles.highlightBtnWordActive : styles.highlightBtnInactive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="brush-outline"
                size={15}
                color={showWordHighlights ? '#92400e' : C.textMuted}
                style={styles.highlightIcon}
              />
              <Text style={[
                styles.highlightBtnText,
                showWordHighlights ? styles.highlightBtnTextWord : styles.highlightBtnTextOff,
              ]}>
                Words
              </Text>
            </TouchableOpacity>

            {/* Kanji — sky when active, mirrors web's bg-sky-100/text-sky-800/border-sky-300 */}
            <TouchableOpacity
              onPress={onToggleKanjiHighlights}
              style={[
                styles.highlightBtn,
                styles.highlightBtnRight,
                showKanjiHighlights ? styles.highlightBtnKanjiActive : styles.highlightBtnInactive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="brush-outline"
                size={15}
                color={showKanjiHighlights ? '#075985' : C.textMuted}
                style={styles.highlightIcon}
              />
              <Text style={[
                styles.highlightBtnText,
                showKanjiHighlights ? styles.highlightBtnTextKanji : styles.highlightBtnTextOff,
              ]}>
                漢字
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.separator} />

          {/* ── Sentences per Page ── */}
          {/* web: Select with [10, 20, 30, 50, 75, 100].
              On mobile this controls the initial load + infinite-scroll batch size. */}
          <Text style={styles.sectionLabel}>Sentences per Page</Text>
          <View style={styles.sppRow}>
            {SENTENCES_PER_PAGE_OPTIONS.map(n => {
              const isSelected = sentencesPerPage === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => onSentencesPerPageChange(n)}
                  style={[styles.sppChip, isSelected && styles.sppChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sppChipText, isSelected && styles.sppChipTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  // web: text-lg font-serif font-semibold
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  bottomPad: { height: 40 },

  // ── Section label ────────────────────────────────────────────────────────────
  // web: text-xs text-muted-foreground uppercase tracking-wide
  sectionLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionLabelSpaced: { marginTop: 20 },

  // ── Separator ────────────────────────────────────────────────────────────────
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 20,
  },

  // ── Theme swatches ───────────────────────────────────────────────────────────
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // web: rounded-lg p-1.5 border-2
  themeSwatch: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 5,
  },
  // web: border-primary ring-2 ring-primary/30
  themeSwatchSelected: {
    borderColor: '#D3382F',
  },
  // web: w-8 h-8 rounded-md border border-black/10
  themeCircle: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCircleClip: { overflow: 'hidden' },
  themeCircleHalves: { flexDirection: 'row', width: '100%', height: '100%' },
  themeHalfLight: { flex: 1, backgroundColor: '#f5f5f5' },
  themeHalfDark:  { flex: 1, backgroundColor: '#1a1a2e' },
  // web: text-[10px] font-bold
  themePreviewChar: {
    fontFamily: 'NotoSerifJP',
    fontSize: 14,
    fontWeight: '700',
  },
  // web: text-[10px] text-muted-foreground
  themeLabel: {
    fontSize: 10,
    color: C.textMuted,
  },
  themeLabelSelected: {
    color: '#D3382F',
    fontWeight: '600',
  },

  // ── Font rows ────────────────────────────────────────────────────────────────
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  fontRowLeft: { flex: 1, gap: 2 },
  fontRowLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  fontRowSample: {
    fontSize: 12,
    color: C.textMuted,
  },

  // ── Segmented control ────────────────────────────────────────────────────────
  segRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: C.border,
  },
  segBtnFirst: { borderLeftWidth: 0 },
  segBtnActive: { backgroundColor: '#D3382F' },
  segBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textMuted,
  },
  segBtnTextActive: { color: '#FFFFFF' },

  // ── Highlight toggles ────────────────────────────────────────────────────────
  highlightRow: { flexDirection: 'row' },
  // web: px-2.5 py-1 rounded text-xs font-medium border
  highlightBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  highlightBtnRight: { marginLeft: 8 },
  // web: bg-amber-100 text-amber-800 border-amber-300
  highlightBtnWordActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  // web: bg-sky-100 text-sky-800 border-sky-300
  highlightBtnKanjiActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
  },
  // web: border-transparent text-muted-foreground
  highlightBtnInactive: {
    backgroundColor: 'transparent',
    borderColor: C.border,
  },
  highlightIcon: { marginRight: 5 },
  highlightBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // web: text-amber-800
  highlightBtnTextWord:  { color: '#92400e' },
  // web: text-sky-800
  highlightBtnTextKanji: { color: '#075985' },
  highlightBtnTextOff:   { color: C.textMuted },

  // ── Sentences per page ───────────────────────────────────────────────────────
  sppRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sppChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  sppChipActive: {
    backgroundColor: '#D3382F',
    borderColor: '#D3382F',
  },
  sppChipText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  sppChipTextActive: { color: '#FFFFFF' },
});
