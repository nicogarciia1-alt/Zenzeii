// ── RevenueCat wrapper ────────────────────────────────────────────────────────
//
// PENDING ACCOUNT: Replace the placeholder values before testing on device.
//   1. Create a free RevenueCat account at app.revenuecat.com
//   2. Add an iOS app → copy the public SDK key into RC_API_KEY
//   3. Create entitlements named "premium" and "founder"
//   4. Add products (match PRODUCT_IDS below) to each entitlement
//   5. Create a "default" offering containing both packages
//
// Local StoreKit testing (simulator):
//   After `npx expo run:ios`, open ios/Zenzeii.xcworkspace in Xcode,
//   then Product > Scheme > Edit Scheme > Run > Options > StoreKit Config
//   and select ZenzeiiProducts.storekit from the project root.

// ── react-native-purchases import (graceful degradation in Expo Go) ───────────
// This module requires a dev build. In Expo Go it will be null and all
// functions below become no-ops that return safe fallback values.
let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {}

// ── Constants ─────────────────────────────────────────────────────────────────

// PENDING ACCOUNT: Replace with the iOS key from app.revenuecat.com
export const RC_API_KEY = 'test_eVwVAOQGpextGOlNXnTsPDUHted';

// These MUST match exactly what is created in App Store Connect
// and in the RevenueCat product catalog.
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY:  'com.zenzeii.app.premium_monthly',  // Auto-Renewable Subscription  €5.99/mo
  FOUNDER_MEMBER:   'com.zenzeii.app.founder_member',   // Non-Consumable (one-time)    €19.99
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
