// ── RevenueCat wrapper ────────────────────────────────────────────────────────
//
// iOS: PENDING ACCOUNT — replace RC_API_KEY_IOS with the real key.
// Android: PENDING ACCOUNT — replace RC_API_KEY_ANDROID with the real key.
//   1. In app.revenuecat.com, add an Android app (needs the Play Console
//      service account JSON linked first — see RevenueCat's Play Store setup guide)
//   2. Copy the public SDK key into RC_API_KEY_ANDROID below
//   3. Create the same product IDs in Play Console (Monetize > Products) —
//      PREMIUM_MONTHLY as a subscription, FOUNDER_MEMBER as a one-time product
//   4. Attach both to the existing "premium"/"founder" entitlements and the
//      "default" offering in the RevenueCat dashboard (same entitlements as iOS)
//
// Local StoreKit testing (simulator):
//   After `npx expo run:ios`, open ios/Zenzeii.xcworkspace in Xcode,
//   then Product > Scheme > Edit Scheme > Run > Options > StoreKit Config
//   and select ZenzeiiProducts.storekit from the project root.

import { Platform } from 'react-native';

// ── react-native-purchases import (graceful degradation in Expo Go) ───────────
// This module requires a dev build. In Expo Go it will be null and all
// functions below become no-ops that return safe fallback values.
let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {}

// ── Constants ─────────────────────────────────────────────────────────────────

const RC_API_KEY_IOS = 'test_eVwVAOQGpextGOlNXnTsPDUHted';
// PENDING ACCOUNT: Replace with the Android public SDK key from app.revenuecat.com
const RC_API_KEY_ANDROID = 'PENDING_REVENUECAT_ANDROID_KEY';

export const RC_API_KEY = Platform.OS === 'android' ? RC_API_KEY_ANDROID : RC_API_KEY_IOS;

// These MUST match exactly what is created in App Store Connect (iOS) and
// Play Console (Android) — RevenueCat maps both to the same entitlements below.
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY:  'com.zenzeii.app.premium_monthly',  // Subscription                 €5.99/mo
  FOUNDER_MEMBER:   'com.zenzeii.app.founder_member',   // One-time / non-consumable    €19.99
};

// RevenueCat entitlement identifiers (configured in RC dashboard)
export const ENTITLEMENT = {
  PREMIUM: 'premium',  // granted to both Premium and Founding Member
  FOUNDER: 'founder',  // granted only to Founding Member
};

// ── SDK lifecycle ─────────────────────────────────────────────────────────────

export function isPurchasesAvailable() {
  return Purchases !== null;
}

export function configureRevenueCat(userId) {
  if (!Purchases) return;
  if (RC_API_KEY.startsWith('PENDING_')) {
    console.warn('[purchases] RevenueCat not configured for this platform — see purchases.js header.');
    return;
  }
  Purchases.configure({
    apiKey: RC_API_KEY,
    appUserID: userId,
  });
}

// ── Customer info ─────────────────────────────────────────────────────────────

export async function getCustomerInfo() {
  if (!Purchases) return null;
  return Purchases.getCustomerInfo();
}

export function addCustomerInfoUpdateListener(callback) {
  if (!Purchases) return { remove: () => {} };
  return Purchases.addCustomerInfoUpdateListener(callback);
}

// ── Offerings / packages ──────────────────────────────────────────────────────

export async function getOfferings() {
  if (!Purchases) return null;
  return Purchases.getOfferings();
}

// ── Purchases ─────────────────────────────────────────────────────────────────

export async function purchasePackage(pkg) {
  if (!Purchases) throw new Error('Purchases not available (requires dev build)');
  return Purchases.purchasePackage(pkg);
}

export async function purchaseProduct(productId) {
  if (!Purchases) throw new Error('Purchases not available (requires dev build)');
  return Purchases.purchaseStoreProduct({ productIdentifier: productId });
}

export async function restorePurchases() {
  if (!Purchases) return null;
  return Purchases.restorePurchases();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isEntitlementActive(customerInfo, entitlement) {
  return !!customerInfo?.entitlements?.active?.[entitlement];
}

export function isCancelled(error) {
  // RevenueCat error code 1 = user cancelled
  return error?.userCancelled === true || error?.code === 1;
}
