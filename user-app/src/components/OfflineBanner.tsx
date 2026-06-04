import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { spacing, typography } from '../theme/ThemeProvider';

/**
 * Lightweight offline detector. Checks network via fetch to avoid
 * requiring @react-native-community/netinfo as a dependency.
 * Shows a banner when offline.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        // Use a tiny fetch to detect connectivity. On web we can use navigator.onLine.
        if (Platform.OS === 'web') {
          if (mounted) setOffline(!navigator.onLine);
          return;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) setOffline(false);
      } catch {
        if (mounted) setOffline(true);
      }
    };

    check();
    const interval = setInterval(check, 10_000);

    // Web: also listen to online/offline events
    if (Platform.OS === 'web') {
      const goOnline = () => setOffline(false);
      const goOffline = () => setOffline(true);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        mounted = false;
        clearInterval(interval);
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D32F2F',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
