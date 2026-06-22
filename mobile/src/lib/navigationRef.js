import { createNavigationContainerRef } from '@react-navigation/native';

// Shared navigation ref — allows navigation from outside the component tree
// (notification response handlers, deep links, etc.)
export const navigationRef = createNavigationContainerRef();
