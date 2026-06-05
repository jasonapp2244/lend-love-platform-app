/**
 * Biometric authentication service.
 * Uses expo-local-authentication for FaceID / fingerprint on app launch.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Check if device supports biometric auth. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Get the type of biometric available (FaceID, Fingerprint, etc). */
export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  return 'Biometric';
}

/** Prompt user for biometric authentication. Returns true if successful. */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return true; // skip on web
  const available = await isBiometricAvailable();
  if (!available) return true; // no biometrics = skip gracefully

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Lend Love',
    fallbackLabel: 'Use passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  return result.success;
}
