import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { PlatformConfigProvider } from '../src/hooks/usePlatformConfig';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useAuthStore } from '../src/store/auth';
import { onAuthChange, getProfile } from '../src/services/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthListener() {
  const { setUid, setProfile, setLoading } = useAuthStore();
  useEffect(() => {
    setLoading(true);
    return onAuthChange(async (uid) => {
      setUid(uid);
      if (uid) {
        const profile = await getProfile(uid);
        setProfile(profile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [setUid, setProfile, setLoading]);
  return null;
}

function RootNav() {
  const { theme, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bgBase },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <PlatformConfigProvider>
                <OfflineBanner />
                <AuthListener />
                <RootNav />
              </PlatformConfigProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
