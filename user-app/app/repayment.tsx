import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { usePlatformConfig } from '../src/hooks/usePlatformConfig';
import { fetchLoan } from '../src/services/loans';
import { formatMoney, formatDate } from '../src/utils/format';

export default function Repayment() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { flag } = usePlatformConfig();
  const paykingsEnabled = flag('integrations.paykings.enabled');

  const { data: loan } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => fetchLoan(loanId!),
    enabled: !!loanId,
  });

  const [amount, setAmount] = useState('');

  const handlePay = () => {
    if (!paykingsEnabled) {
      Alert.alert(
        'Payment Processing Unavailable',
        'Payments will be available once the platform administrator enables Paykings integration.',
      );
      return;
    }
    Alert.alert('Coming Soon', 'Repayment processing will be available when the platform goes live.');
  };

  const moneyLoan = loan?.type === 'money' ? loan : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>←</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Make Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {moneyLoan && (
          <View style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
            <Text style={[typography.h3, { color: theme.textPrimary }]}>Loan Summary</Text>
            <View style={{ height: spacing.md }} />
            <Row label="Total Amount" value={formatMoney(moneyLoan.amount, moneyLoan.currency)} theme={theme} />
            <Row label="Balance" value={formatMoney(moneyLoan.balance ?? moneyLoan.amount, moneyLoan.currency)} theme={theme} highlight />
            <Row label="Interest Rate" value={`${moneyLoan.interestRate}% APR`} theme={theme} />
            <Row label="Installments" value={`${moneyLoan.installments}x ${moneyLoan.installmentFrequency}`} theme={theme} />
            <Row label="Due Date" value={formatDate(moneyLoan.dueDate)} theme={theme} />
          </View>
        )}

        <View style={{ height: spacing.xl }} />

        <Input
          label="Payment Amount (USD)"
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          leftIcon={<Text style={{ color: theme.primary }}>$</Text>}
        />

        <View style={{ height: spacing.lg }} />

        <Button label="Pay Now" variant="primary" fullWidth onPress={handlePay} />

        <View style={{ height: spacing.md }} />

        <Button
          label="Set Up Auto-Pay"
          variant="outline"
          fullWidth
          onPress={() => {
            if (!paykingsEnabled) {
              Alert.alert('Coming Soon', 'Auto-pay will be available when payment integration is enabled.');
              return;
            }
            Alert.alert('Auto-Pay', 'Automatic installment payments will deduct on each due date from your saved payment method.');
          }}
        />

        <View style={{ height: spacing.xl }} />
        <View style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            Payments are processed securely through Paykings (NMI Gateway). Your payment method will be charged immediately.
            For ACH transfers, processing takes 1-2 business days.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, theme, highlight }: { label: string; value: string; theme: any; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text style={[typography.body, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[typography.bodyBold, { color: highlight ? theme.primary : theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  back: { fontSize: 24 },
  title: { ...typography.h2 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl },
});
