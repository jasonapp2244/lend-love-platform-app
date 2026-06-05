/**
 * Push Notification Service
 * Registers for FCM push tokens and saves them to the user's Firestore profile.
 * Handles incoming notifications when the app is in foreground.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and save the token to the user's profile.
 * Call this after successful login.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.log('[push] Must use physical device for push notifications');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '6a09469e-b57d-4344-9dae-5ab2099348d6',
    });
    const token = tokenData.data;

    // Save token to user's Firestore profile
    await updateDoc(doc(db, 'users', uid), {
      fcmTokens: arrayUnion(token),
    });

    console.log('[push] Token registered:', token);
    return token;
  } catch (e) {
    console.log('[push] Failed to get token:', e);
    return null;
  }
}

/**
 * Listen for incoming notifications (foreground).
 * Returns cleanup function.
 */
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void,
): () => void {
  const sub = Notifications.addNotificationReceivedListener(callback);
  return () => sub.remove();
}

/**
 * Listen for notification taps (user opens notification).
 * Returns cleanup function.
 */
export function onNotificationTapped(
  callback: (response: Notifications.NotificationResponse) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(callback);
  return () => sub.remove();
}
