import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';
import { Badge } from './Badge';
import { formatMoney, formatDate } from '../utils/format';
import type { LoanRequest } from '../../src/shared';

interface Props {
  request: LoanRequest;
  onPress?: () => void;
}

export function LoanRequestCard({ request, onPress }: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.bgSurface,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.amount, { color: theme.primary }]}>
          {formatMoney(request.amount, request.currency)}
        </Text>
        <Badge label={`${request.repaymentTermMonths} months`} variant="warning" />
      </View>

      <Text style={[styles.purpose, { color: theme.textPrimary }]} numberOfLines={2}>
        {request.purpose}
      </Text>

      <View style={styles.detailRow}>
        <Text style={{ color: theme.textSecondary, marginRight: spacing.xs }}>📅</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>
          Needed by: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{formatDate(request.neededByDate)}</Text>
        </Text>
      </View>

      {request.collateral ? (
        <View style={styles.detailRow}>
          <Text style={{ color: theme.textSecondary, marginRight: spacing.xs }}>🛡</Text>
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{request.collateral}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: { ...typography.h1 },
  purpose: {
    ...typography.body,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: { ...typography.caption },
});
