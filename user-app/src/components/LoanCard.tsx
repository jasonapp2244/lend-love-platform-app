import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';
import { Badge } from './Badge';
import { formatMoney, formatDate } from '../utils/format';
import type { Loan } from '../../src/shared';

interface Props {
  loan: Loan;
  onPress?: () => void;
}

export function LoanCard({ loan, onPress }: Props) {
  const { theme } = useTheme();

  const statusVariant = (() => {
    switch (loan.status) {
      case 'active':
      case 'published':
      case 'completed':
        return 'success';
      case 'overdue':
      case 'defaulted':
        return 'danger';
      case 'pending-agreement':
      case 'pending-disbursement':
        return 'warning';
      default:
        return 'neutral';
    }
  })();

  const statusLabel = (() => {
    switch (loan.status) {
      case 'published':
        return 'Active';
      case 'pending-agreement':
        return 'Pending';
      case 'pending-disbursement':
        return 'Disbursing';
      default:
        return loan.status.charAt(0).toUpperCase() + loan.status.slice(1);
    }
  })();

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
      <View style={styles.headerRow}>
        <View style={styles.iconBlock}>
          {loan.type === 'money' ? (
            <View style={[styles.iconBox, { backgroundColor: theme.successTint }]}>
              <Text style={[styles.iconText, { color: theme.primary }]}>$</Text>
            </View>
          ) : (
            <View style={[styles.iconBox, { backgroundColor: theme.warningTint }]}>
              <Text style={[styles.iconText, { color: theme.secondary }]}>◫</Text>
            </View>
          )}
        </View>

        <View style={styles.mainBlock}>
          {loan.type === 'money' ? (
            <>
              <Text style={[styles.amount, { color: theme.textPrimary }]}>
                {formatMoney(loan.amount, loan.currency)}
              </Text>
              <Text style={[styles.subtype, { color: theme.textSecondary }]}>Money Loan</Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {loan.itemTitle}
              </Text>
              <Text style={[styles.subtype, { color: theme.textSecondary }]}>Item Loan</Text>
            </>
          )}
        </View>

        <Badge label={statusLabel} variant={statusVariant} />
      </View>

      {loan.type === 'money' ? (
        <>
          <DetailRow
            icon="%"
            label="Interest Rate:"
            value={`${loan.interestRate}%`}
            theme={theme}
          />
          <DetailRow
            icon="📅"
            label="Due Date:"
            value={formatDate(loan.dueDate)}
            theme={theme}
          />
          {loan.description ? (
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
              {loan.description}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.description, { color: theme.textPrimary }]} numberOfLines={2}>
            {loan.description}
          </Text>
          <DetailRow
            icon="📅"
            label="Return Date:"
            value={formatDate(loan.returnDate)}
            theme={theme}
          />
          {loan.notes ? (
            <Text style={[styles.notes, { color: theme.textSecondary }]} numberOfLines={1}>
              {loan.notes}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={{ color: theme.textSecondary, marginRight: spacing.xs }}>{icon}</Text>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBlock: { width: 48 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  mainBlock: { flex: 1 },
  amount: { ...typography.h2 },
  title: { ...typography.h3 },
  subtype: {
    ...typography.caption,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailLabel: {
    ...typography.caption,
    marginRight: spacing.xs,
  },
  detailValue: {
    ...typography.caption,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    marginTop: 4,
  },
  notes: {
    ...typography.caption,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
