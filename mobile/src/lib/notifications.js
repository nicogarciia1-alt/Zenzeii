import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './navigationRef';

// ── Storage keys ──────────────────────────────────────────────────────────────
const PUSH_TOKEN_KEY = 'z:push_token';
const PUSH_ASKED_KEY = 'z:push_asked'; // 'asked' | 'dismissed'

// ── Foreground notification behaviour ─────────────────────────────────────────
// Call once at app startup. Controls how notifications appear when the app
// is in the foreground (iOS shows no banner by default without this).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ── Permission helpers ────────────────────────────────────────────────────────

export async function hasPushPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function hasBeenAsked() {
  const val = await AsyncStorage.getItem(PUSH_ASKED_KEY);
  return val !== null;
}

export async function markDismissed() {
  await AsyncStorage.setItem(PUSH_ASKED_KEY, 'dismissed');
}

// ── Token registration ────────────────────────────────────────────────────────

export async function registerForPushNotifications() {
  // Push tokens require a physical device. Simulators without push entitlements
  // and Expo Go on the iOS Simulator return null here.
  if (!Device.isDevice) return null;

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') return null;

  // For EAS/production builds, pass projectId from EAS config.
  // In Expo Go, omitting it uses Expo's own project ID automatically.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData?.data;
  if (!token) return null;

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  await AsyncStorage.setItem(PUSH_ASKED_KEY, 'asked');

  // TODO: POST token to /api/push/register once backend endpoint exists
  // Suggested payload: { token, platform: 'ios', device_id: Device.deviceName }
  // await apiClient.post('/push/register', { token, platform: 'ios' });

  return token;
}

export async function getStoredPushToken() {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

// ── Notification type → navigation route ──────────────────────────────────────
//
// Notification payloads should include a `type` field in data:
//   { type: 'daily_reading_reminder' }
//   { type: 'streak_reminder' }
//   { type: 'vocabulary_review_reminder' }
//
// Returns null if the type is unknown or missing.

// Root navigator is RootStack → Main (Tab) → [MyBooks, Vocabulary, …]
// Nested navigation must go through 'Main' to reach tab screens.
function routeForType(type) {
  switch (type) {
    case 'daily_reading_reminder':
    case 'streak_reminder':
      return { screen: 'Main', params: { screen: 'MyBooks' } };
    case 'vocabulary_review_reminder':
      return {
        screen: 'Main',
        params: { screen: 'Vocabulary', params: { openTab: 'review' } },
      };
    default:
      return null;
  }
}

export function getNotificationRoute(response) {
  const data = response?.notification?.request?.content?.data;
  return routeForType(data?.type ?? null);
}

// ── Navigate from a notification response ─────────────────────────────────────
// Safe to call whether the nav container is ready or not.

export function navigateFromNotification(response) {
  const route = getNotificationRoute(response);
  if (!route) return;

  const go = () => navigationRef.navigate(route.screen, route.params);

  if (navigationRef.isReady()) {
    go();
  } else {
    // Wait for NavigationContainer to mount (cold-start case)
    const unsub = navigationRef.addListener('ready', () => {
      go();
      unsub();
    });
  }
}
