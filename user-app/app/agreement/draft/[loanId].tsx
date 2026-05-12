import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTheme, spacing, radius, typography } from '../../../src/theme/ThemeProvider';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { DateField } from '../../../src/components/DateField';
import { useAuthStore } from '../../../src/store/auth';
import { fetchLoan } from '../../../src/services/loans';
import { createDraftAgreement } from '../../../src/services/agreements';
import { COMPLIANCE } from '../../../src/shared';

const DEFAULT_TERMS =
  'Both parties agree to the terms specified. Payment schedule must be respected.';

export default function DraftAgreement() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, profile } = useAuthStore();

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => fetchLoan(loanId!),
    enabled: !!loanId,
  });

  const [amount, setAmount] = useState('');
  const [interest, setInterest] = useState('5');
  const [lateFee, setLateFee] = useState('0');
  const [dueDate, setDueDate] = useState<number>(
    Date.now() + 90 * 24 * 60 * 60 * 1000
  );
  const [terms, setTerms] = useState(DEFAULT_TERMS);

  useEffect(() => {
    if (loan && loan.type === 'money') {
      setAmount(String(loan.amount));
      setInterest(String(loan.interestRate));
      setLateFee(String(loan.lateFeePerDay ?? 0));
      setDueDate(loan.dueDate);
    }
  }, [loan]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!loan || loan.type !== 'money') throw new Error('Money loan required');
      if (!uid || !profile) throw new Error('Not signed in');
      const numAmount = Number(amount);
      const numInterest = Number(interest);
      const numLateFee = Number(lateFee);
      if (!numAmount || numAmount <= 0) throw new Error('Enter a valid loan amount');
      if (numInterest < 0 || numInterest > COMPLIANCE.MAX_APR_PERCENT) {
        throw new Error(`Interest must be between 0 and ${COMPLIANCE.MAX_APR_PERCENT}%`);
      }

      // For demo: if no borrower yet, sign both sides as the same user
      const borrowerId = loan.borrowerId ?? uid;
      const borrowerName = loan.borrowerId ? 'Guest Borrower' : profile.fullName;

      return createDraftAgreement({
        loan: { ...loan, amount: numAmount, interestRate: numInterest, dueDate },
        loanerId: loan.loanerId,
        loanerName: profile.fullName,
        borrowerId,
        borrowerName,
        lateFeePerDay: numLateFee,
        terms,
      });
    },
    onSuccess: (agreementId) => {
      router.replace({
        pathname: '/agreement/sign/[agreementId]',
        params: { agreementId },
      } as never);
    },
    onError: (err: any) =>
      Alert.alert('Could not create draft', err?.message ?? 'Please try again.'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Draft Agreement</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxl }} />
          ) : !loan ? (
            <Text style={{ color: theme.textSecondary }}>Loan not found.</Text>
          ) : loan.type !== 'money' ? (
            <View
              style={[
                styles.banner,
                { backgroundColor: theme.warningTint, borderColor: theme.secondary },
              ]}
            >
              <Text style={{ color: theme.textPrimary }}>
                Item loan agreements are coming next. For now you can only draft money-loan
                agreements.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.banner,
                  { backgroundColor: theme.bgElevated, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: theme.textSecondary, marginRight: spacing.sm }}>📄</Text>
                <Text style={[typography.body, { color: theme.textPrimary, flex: 1 }]}>
                  You are the Loaner. Fill in the agreement details below.
                </Text>
              </View>

              <View style={{ height: spacing.lg }} />

              <Input
                label="Loan Amount (USD)"
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                leftIcon={<Text style={{ color: theme.primary }}>$</Text>}
              />

              <View style={{ height: spacing.md }} />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Interest %"
                    placeholder="0"
                    keyboardType="numeric"
                    value={interest}
                    onChangeText={setInterest}
                    leftIcon={<Text style={{ color: theme.secondary }}>%</Text>}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Late Fee / day"
                    placeholder="0"
                    keyboardType="numeric"
                    value={lateFee}
                    onChangeText={setLateFee}
                    leftIcon={<Text style={{ color: theme.danger }}>⚠</Text>}
                  />
                </View>
              </View>

              <View style={{ height: spacing.md }} />

              <DateField label="Due Date" value={dueDate} onChange={setDueDate} />

              <View style={{ height: spacing.md }} />

              <Input
                label="Terms & Conditions"
                placeholder="Both parties agree to..."
                value={terms}
                onChangeText={setTerms}
                multiline
                style={{ height: 120, textAlignVertical: 'top' }}
              />

              <View style={{ height: spacing.xxl }} />

              <Button
                label="→ Preview & e-Sign"
                variant="primary"
                fullWidth
                loading={mutation.isPending}
                onPress={() => mutation.mutate()}
              />
            </>
          )}
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
  row: { flexDirection: 'row' },
});
