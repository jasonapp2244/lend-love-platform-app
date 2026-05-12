import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useTheme, typography, spacing, radius } from '../../src/theme/ThemeProvider';
import { signOut } from '../../src/services/auth';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function Profile() {
  const { theme } = useTheme();
  const { profile, reset } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    reset();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: theme.textPrimary }]}>Profile</Text>
          <Pressable onPress={() => router.push('/account-settings' as never)} hitSlop={8}>
            <Ionicons name="settings-outline" size={26} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.center}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.bgSurface, borderColor: theme.primary },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {profile?.fullName?.[0] ?? '?'}
            </Text>
          </View>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {profile?.fullName ?? 'Unknown'}
          </Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{profile?.email}</Text>

          <View style={styles.ratingRow}>
            <Text style={{ color: theme.secondary, fontSize: 16 }}>★★★★★</Text>
            <Text style={[styles.ratingText, { color: theme.textPrimary }]}>
              {profile?.rating?.toFixed(1) ?? '–'} ({profile?.reviewCount ?? 0} reviews)
            </Text>
          </View>

          {profile?.isVerified ? (
            <View style={[styles.verified, { borderColor: theme.primary, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
              <Text style={[styles.verifiedText, { color: theme.primary }]}>Verified</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/kyc' as never)}
              style={[styles.verified, { borderColor: theme.secondary, flexDirection: 'row', gap: 6 }]}
            >
              <Ionicons name="shield-half-outline" size={16} color={theme.secondary} />
              <Text style={[styles.verifiedText, { color: theme.secondary }]}>
                Verify your identity
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.secondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.statRow}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.successTint, borderColor: theme.primary },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {profile?.completedLoans ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.dangerTint, borderColor: theme.danger },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.danger }]}>
              {profile?.overdueLoans ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Overdue</Text>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}
        >
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Personal Information
          </Text>
          <Row label="Phone" value={profile?.phone} icon="call-outline" />
          <Row label="Address" value={profile?.address} icon="home-outline" />
          <Row label="Birthday" value={profile?.birthday} icon="gift-outline" />
          <Row label="Occupation" value={profile?.occupation} icon="briefcase-outline" />
        </View>

        <View style={{ height: spacing.lg }} />

        <MenuItem
          label="Analytics"
          icon="bar-chart-outline"
          onPress={() => router.push('/analytics' as never)}
        />
        <MenuItem
          label="Transaction History"
          icon="time-outline"
          onPress={() => router.push('/transactions' as never)}
        />
        <MenuItem
          label="Agreements"
          icon="document-text-outline"
          onPress={() => router.push('/agreements' as never)}
        />
        <MenuItem
          label="KYC Verification"
          icon="shield-checkmark-outline"
          onPress={() => router.push('/kyc' as never)}
        />
        <MenuItem
          label="Help & Support"
          icon="help-circle-outline"
          onPress={() => router.push('/help' as never)}
        />

        <View style={{ height: spacing.md }} />

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.logoutRow,
            {
              backgroundColor: theme.bgSurface,
              borderColor: theme.danger,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.danger} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IoniconsName;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        {
          backgroundColor: theme.bgSurface,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.menuLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={theme.primary}
          style={{ marginRight: spacing.md }}
        />
        <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: IoniconsName;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.rowItem}>
      <Ionicons
        name={icon}
        size={18}
        color={theme.textSecondary}
        style={{ marginRight: spacing.md }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[typography.label, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[typography.body, { color: theme.textPrimary, marginTop: 2 }]}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  gear: { fontSize: 24 },
  center: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: '700' },
  name: { ...typography.h1, marginTop: spacing.md },
  email: { ...typography.body, marginTop: spacing.xs },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ratingText: { ...typography.bodyBold },
  verified: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  verifiedText: { ...typography.label, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { ...typography.numeric },
  statLabel: { ...typography.label, marginTop: spacing.xs },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { ...typography.h3, marginBottom: spacing.md },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontSize: 22 },
  logoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  logoutText: { ...typography.bodyBold },
});
