# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Why SDK 54

The App Store version of Expo Go is SDK 54.0.0 (confirmed June 2026). SDK 55 was awaiting
Apple review as of May 2026; SDK 56 is TestFlight External Beta only.

This project is intentionally pinned to SDK 54 so developers can preview via Expo Go on a
physical iPhone without needing an Apple Developer account or a custom development build.

Current pinned versions (from package.json):
- expo: ~54.0.0
- react: 19.1.0
- react-native: 0.81.5
- expo-secure-store: ~15.0.8
- expo-status-bar: ~3.0.9
- react-native-safe-area-context: ~5.6.0
- react-native-screens: ~4.16.0

When upgrading to a new SDK, run `npx expo install --fix` and then `npx expo-doctor` to verify.
