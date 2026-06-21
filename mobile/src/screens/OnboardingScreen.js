import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    kanji: '読',
    headline: 'Read Japanese,\nnaturally.',
    body: 'Tap any word to see its meaning\nwithout leaving the page.',
  },
  {
    kanji: '語',
    headline: 'Words stay\nwith you.',
    body: 'Every lookup is saved automatically.\nReview them at your own pace.',
  },
  {
    kanji: '問',
    headline: 'Ask when\nyou\'re stuck.',
    body: 'Zenzeii is here to explain anything\nyou encounter while reading.',
  },
];

const VIEWABILITY_CONFIG = { viewAreaCoveragePercentThreshold: 50 };

export default function OnboardingScreen({ onComplete }) {
  const flatRef = useRef(null);
  const [index, setIndex] = useState(0);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem('z:onboarding_done', '1');
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  }, [index, finish]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setIndex(viewableItems[0].index ?? 0);
  }, []);

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      <TouchableOpacity style={styles.skipBtn} onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.kanji}>{item.kanji}</Text>
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnPrimary]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextText, isLast && styles.nextTextPrimary]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F7F2',
  },

  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontFamily: 'Georgia',
  },

  list: {
    flex: 1,
  },

  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  kanji: {
    fontFamily: 'Georgia',
    fontSize: 96,
    color: '#D3382F',
    lineHeight: 110,
    marginBottom: 32,
  },

  headline: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '600',
    color: '#2B2B2B',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },

  body: {
    fontSize: 16,
    color: '#595959',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Georgia',
  },

  footer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
    gap: 20,
    alignItems: 'center',
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5E5',
  },
  dotActive: {
    backgroundColor: '#D3382F',
    width: 18,
  },

  nextBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2B2B2B',
  },
  nextBtnPrimary: {
    backgroundColor: '#D3382F',
    borderColor: '#D3382F',
  },
  nextText: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    letterSpacing: 0.3,
  },
  nextTextPrimary: {
    color: '#FFFFFF',
  },
});
