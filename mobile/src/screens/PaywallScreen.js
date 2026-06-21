import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  getOfferings,
  purchasePackage,
  purchaseProduct,
  restorePurchases,
  isCancelled,
  isPurchasesAvailable,
  PRODUCT_IDS,
} from '../lib/purchases';

const C = {
  bg: '#FFFFFF',
  bgFaint: '#F9F7F2',
  primary: '#D3382F',
  primaryFaint: 'rgba(211,56,47,0.08)',
  textPrimary: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  gold: '#92400E',
};

const PREMIUM_FEATURES = [
  'Unlimited reading',
  'All learning tools',
  'Progress tracking',
];

const FOUNDER_FEATURES = [
  'Everything in Premium',
  'Founder badge',
  'Early access to new features',
  'Help shape Zenzeii',
];

// ── FeatureRow ────────────────────────────────────────────────────────────────

function FeatureRow({ text }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark" size={15} color={C.primary} style={styles.featureCheck} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ── PaywallScreen ─────────────────────────────────────────────────────────────

export default function PaywallScreen({ navigation }) {
  const { isPremium, isFounder, refresh } = useSubscription();

  const [offerings, setOfferings] = useState(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [buying, setBuying] = useState(null); // 'premium' | 'founder' | 'restore'
  const [purchaseDone, setPurchaseDone] = useState(false);

  useEffect(() => {
    if (!isPurchasesAvailable()) {
      setLoadingOfferings(false);
      return;
    }
    getOfferings()
      .then(o => setOfferings(o))
      .catch(() => {})
      .finally(() => setLoadingOfferings(false));
  }, []);

  const findPackage = useCallback((productId) => {
    if (!offerings?.current?.availablePackages) return null;
    return offerings.current.availablePackages.find(
      pkg => pkg.product.productIdentifier === productId
    ) ?? null;
  }, [offerings]);

  const handlePurchase = useCallback(async (tier) => {
    if (!isPurchasesAvailable()) {
      Alert.alert(
        'Not Available',
        'In-app purchases require a development build. See README for setup instructions.'
      );
      return;
    }

    setBuying(tier);
    try {
      const productId = tier === 'premium'
        ? PRODUCT_IDS.PREMIUM_MONTHLY
        : PRODUCT_IDS.FOUNDER_MEMBER;

      const pkg = findPackage(productId);
      if (pkg) {
        await purchasePackage(pkg);
      } else {
        // Fallback: purchase by product ID directly (useful in StoreKit Testing)
        await purchaseProduct(productId);
      }

      await refresh();
      setPurchaseDone(true);
    } catch (err) {
      if (!isCancelled(err)) {
        Alert.alert(
          'Purchase Failed',
          'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setBuying(null);
    }
  }, [findPackage, refresh]);

  const handleRestore = useCallback(async () => {
    if (!isPurchasesAvailable()) return;
    setBuying('restore');
    try {
      await restorePurchases();
      await refresh();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setBuying(null);
    }
  }, [refresh]);

  // ── Already subscribed ───────────────────────────────────────────────────────

  if (isPremium || isFounder || purchaseDone) {
    const label = isFounder ? 'Founding Member' : 'Premium';
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>

        <View style={styles.successState}>
          <Text style={styles.successKanji}>✦</Text>
          <Text style={styles.successHeadline}>
            {purchaseDone ? 'Welcome.' : `You're a ${label}.`}
          </Text>
          <Text style={styles.successBody}>
            {purchaseDone
              ? 'Your subscription is now active. Enjoy Zenzeii.'
              : 'Thank you for supporting Zenzeii. Your access is active.'}
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.successBtnText}>Continue Reading</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Paywall ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={22} color={C.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroKanji}>✦</Text>
          <Text style={styles.heroHeadline}>Continue your{'\n'}reading journey.</Text>
          <Text style={styles.heroBody}>
            Unlock unlimited stories, powerful learning tools,
            and a deeper path to Japanese through literature.
          </Text>
        </View>

        {!isPurchasesAvailable() && (
          <View style={styles.devNotice}>
            <Ionicons name="information-circle-outline" size={15} color={C.textMuted} />
            <Text style={styles.devNoticeText}>
              Purchases require a development build. UI preview only.
            </Text>
          </View>
        )}

        {/* ── Premium card ── */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="book-open-outline" size={22} color={C.primary} />
          </View>
          <Text style={styles.cardTitle}>Premium</Text>

          <View style={styles.featureList}>
            {PREMIUM_FEATURES.map(f => <FeatureRow key={f} text={f} />)}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>€5.99</Text>
            <Text style={styles.priceSub}> / month</Text>
          </View>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => handlePurchase('premium')}
            disabled={!!buying}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start Premium subscription for €5.99 per month"
          >
            {buying === 'premium'
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Text style={styles.outlineBtnText}>Start Premium</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Founder card ── */}
        <View style={[styles.card, styles.cardFounder]}>
          <View style={styles.founderBadge}>
            <Text style={styles.founderBadgeText}>Limited</Text>
          </View>

          <View style={styles.cardIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={C.primary} />
          </View>
          <Text style={styles.cardTitle}>Founding Member</Text>
          <Text style={styles.founderSpots}>Limited to the first 15 readers</Text>

          <View style={styles.featureList}>
            {FOUNDER_FEATURES.map(f => <FeatureRow key={f} text={f} />)}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>€19.99</Text>
            <Text style={styles.priceSub}> · one-time</Text>
          </View>

          <TouchableOpacity
            style={styles.filledBtn}
            onPress={() => handlePurchase('founder')}
            disabled={!!buying}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Become a Founding Member for €19.99 one-time"
          >
            {buying === 'founder'
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.filledBtnText}>Become a Founder</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
          <Text style={styles.footerText}>No commitment. Cancel anytime.</Text>
        </View>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={!!buying}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
        >
          {buying === 'restore'
            ? <ActivityIndicator size="small" color={C.textMuted} />
            : <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 4,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 },

  // ── Hero ──────────────────────────────────────────────────────────────────────
  hero: { alignItems: 'center', marginBottom: 32 },
  heroKanji: {
    fontSize: 28,
    color: C.primary,
    marginBottom: 16,
  },
  heroHeadline: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  heroBody: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // ── Dev notice ────────────────────────────────────────────────────────────────
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  devNoticeText: { fontSize: 12, color: C.textMuted, flex: 1, lineHeight: 18 },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardFounder: {
    borderColor: C.primary,
    overflow: 'hidden',
  },

  founderBadge: {
    position: 'absolute',
    top: 12,
    right: -18,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 3,
    transform: [{ rotate: '30deg' }],
  },
  founderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 4,
  },
  founderSpots: {
    fontSize: 11,
    color: C.textMuted,
    backgroundColor: C.bgFaint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },

  // ── Features ──────────────────────────────────────────────────────────────────
  featureList: { alignSelf: 'stretch', marginBottom: 20, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureCheck: { flexShrink: 0 },
  featureText: { fontSize: 14, color: C.textPrimary, flex: 1, lineHeight: 20 },

  // ── Price ─────────────────────────────────────────────────────────────────────
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  price: {
    fontFamily: 'Georgia',
    fontSize: 30,
    color: C.textPrimary,
    fontWeight: '600',
  },
  priceSub: { fontSize: 14, color: C.textMuted },

  // ── Buttons ───────────────────────────────────────────────────────────────────
  outlineBtn: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: C.primary },

  filledBtn: {
    alignSelf: 'stretch',
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  filledBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
  },
  footerText: { fontSize: 13, color: C.textMuted },

  restoreBtn: { alignItems: 'center', paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  restoreBtnText: { fontSize: 13, color: C.textMuted, textDecorationLine: 'underline' },

  // ── Success state ─────────────────────────────────────────────────────────────
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  successKanji: { fontSize: 40, color: C.primary, marginBottom: 20 },
  successHeadline: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  successBody: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  successBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 13,
    minHeight: 48,
    justifyContent: 'center',
  },
  successBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
