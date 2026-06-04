import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/store/auth';
import { useMyLending, useMyBorrowing } from '../src/hooks/useMarketplace';
import { formatMoney } from '../src/utils/format';
import type { Loan } from '../src/shared';

export default function Analytics() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, profile } = useAuthStore();
  const lending = useMyLending(uid);
  const borrowing = useMyBorrowing(uid);

  const allLoans = useMemo(
    () => [...(lending.data ?? []), ...(borrowing.data ?? [])],
    [lending.data, borrowing.data],
  );

  const totalLent = profile?.totalLent ?? 0;
  const totalBorrowed = profile?.totalBorrowed ?? 0;
  const activeCount = allLoans.filter(
    (l) => l.status === 'active' || l.status === 'published',
  ).length;

  // Loan type breakdown
  const moneyLoans = allLoans.filter((l) => l.type === 'money');
  const itemLoans = allLoans.filter((l) => l.type === 'item');
  const moneyPct = allLoans.length > 0 ? Math.round((moneyLoans.length / allLoans.length) * 100) : 0;
  const itemPct = allLoans.length > 0 ? 100 - moneyPct : 0;

  // Status breakdown for bar chart
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allLoans.forEach((l) => {
      counts[l.status] = (counts[l.status] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allLoans]);

  const maxStatusCount = Math.max(1, ...statusCounts.map(([, c]) => c));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        {/* KPI Cards */}
        <View style={styles.row}>
          <Stat tint={theme.successTint} color={theme.primary} icon="🐖" label="Total Lent" value={formatMoney(totalLent)} />
          <Stat tint={theme.warningTint} color={theme.secondary} icon="📄" label="Total Borrowed" value={formatMoney(totalBorrowed)} />
        </View>
        <View style={styles.row}>
          <Stat tint={theme.successTint} color={theme.primary} icon="✓" label="Active Loans" value={String(activeCount)} />
          <Stat tint={theme.dangerTint} color={theme.danger} icon="⚠" label="Overdue" value={String(profile?.overdueLoans ?? 0)} />
        </View>

        {/* Loan Types Donut */}
        <Text style={[typography.h2, { color: theme.textPrimary, marginTop: spacing.xl }]}>
          Loan Types
        </Text>
        <View style={[styles.chartCard, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          {allLoans.length === 0 ? (
            <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>
              No loans yet
            </Text>
          ) : (
            <View style={styles.donutRow}>
              {/* Simple donut using nested Views */}
              <View style={styles.donutContainer}>
                <View style={[styles.donutOuter, { borderColor: theme.secondary }]}>
                  <View style={[styles.donutInner, { backgroundColor: theme.bgSurface }]}>
                    <Text style={[typography.numeric, { color: theme.textPrimary }]}>
                      {allLoans.length}
                    </Text>
                    <Text style={[typography.caption, { color: theme.textMuted }]}>Total</Text>
                  </View>
                </View>
              </View>
              <View style={styles.donutLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                  <Text style={[typography.body, { color: theme.textPrimary }]}>
                    Money: {moneyLoans.length} ({moneyPct}%)
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.secondary }]} />
                  <Text style={[typography.body, { color: theme.textPrimary }]}>
                    Items: {itemLoans.length} ({itemPct}%)
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Status Breakdown Bar Chart */}
        <Text style={[typography.h2, { color: theme.textPrimary, marginTop: spacing.xl }]}>
          Loan Status Breakdown
        </Text>
        <View style={[styles.chartCard, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          {statusCounts.length === 0 ? (
            <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>
              No loan data
            </Text>
          ) : (
            statusCounts.map(([status, count]) => (
              <View key={status} style={{ marginBottom: spacing.md }}>
                <View style={styles.barLabelRow}>
                  <Text style={[typography.caption, { color: theme.textSecondary, textTransform: 'capitalize' }]}>
                    {status.replace(/-/g, ' ')}
                  </Text>
                  <Text style={[typography.caption, { color: theme.textPrimary, fontWeight: '700' }]}>
                    {count}
                  </Text>
                </View>
                <View style={[styles.barBg, { backgroundColor: theme.bgElevated }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(count / maxStatusCount) * 100}%`,
                        backgroundColor:
                          status === 'active' || status === 'completed'
                            ? theme.primary
                            : status === 'overdue' || status === 'defaulted'
                            ? theme.danger
                            : theme.secondary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Lending vs Borrowing */}
        <Text style={[typography.h2, { color: theme.textPrimary, marginTop: spacing.xl }]}>
          Lending vs Borrowing
        </Text>
        <View style={[styles.chartCard, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          <View style={styles.vsRow}>
            <View style={[styles.vsBox, { borderColor: theme.primary }]}>
              <Text style={[typography.numeric, { color: theme.primary }]}>
                {lending.data?.length ?? 0}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Loans Created</Text>
            </View>
            <View style={[styles.vsBox, { borderColor: theme.secondary }]}>
              <Text style={[typography.numeric, { color: theme.secondary }]}>
                {borrowing.data?.length ?? 0}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Loans Borrowed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  tint,
  color,
  icon,
  label,
  value,
}: {
  tint: string;
  color: string;
  icon: string;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: tint, borderColor: color }]}>
      <Text style={{ color, fontSize: 20 }}>{icon}</Text>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[typography.numeric, { color }]}>{value}</Text>
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
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  chartCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  donutContainer: { alignItems: 'center' },
  donutOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLegend: { flex: 1, gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  vsRow: { flexDirection: 'row', gap: spacing.md },
  vsBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
});
