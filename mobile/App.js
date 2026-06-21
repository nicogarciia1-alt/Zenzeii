import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { flushQueue } from './src/lib/offlineQueue';

export default function App() {
  // Flush the offline write queue whenever connectivity is restored.
  // Tracks previous state so we only flush on the offline→online transition.
  useEffect(() => {
    let wasOnline = true;
    const unsub = NetInfo.addEventListener(state => {
      const nowOnline = !!(state.isConnected && state.isInternetReachable !== false);
      if (!wasOnline && nowOnline) {
        flushQueue().catch(() => {});
      }
      wasOnline = nowOnline;
    });
    return unsub;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <StatusBar style="dark" backgroundColor="#FFFFFF" />
          <AppNavigator />
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
