import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { TabBar } from '../../src/components/TabBar';
import { SkeletonCard } from '../../src/components/SkeletonCard';
import { LoanCard } from '../../src/components/LoanCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/auth';
import { useMyLending, useMyBorrowing } from '../../src/hooks/useMarketplace';

type Tab = 'lending' | 'borrowing';

export default function MyLoans() {
  const { theme } = useTheme();
  const router = useRouter();
  const { uid } = useAuthStore();
  const [tab, setTab] = useState<Tab>('lending');

  const lending = useMyLending(uid);
  const borrowing = useMyBorrowing(uid);
  const active = tab === 'lending' ? lending : borrowing;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>My Loans</Text>
      </View>

      <TabBar
        tabs={[
          { key: 'lending', label: 'Lending' },
          { key: 'borrowing', label: 'Borrowing' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <FlatList
        data={active.data ?? []}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            onPress={() =>
              router.push({ pathname: '/loan/[id]', params: { id: item.id } } as never)
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={active.isFetching && !active.isLoading}
            onRefresh={() => active.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          active.isLoading ? (
            <View style={{ padding: spacing.xl }}><SkeletonCard count={3} /></View>
          ) : (
            <EmptyState
              icon="▢"
              title={
                tab === 'lending' ? 'No loans created yet' : 'No borrowed loans yet'
              }
              message={
                tab === 'lending'
                  ? 'Create loans to lend money or items'
                  : 'Request or accept loans to see them here'
              }
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/create-loan' as never)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1, flexDirection: 'row', gap: 6 },
        ]}
      >
        <Ionicons name="add" size={20} color="#0D0D0D" />
        <Text style={styles.fabText}>Create Loan</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.xl,
    paddingBottom: 100,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#0D0D0D',
    fontWeight: '700',
    fontSize: 15,
  },
});
