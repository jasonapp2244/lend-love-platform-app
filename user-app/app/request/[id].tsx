import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { doc as fsDoc, updateDoc } from 'firebase/firestore';
import { openOrCreateConversation } from '../../src/services/chat';
import { createLoan } from '../../src/services/loans';
import { useAuthStore } from '../../src/store/auth';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { formatMoney, formatDate } from '../../src/utils/format';
import type { LoanRequest } from '../../src/shared';

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'loanRequests', id!));
      return snap.exists() ? (snap.data() as LoanRequest) : null;
    },
    enabled: !!id,
  });

  const messageBorrower = async () => {
    if (!uid || !req) return;
    try {
      const convId = await openOrCreateConversation([uid, req.borrowerId]);
      router.push({ pathname: '/chat/[id]', params: { id: convId } } as never);
    } catch (e: any) {
      Alert.alert('Could not open chat', e?.message ?? 'Try again.');
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Loan Request</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? null : !req ? (
        <View style={{ padding: spacing.xl }}>
          <Text style={{ color: theme.textSecondary }}>Request not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          <View
            style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}
          >
            <Text style={[typography.display, { color: theme.primary }]}>
              {formatMoney(req.amount, req.currency)}
            </Text>
            <Badge label={`${req.repaymentTermMonths} months`} variant="warning" />
          </View>

          <View
            style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}
          >
            <Row label="Purpose" value={req.purpose} theme={theme} />
            <Row label="Needed By" value={formatDate(req.neededByDate)} theme={theme} />
            {req.collateral ? <Row label="Collateral" value={req.collateral} theme={theme} /> : null}
          </View>

          <Button
            label="Offer this loan"
            variant="primary"
            fullWidth
            onPress={async () => {
              if (!uid || !req) return;
              if (uid === req.borrowerId) {
                Alert.alert('Cannot offer', 'You cannot offer a loan to your own request.');
                return;
              }
              try {
                // Create a money loan pre-linked to this borrower
                const loanId = await createLoan(uid, {
                  type: 'money',
                  amount: req.amount,
                  currency: req.currency,
                  interestRate: 0,
                  installments: req.repaymentTermMonths,
                  installmentFrequency: 'monthly',
                  lateFeePerDay: 0,
                  dueDate: req.neededByDate + req.repaymentTermMonths * 30 * 24 * 60 * 60 * 1000,
                  description: `Offer for: ${req.purpose}`,
                });
                // Mark request as fulfilled
                await updateDoc(fsDoc(db, 'loanRequests', req.id), { status: 'fulfilled' });
                // Open chat with borrower
                const convId = await openOrCreateConversation([uid, req.borrowerId], loanId);
                Alert.alert('Loan Offered', 'Your loan offer has been created. Chat with the borrower to finalize terms.');
                router.replace({ pathname: '/loan/[id]', params: { id: loanId } } as never);
              } catch (e: any) {
                Alert.alert('Could not offer', e?.message ?? 'Try again.');
              }
            }}
          />
          <Button label="Message Borrower" variant="outline" fullWidth onPress={messageBorrower} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={{ marginVertical: spacing.sm }}>
      <Text style={[typography.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[typography.body, { color: theme.textPrimary, marginTop: 2 }]}>{value}</Text>
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
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
