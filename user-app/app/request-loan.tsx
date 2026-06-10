import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { DateField } from '../src/components/DateField';
import { useAuthStore } from '../src/store/auth';
import { usePlatformConfig } from '../src/hooks/usePlatformConfig';
import { createLoanRequest } from '../src/services/loans';
import { createLoanRequestSchema } from '../src/services/dynamic-schemas';
import {
  PLATFORM_DEFAULTS,
  type CreateLoanRequestInput,
} from '../src/shared';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export default function RequestLoanScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, profile } = useAuthStore();
  const { config } = usePlatformConfig();
  const qc = useQueryClient();

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [neededByDate, setNeededByDate] = useState<number>(Date.now() + ONE_WEEK);
  const [termMonths, setTermMonths] = useState('3');
  const [collateral, setCollateral] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (input: CreateLoanRequestInput) => {
      if (!uid) throw new Error('Not signed in');
      return createLoanRequest(uid, input);
    },
    onSuccess: async (id) => {
      await qc.invalidateQueries({ queryKey: ['marketplace', 'requests'] });
      router.replace({ pathname: '/request/[id]', params: { id } } as never);
    },
    onError: (err: any) =>
      Alert.alert('Could not post request', err?.message ?? 'Try again.'),
  });

  const handleSubmit = () => {
    setValidationErrors([]);
    // Block if platform is in read-only maintenance mode
    if (config.featureFlags['maintenance.readOnlyMode'] === true) {
      Alert.alert('Maintenance', 'The platform is temporarily in read-only mode. Please try again later.');
      return;
    }
    // Enforce KYC requirement if admin enabled it
    const requireKyc = config.featureFlags['compliance.requireKycForBorrowing'] === true;
    if (requireKyc && profile && !profile.isVerified) {
      Alert.alert(
        'KYC Required',
        'You must verify your identity before requesting a loan.',
        [
          { text: 'Verify Now', onPress: () => router.push('/kyc' as never) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    const input: CreateLoanRequestInput = {
      amount: Number(amount),
      currency: PLATFORM_DEFAULTS.CURRENCY,
      purpose: purpose.trim(),
      neededByDate,
      repaymentTermMonths: parseInt(termMonths, 10) || 0,
      collateral: collateral.trim() || undefined,
    };
    const parsed = createLoanRequestSchema(config).safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      setValidationErrors(errors);
      Alert.alert('Check your inputs', errors.map((e) => `• ${e}`).join('\n'));
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Request a Loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.banner,
              { backgroundColor: theme.warningTint, borderColor: theme.secondary },
            ]}
          >
            <Text style={{ marginRight: spacing.sm }}>📄</Text>
            <Text style={[typography.body, { color: theme.textPrimary, flex: 1 }]}>
              Post a request and loaners on the platform can offer to fulfill it. You'll see all
              offers in your messages.
            </Text>
          </View>

          <View style={{ height: spacing.lg }} />

          <Input
            label="Amount Needed (USD)"
            placeholder="0"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            leftIcon={<Text style={{ color: theme.primary }}>$</Text>}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Purpose"
            placeholder="What is this loan for?"
            value={purpose}
            onChangeText={setPurpose}
            multiline
            style={{ height: 90, textAlignVertical: 'top' }}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Repayment Term (months)"
            placeholder="3"
            keyboardType="numeric"
            value={termMonths}
            onChangeText={setTermMonths}
            leftIcon={<Text style={{ color: theme.textSecondary }}>📅</Text>}
          />

          <View style={{ height: spacing.md }} />

          <DateField
            label="Needed By"
            value={neededByDate}
            onChange={setNeededByDate}
            minDate={new Date()}
          />

          <View style={{ height: spacing.md }} />

          <Input
            label="Collateral (optional)"
            placeholder="e.g., vehicle title, electronics"
            value={collateral}
            onChangeText={setCollateral}
            leftIcon={<Text style={{ color: theme.textSecondary }}>🛡</Text>}
          />

          <View style={{ height: spacing.xxl }} />

          {validationErrors.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: theme.danger ?? '#FF3B30', backgroundColor: theme.dangerTint ?? 'rgba(255,59,48,0.1)', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
              <Text style={[typography.bodyBold, { color: theme.danger ?? '#FF3B30', marginBottom: spacing.xs }]}>
                Please fix the following:
              </Text>
              {validationErrors.map((err, i) => (
                <Text key={i} style={[typography.body, { color: theme.danger ?? '#FF3B30' }]}>
                  • {err}
                </Text>
              ))}
            </View>
          )}

          <Button
            label="📤 Post Request"
            variant="primary"
            fullWidth
            loading={mutation.isPending}
            onPress={handleSubmit}
          />
          <View style={{ height: spacing.md }} />
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
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
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
