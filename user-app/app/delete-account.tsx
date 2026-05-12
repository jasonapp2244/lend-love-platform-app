import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { useAuthStore } from '../src/store/auth';
import { deleteAccount } from '../src/services/users';
import { DeleteAccountSchema, DELETE_ACCOUNT_URL } from '../src/shared';

export default function DeleteAccount() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, reset } = useAuthStore();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!uid) return;
    const parsed = DeleteAccountSchema.safeParse({ confirmText });
    if (!parsed.success) {
      Alert.alert('Confirm', parsed.error.errors[0]?.message ?? 'Type DELETE to confirm.');
      return;
    }

    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, KYC documents, and personal data. Loan records will be retained anonymously for legal compliance. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount(uid);
              reset();
              router.replace('/(auth)/welcome');
            } catch (e: any) {
              Alert.alert(
                'Could not delete',
                e?.message ?? 'Please try again or contact support.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Delete Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.bigWarn,
              { backgroundColor: theme.dangerTint, borderColor: theme.danger },
            ]}
          >
            <Text style={[typography.h2, { color: theme.danger }]}>
              ⚠ This action is permanent
            </Text>
          </View>

          <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.xl }]}>
            What gets deleted
          </Text>
          <ListItem theme={theme}>Your profile and contact information</ListItem>
          <ListItem theme={theme}>Uploaded KYC documents (ID, selfie, address)</ListItem>
          <ListItem theme={theme}>Saved payment methods</ListItem>
          <ListItem theme={theme}>Push notification tokens</ListItem>
          <ListItem theme={theme}>Profile photos and signatures</ListItem>

          <Text style={[typography.h3, { color: theme.textPrimary, marginTop: spacing.xl }]}>
            What is retained
          </Text>
          <ListItem theme={theme}>
            Loan records (anonymized) — required by federal lending law for 7 years
          </ListItem>
          <ListItem theme={theme}>
            Signed agreements with your name redacted — required for audit
          </ListItem>

          <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.lg }]}>
            You can also delete your account from the web at{' '}
            <Text style={{ color: theme.primary }}>{DELETE_ACCOUNT_URL}</Text>.
          </Text>

          <View style={{ height: spacing.xl }} />

          <Input
            label="Type DELETE to confirm"
            placeholder="DELETE"
            autoCapitalize="characters"
            value={confirmText}
            onChangeText={setConfirmText}
          />

          <View style={{ height: spacing.xl }} />

          <Button
            label="Delete my account permanently"
            variant="danger"
            fullWidth
            loading={busy}
            onPress={handleDelete}
          />
          <View style={{ height: spacing.md }} />
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ListItem({
  theme,
  children,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.li}>
      <Text style={[styles.liDot, { color: theme.textSecondary }]}>•</Text>
      <Text style={[typography.body, { color: theme.textSecondary, flex: 1 }]}>{children}</Text>
    </View>
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
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  bigWarn: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  li: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  liDot: { marginRight: spacing.sm, marginTop: 2 },
});
