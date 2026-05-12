import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { TabBar } from '../../src/components/TabBar';
import { LoanCard } from '../../src/components/LoanCard';
import { LoanRequestCard } from '../../src/components/LoanRequestCard';
import { EmptyState } from '../../src/components/EmptyState';
import {
  useMarketplaceLoans,
  useMarketplaceRequests,
} from '../../src/hooks/useMarketplace';
import type { Loan, LoanRequest } from '../../src/shared';

type Tab = 'money' | 'items' | 'requests';

export default function Marketplace() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('money');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const moneyQ = useMarketplaceLoans('money');
  const itemsQ = useMarketplaceLoans('item');
  const reqsQ = useMarketplaceRequests();

  const activeQuery = tab === 'money' ? moneyQ : tab === 'items' ? itemsQ : reqsQ;

  const filteredLoans = useMemo<Loan[]>(() => {
    const data = (tab === 'money' ? moneyQ.data : itemsQ.data) ?? [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((l) => {
      if (l.type === 'money') {
        return (
          l.description?.toLowerCase().includes(q) ||
          l.amount.toString().includes(q)
        );
      }
      return l.itemTitle.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
    });
  }, [tab, moneyQ.data, itemsQ.data, search]);

  const filteredRequests = useMemo<LoanRequest[]>(() => {
    const data = reqsQ.data ?? [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) => r.purpose.toLowerCase().includes(q) || r.amount.toString().includes(q)
    );
  }, [reqsQ.data, search]);

  const onRefresh = () => activeQuery.refetch();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Marketplace</Text>
        <Pressable
          onPress={() => {
            setSearchOpen((o) => !o);
            if (searchOpen) setSearch('');
          }}
          hitSlop={8}
        >
          <Ionicons
            name={searchOpen ? 'close' : 'search'}
            size={22}
            color={theme.textPrimary}
          />
        </Pressable>
      </View>

      {searchOpen ? (
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.bgElevated, borderColor: theme.border },
          ]}
        >
          <TextInput
            placeholder="Search loans, items, requests…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      ) : null}

      <TabBar
        tabs={[
          { key: 'money', label: 'Money' },
          { key: 'items', label: 'Items' },
          { key: 'requests', label: 'Requests' },
        ]}
        value={tab}
        onChange={(k) => {
          setTab(k);
          setSearch('');
        }}
      />

      {tab === 'requests' ? (
        <>
          <Pressable
            onPress={() => router.push('/request-loan' as never)}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: theme.secondary, opacity: pressed ? 0.85 : 1, flexDirection: 'row', gap: 6 },
            ]}
          >
            <Ionicons name="add" size={20} color="#0D0D0D" />
            <Text style={styles.fabText}>Post Request</Text>
          </Pressable>
        </>
      ) : null}

      {tab === 'requests' ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <LoanRequestCard
              request={item}
              onPress={() =>
                router.push({ pathname: '/request/[id]', params: { id: item.id } } as never)
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={reqsQ.isFetching && !reqsQ.isLoading}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            reqsQ.isLoading ? (
              <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={theme.primary} />
            ) : (
              <EmptyState
                title="No requests yet"
                message="Loan requests posted by borrowers will appear here."
              />
            )
          }
        />
      ) : (
        <FlatList
          data={filteredLoans}
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
              refreshing={activeQuery.isFetching && !activeQuery.isLoading}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            activeQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={theme.primary} />
            ) : (
              <EmptyState
                title={tab === 'money' ? 'No money loans available' : 'No items available'}
                message="Pull down to refresh or check back later."
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: { ...typography.h1 },
  searchIcon: { fontSize: 18 },
  searchBox: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    ...typography.body,
    paddingVertical: spacing.md,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
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
    zIndex: 10,
  },
  fabText: { color: '#0D0D0D', fontWeight: '700', fontSize: 15 },
});
