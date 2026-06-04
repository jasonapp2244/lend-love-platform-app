import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { FullLogo } from '../../src/components/HeartLogo';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import {
  signIn,
  signInAsGuestLoaner,
  signInAsGuestBorrower,
} from '../../src/services/auth';
import { seedDemoDataForUser } from '../../src/services/demo-seed';
import { APP_TM } from '../../src/shared';

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'none' | 'signin' | 'loaner' | 'borrower'>('none');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setBusy('signin');
    try {
      await signIn(email, password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy('none');
    }
  };

  const handleGuest = async (role: 'loaner' | 'borrower') => {
    setBusy(role);
    try {
      const profile = role === 'loaner' ? await signInAsGuestLoaner() : await signInAsGuestBorrower();
      await seedDemoDataForUser(profile.uid, role);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Could not start demo', e?.message ?? 'Please try again.');
    } finally {
      setBusy('none');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgBase }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <FullLogo width={280} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to continue lending and borrowing
          </Text>

          <View style={styles.form}>
            <Input
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View style={{ height: spacing.md }} />
            <Input
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              style={styles.forgot}
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert('Enter your email', 'Type your email address above, then tap Forgot Password.');
                  return;
                }
                try {
                  await sendPasswordResetEmail(auth, email.trim());
                  Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
                } catch {
                  Alert.alert('Email Sent', 'If an account exists with that email, a reset link has been sent.');
                }
              }}
            >
              <Text style={[styles.forgotText, { color: theme.primary }]}>
                Forgot Password?
              </Text>
            </Pressable>

            <Button
              label="Sign In"
              variant="primary"
              fullWidth
              loading={busy === 'signin'}
              onPress={handleSignIn}
            />
            <View style={{ height: spacing.md }} />
            <Button
              label="Create Account"
              variant="outline"
              fullWidth
              onPress={() => router.push('/(auth)/sign-up')}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text style={[styles.demoTitle, { color: theme.textPrimary }]}>Quick Demo</Text>

          <View style={styles.demoBlock}>
            <Button
              label="Continue as Guest Loaner"
              variant="primary"
              fullWidth
              loading={busy === 'loaner'}
              onPress={() => handleGuest('loaner')}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Continue as Guest Borrower"
              variant="secondary"
              fullWidth
              loading={busy === 'borrower'}
              onPress={() => handleGuest('borrower')}
            />
            <Text style={[styles.demoTip, { color: theme.textMuted }]}>
              Tip: Guest accounts are pre-filled with realistic data. Password is not validated for the demo.
            </Text>
          </View>

          <Text style={[styles.tm, { color: theme.textMuted }]}>{APP_TM}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  logo: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: {
    marginTop: spacing.lg,
  },
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.md,
  },
  forgotText: {
    ...typography.bodyBold,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  demoTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  demoBlock: {
    marginBottom: spacing.xl,
  },
  demoTip: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  tm: {
    ...typography.label,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
