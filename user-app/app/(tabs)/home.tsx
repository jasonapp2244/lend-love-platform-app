import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/auth';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { HeartLogo } from '../../src/components/HeartLogo';
import { LoanCard } from '../../src/components/LoanCard';
import { useMyLending, useMyBorrowing } from '../../src/hooks/useMarketplace';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function Home() {
  const { profile, uid } = useAuthStore();
  const { theme } = useTheme();
  const router = useRouter();
  const lending = useMyLending(uid);
  const borrowing = useMyBorrowing(uid);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', uid),
        where('read', '==', false),
        limit(99),
      ),
    ).then((snap) => setUnreadCount(snap.size)).catch(() => {});
  }, [uid]);

  const activeLoans = [...(lending.data ?? []), ...(borrowing.data ?? [])]
    .filter((l) => l.status === 'active' || l.status === 'published')
    .slice(0, 3);

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.bgBase }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <HeartLogo size={32} />
            <Text style={[styles.brand, { color: theme.textPrimary }]}>Lend Love™</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => router.push('/notifications' as never)}>
            <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={[styles.welcome, { color: theme.textSecondary }]}>Welcome back,</Text>
        <Text style={[styles.name, { color: theme.textPrimary }]}>
          {profile?.fullName ?? 'User'}
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="checkmark-circle"
            value={profile?.completedLoans ?? 0}
            label="Completed"
            tint={theme.successTint}
            color={theme.primary}
          />
          <StatCard
            icon="star"
            value={profile?.rating ? profile.rating.toFixed(1) : '–'}
            label="Rating"
            tint={theme.warningTint}
            color={theme.secondary}
          />
          <StatCard
            icon="warning"
            value={profile?.overdueLoans ?? 0}
            label="Overdue"
            tint={theme.dangerTint}
            color={theme.danger}
          />
        </View>

        <Text style={[styles.section, { color: theme.textPrimary }]}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <ActionCard
            label="Create Loan"
            icon="add-circle"
            tint={theme.successTint}
            color={theme.primary}
            onPress={() => router.push('/create-loan' as never)}
          />
          <ActionCard
            label="Request Loan"
            icon="document-text"
            tint={theme.warningTint}
            color={theme.secondary}
            onPress={() => router.push('/request-loan' as never)}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.textPrimary }]}>Active Loans</Text>
          <Pressable onPress={() => router.push('/(tabs)/my-loans')}>
            <Text style={[styles.viewAll, { color: theme.primary }]}>View All</Text>
          </Pressable>
        </View>

        {activeLoans.length === 0 ? (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: theme.bgSurface, borderColor: theme.border },
            ]}
          >
            <Text
              style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}
            >
              No active loans yet. Create or request one to get started.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {activeLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onPress={() =>
                  router.push({ pathname: '/loan/[id]', params: { id: loan.id } } as never)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  tint,
  color,
}: {
  icon: IoniconsName;
  value: string | number;
  label: string;
  tint: string;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: tint, borderColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ActionCard({
  label,
  icon,
  tint,
  color,
  onPress,
}: {
  label: string;
  icon: IoniconsName;
  tint: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: tint, borderColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Ionicons name={icon} size={32} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { ...typography.h3 },
  welcome: { ...typography.body },
  name: { ...typography.display, marginBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { ...typography.numeric },
  statLabel: { ...typography.label },
  section: { ...typography.h3 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  viewAll: { ...typography.bodyBold },
  quickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  action: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 110,
    justifyContent: 'center',
  },
  actionLabel: { ...typography.bodyBold },
  placeholder: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
