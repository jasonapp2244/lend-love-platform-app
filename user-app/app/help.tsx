import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { SUPPORT_URL, PRIVACY_URL, TERMS_URL } from '../src/shared';

export default function Help() {
  const router = useRouter();
  const { theme } = useTheme();

  const open = (url: string) => Linking.openURL(url);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
          We're here to help. Reach our team or read the docs:
        </Text>
        <Link theme={theme} label="Contact Support" onPress={() => open(SUPPORT_URL)} />
        <Link theme={theme} label="Privacy Policy" onPress={() => open(PRIVACY_URL)} />
        <Link theme={theme} label="Terms of Service" onPress={() => open(TERMS_URL)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Link({
  theme,
  label,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.bgSurface,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{label}</Text>
      <Text style={[styles.chev, { color: theme.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  back: { fontSize: 24 },
  title: { ...typography.h2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  chev: { fontSize: 22 },
});
