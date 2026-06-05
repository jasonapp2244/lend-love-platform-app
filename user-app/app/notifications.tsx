import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { useAuthStore } from '../src/store/auth';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { EmptyState } from '../src/components/EmptyState';
import { formatDate } from '../src/utils/format';
import type { Notification } from '../src/shared';

const ICON_MAP: Record<string, string> = {
  'loan-published': '📋',
  'loan-applied': '🤝',
  'agreement-signed': '✍',
  'payment-due': '⏰',
  'payment-received': '💰',
  'payment-overdue': '⚠',
  'message-received': '💬',
  'kyc-approved': '✅',
  'kyc-rejected': '❌',
  'admin-message': '📢',
};

export default function Notifications() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(50),
        ),
      );
      setItems(snap.docs.map((d) => d.data() as Notification));
      setLoading(false);
    })();
  }, [uid]);

  const markAsRead = async (notif: Notification) => {
    if (notif.read) return;
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      setItems((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => markAsRead(item)}
            style={[
              styles.card,
              {
                backgroundColor: item.read ? theme.bgSurface : theme.bgElevated,
                borderColor: item.read ? theme.border : theme.primary,
              },
            ]}
          >
            <Text style={{ fontSize: 22 }}>{ICON_MAP[item.type] ?? '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.bodyBold,
                  { color: item.read ? theme.textSecondary : theme.textPrimary },
                ]}
              >
                {item.title}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>{item.body}</Text>
              <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
            {!item.read && (
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="🔔" title="No notifications" message="You're all caught up!" />
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
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
