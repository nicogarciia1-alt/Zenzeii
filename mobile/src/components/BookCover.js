import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const PALETTES = [
  { bg: '#B5451B', text: '#FFF8F0', accent: '#FFD0A8', rule: '#FF9060' },
  { bg: '#1B3A5C', text: '#EFF5FF', accent: '#A8C8EC', rule: '#5898CC' },
  { bg: '#2A5233', text: '#F0FFF4', accent: '#96D4A0', rule: '#4EAA60' },
  { bg: '#5C1B3A', text: '#FFF0F6', accent: '#ECA8C4', rule: '#CC5888' },
  { bg: '#1A4A4A', text: '#F0FFFE', accent: '#80D4D0', rule: '#30A8A0' },
  { bg: '#3D1A5C', text: '#F8F2FF', accent: '#C4A0EC', rule: '#9060CC' },
  { bg: '#5C3A1B', text: '#FFF6EC', accent: '#EABF90', rule: '#CC8840' },
  { bg: '#1B1B5C', text: '#F2F2FF', accent: '#9898EC', rule: '#5050CC' },
  { bg: '#3A3A3A', text: '#FAF8F4', accent: '#D4C8B0', rule: '#A89878' },
  { bg: '#1B5C40', text: '#F0FFF8', accent: '#88E0B8', rule: '#30B878' },
  { bg: '#5C4A1B', text: '#FFFBF0', accent: '#ECD898', rule: '#CCAC40' },
  { bg: '#5C1B1B', text: '#FFF4F0', accent: '#ECA898', rule: '#CC5040' },
];

const DECO_CHARS = ['書', '文', '語', '詩', '話', '夢', '心', '道', '空', '風', '月', '光'];

export default function BookCover({ book, style }) {
  const titleKey = book.title || '';
  const authorKey = book.author || '';

  const palette = PALETTES[hashString(titleKey) % PALETTES.length];
  const decoChar = DECO_CHARS[hashString(authorKey + titleKey) % DECO_CHARS.length];

  const displayTitle = book.title_jp || book.title || 'Untitled';
  const displayAuthor = book.author_jp || book.author || '';

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }, style]}>
      <View style={styles.inner}>
        <View style={[styles.ruleThick, { backgroundColor: palette.rule }]} />
        <View style={[styles.ruleThin, { backgroundColor: palette.accent }]} />

        <View style={styles.body}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={4}>
            {displayTitle}
          </Text>
          <View style={[styles.centreRule, { backgroundColor: palette.accent }]} />
          <Text style={[styles.author, { color: palette.accent }]} numberOfLines={2}>
            {displayAuthor.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.deco, { color: palette.accent }]}>{decoChar}</Text>

        <View style={[styles.ruleThin, { backgroundColor: palette.accent }]} />
        <View style={[styles.ruleThick, { backgroundColor: palette.rule }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    marginHorizontal: 10,
    marginVertical: 10,
    flexDirection: 'column',
  },
  ruleThick: {
    height: 2,
  },
  ruleThin: {
    height: 1,
    opacity: 0.5,
    marginTop: 3,
    marginBottom: 3,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 7,
  },
  centreRule: {
    height: 1,
    width: '45%',
    opacity: 0.7,
    marginBottom: 7,
  },
  author: {
    fontSize: 7,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  deco: {
    fontFamily: 'Georgia',
    fontSize: 20,
    opacity: 0.25,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
});
