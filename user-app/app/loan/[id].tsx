import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchLoan } from '../../src/services/loans';
import { openOrCreateConversation } from '../../src/services/chat';
import { useAuthStore } from '../../src/store/auth';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { ReviewModal } from '../../src/components/ReviewModal';
import { formatMoney, formatDate } from '../../src/utils/format';

export default function LoanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, profile } = useAuthStore();
  const [reviewVisible, setReviewVisible] = useState(false);

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => fetchLoan(id!),
    enabled: !!id,
  });

  const contactLoaner = async () => {
    if (!uid || !loan) return;
    try {
      const convId = await openOrCreateConversation([uid, loan.loanerId], loan.id);
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Loan Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={theme.primary} />
      ) : !loan ? (
        <View style={{ padding: spacing.xl }}>
          <Text style={{ color: theme.textSecondary }}>Loan not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.bgSurface, borderColor: theme.border },
            ]}
          >
            {loan.type === 'money' ? (
              <>
                <Text style={[typography.display, { color: theme.primary }]}>
                  {formatMoney(loan.amount, loan.currency)}
                </Text>
                <Badge label="Money Loan" variant="success" />
              </>
            ) : (
              <>
                <Text style={[typography.h1, { color: theme.textPrimary }]}>
                  {loan.itemTitle}
                </Text>
                <Badge label="Item Loan" variant="warning" />
              </>
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.bgSurface, borderColor: theme.border },
            ]}
          >
            {loan.type === 'money' ? (
              <>
                <Row label="Interest Rate" value={`${loan.interestRate}% APR`} theme={theme} />
                <Row
                  label="Installments"
                  value={`${loan.installments} × ${loan.installmentFrequency}`}
                  theme={theme}
                />
                <Row label="Due Date" value={formatDate(loan.dueDate)} theme={theme} />
                {loan.description ? (
                  <Row label="Description" value={loan.description} theme={theme} />
                ) : null}
              </>
            ) : (
              <>
                <Row label="Condition" value={loan.condition} theme={theme} />
                <Row
                  label="Replacement Value"
                  value={formatMoney(loan.replacementValue)}
                  theme={theme}
                />
                {loan.deposit !== undefined ? (
                  <Row label="Deposit" value={formatMoney(loan.deposit)} theme={theme} />
                ) : null}
                <Row label="Return Date" value={formatDate(loan.returnDate)} theme={theme} />
                <Row label="Description" value={loan.description} theme={theme} />
                {loan.notes ? <Row label="Notes" value={loan.notes} theme={theme} /> : null}
              </>
            )}
          </View>

          {loan.agreementId ? (
            <Button
              label="View Agreement"
              variant="primary"
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/agreement/sign/[agreementId]',
                  params: { agreementId: loan.agreementId! },
                } as never)
              }
            />
          ) : (
            <>
              <Button label="Contact Loaner" variant="primary" fullWidth onPress={contactLoaner} />
              {loan.type === 'money' ? (
                <Button
                  label="Draft Agreement"
                  variant="outline"
                  fullWidth
                  onPress={() =>
                    router.push({
                      pathname: '/agreement/draft/[loanId]',
                      params: { loanId: loan.id },
                    } as never)
                  }
                />
              ) : null}
            </>
          )}

          {/* Review button for completed loans */}
          {loan.status === 'completed' && uid && (
            <>
              <View style={{ height: spacing.md }} />
              <Button
                label="Leave a Review"
                variant="secondary"
                fullWidth
                onPress={() => setReviewVisible(true)}
              />
              <ReviewModal
                visible={reviewVisible}
                onClose={() => setReviewVisible(false)}
                targetUid={loan.loanerId === uid ? (loan.borrowerId ?? '') : loan.loanerId}
                targetName={loan.loanerId === uid ? 'Borrower' : 'Loaner'}
                loanId={loan.id}
              />
            </>
          )}
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
      <Text style={[typography.body, { color: theme.textPrimary, marginTop: 2 }]}>
        {value}
      </Text>
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
