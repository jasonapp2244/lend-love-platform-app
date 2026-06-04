import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/**
 * Demo mode = mock all paid integrations (Paykings, ID Analyzer, etc.)
 * so the app is fully demoable on the Firebase Spark (free) plan.
 *
 * Flip to `false` once Blaze is enabled and client has approved go-live.
 */
export const DEMO_MODE = extra.demoMode !== false;

export const FIREBASE_CONFIG = {
  apiKey: extra.firebaseApiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: extra.firebaseAuthDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: extra.firebaseProjectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: extra.firebaseStorageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: extra.firebaseMessagingSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: extra.firebaseAppId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: extra.firebaseMeasurementId ?? process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};
