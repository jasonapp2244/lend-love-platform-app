import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DateField } from '../../src/components/DateField';
import { Toggle } from '../../src/components/Toggle';
import { useAuthStore } from '../../src/store/auth';
import { signUp, getProfile } from '../../src/services/auth';
import { SignUpSchema, PRIVACY_URL, TERMS_URL } from '../../src/shared';

export default function SignUp() {
  const { theme } = useTheme();
  const router = useRouter();
  const { setUid, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthday, setBirthday] = useState<number>(
    new Date(new Date().getFullYear() - 25, 0, 1).getTime(), // default: Jan 1, 25 years ago
  );
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    const birthdayISO = new Date(birthday).toISOString().split('T')[0];

    const parsed = SignUpSchema.safeParse({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      birthday: birthdayISO,
      acceptedTos,
    });

    if (!parsed.success) {
      Alert.alert(
        'Check your inputs',
        parsed.error.errors.map((e) => `• ${e.message}`).join('\n'),
      );
      return;
    }

    setLoading(true);
    try {
      const { uid: newUid } = await signUp(
        parsed.data.email,
        parsed.data.password,
        {
          fullName: parsed.data.fullName,
          birthday: birthdayISO,
        },
      );
      setUid(newUid);
      const profile = await getProfile(newUid);
      setProfile(profile);
      Alert.alert(
        'Verify Your Email',
        'A verification link has been sent to your email. Please check your inbox.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home' as never) }],
      );
    } catch (e: any) {
      const msg =
        e?.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : e?.message ?? 'Could not create account.';
      Alert.alert('Sign Up Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text
          onPress={() => router.back()}
          style={[styles.back, { color: theme.textPrimary }]}
        >
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Full Name"
            placeholder="Your full name"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<Text style={{ color: theme.textSecondary }}>👤</Text>}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Text style={{ color: theme.textSecondary }}>✉</Text>}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Password"
            placeholder="Min 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={<Text style={{ color: theme.textSecondary }}>🔑</Text>}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            leftIcon={<Text style={{ color: theme.textSecondary }}>🔑</Text>}
          />

          <View style={{ height: spacing.md }} />

          <DateField
            label="Date of Birth (must be 18+)"
            value={birthday}
            onChange={setBirthday}
            maxDate={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)}
          />

          <View style={{ height: spacing.lg }} />

          <View
            style={[
              styles.tosRow,
              { borderColor: theme.border, backgroundColor: theme.bgSurface },
            ]}
          >
            <Toggle value={acceptedTos} onChange={setAcceptedTos} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.body, { color: theme.textPrimary }]}>
                I agree to the{' '}
                <Text
                  style={{ color: theme.primary, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={{ color: theme.primary, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>

          <View style={{ height: spacing.xl }} />

          <Button
            label="Create Account"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSignUp}
          />

          <View style={{ height: spacing.md }} />

          <Button
            label="Back to Sign In"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  tosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
