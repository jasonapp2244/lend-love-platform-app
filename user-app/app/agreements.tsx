import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
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
import { Badge } from '../src/components/Badge';
import { formatMoney, formatDate } from '../src/utils/format';
import type { Agreement } from '../src/shared';

export default function Agreements() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const [items, setItems] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [asLoaner, asBorrower] = await Promise.all([
        getDocs(
          query(
            collection(db, 'agreements'),
            where('loanerId', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(30)
          )
        ),
        getDocs(
          query(
            collection(db, 'agreements'),
            where('borrowerId', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(30)
          )
        ),
      ]);
      const all = [
        ...asLoaner.docs.map((d) => d.data() as Agreement),
        ...asBorrower.docs.map((d) => d.data() as Agreement),
      ];
      // Deduplicate (same agreement appears in both queries when user is both parties)
      const seen = new Set<string>();
      const merged = all
        .filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      setItems(merged);
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Agreements</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const signed = !!item.signedAt;
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/agreement/sign/[agreementId]',
                  params: { agreementId: item.id },
                } as never)
              }
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.bgSurface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                  {formatMoney(item.loanAmount, item.currency)} loan
                </Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {item.loanerId === item.borrowerId
                    ? `${item.loanerName} (self-loan demo)`
                    : `Loaner: ${item.loanerName} → Borrower: ${item.borrowerName}`}
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Due {formatDate(item.dueDate)} • APR {item.apr.toFixed(2)}%
                </Text>
              </View>
              <Badge label={signed ? 'Signed' : 'Pending'} variant={signed ? 'success' : 'warning'} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxxl }} />
          ) : (
            <EmptyState
              icon="📄"
              title="No agreements yet"
              message="Once you draft and sign a loan agreement, it will appear here."
            />
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
});
