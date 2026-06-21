import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  configureRevenueCat,
  getCustomerInfo,
  addCustomerInfoUpdateListener,
  isEntitlementActive,
  isPurchasesAvailable,
  ENTITLEMENT,
} from '../lib/purchases';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCustomerInfo(null);
      setLoading(false);
      return;
    }

    if (!isPurchasesAvailable()) {
      // Expo Go or dev build without native module — subscription unavailable
      setLoading(false);
      return;
    }

    configureRevenueCat(user.id);

    let cancelled = false;
    getCustomerInfo()
      .then(info => { if (!cancelled) setCustomerInfo(info); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    const listener = addCustomerInfoUpdateListener(info => {
      if (!cancelled) setCustomerInfo(info);
    });

    return () => {
      cancelled = true;
      listener.remove();
    };
  }, [isAuthenticated, user?.id]);

  const refresh = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch {}
  }, []);

  const isPremium = isEntitlementActive(customerInfo, ENTITLEMENT.PREMIUM);
  const isFounder = isEntitlementActive(customerInfo, ENTITLEMENT.FOUNDER);

  return (
    <SubscriptionContext.Provider value={{
      customerInfo,
      isPremium,
      isFounder,
      loading,
      refresh,
      available: isPurchasesAvailable(),
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
