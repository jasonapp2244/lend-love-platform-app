import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { useAuthStore } from '../src/store/auth';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { EmptyState } from '../src/components/EmptyState';
import { formatMoney, formatDate } from '../src/utils/format';
import type { Transaction } from '../src/shared';

export default function Transactions() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDocs(
        query(
          collection(db, 'transactions'),
          where('userId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      );
      setTxs(snap.docs.map((d) => d.data() as Transaction));
      setLoading(false);
    })();
  }, [uid]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={txs}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              { backgroundColor: theme.bgSurface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: theme.successTint }]}>
              <Text style={{ color: theme.primary, fontSize: 18 }}>💵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                {item.description ?? item.type}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>
                {formatDate(item.createdAt)} • {item.status}
              </Text>
            </View>
            <Text
              style={[
                typography.bodyBold,
                { color: item.direction === 'credit' ? theme.primary : theme.danger },
              ]}
            >
              {item.direction === 'credit' ? '+' : '−'}
              {formatMoney(item.amount, item.currency)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxxl }} />
          ) : (
            <EmptyState icon="🕒" title="No transactions yet" />
          )
        }
      />
    </SafeAreaView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
