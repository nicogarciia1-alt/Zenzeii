import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { flushQueue } from './src/lib/offlineQueue';
import { navigateFromNotification } from './src/lib/notifications';

export default function App() {
  // ── Offline queue flush on reconnect ─────────────────────────────────────────
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

  // ── Push notification response handling ───────────────────────────────────────
  useEffect(() => {
    // Handle taps on notifications while the app is backgrounded
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      navigateFromNotification
    );

    // Handle a notification that was tapped when the app was fully closed
    Notifications.getLastNotificationResponseAsync()
      .then(response => { if (response) navigateFromNotification(response); })
      .catch(() => {});

    return () => tapSub.remove();
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
