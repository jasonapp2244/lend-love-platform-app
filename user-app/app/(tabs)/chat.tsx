import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/auth';
import {
  subscribeToConversations,
  counterpartyName,
  fetchCounterpartyName,
} from '../../src/services/chat';
import type { Conversation } from '../../src/shared';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Chat() {
  const { theme } = useTheme();
  const router = useRouter();
  const { uid } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = subscribeToConversations(uid, (list) => {
      setConversations(list);
      setLoading(false);
      // Resolve real names for any conversation whose counterparty shows as "User"
      list.forEach(async (conv) => {
        const key = conv.id;
        if (names[key]) return;
        const name = await fetchCounterpartyName(conv.participantIds, uid);
        setNames((prev) => ({ ...prev, [key]: name }));
      });
    });
    return unsub;
  }, [uid]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Messages</Text>
        <Pressable hitSlop={8}>
          <Ionicons name="search" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/chat/[id]',
                params: { id: item.id },
              } as never)
            }
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? theme.bgElevated : 'transparent',
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
              <Ionicons name="person" size={22} color={theme.textSecondary} />
            </View>
            <View style={styles.body}>
              <View style={styles.bodyTopRow}>
                <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                  {names[item.id] ?? counterpartyName(item.participantIds, uid ?? '')}
                </Text>
                <Text style={[styles.time, { color: theme.textMuted }]}>
                  {timeAgo(item.lastMessageAt)}
                </Text>
              </View>
              <Text
                style={[styles.preview, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {item.lastMessage || '(no messages yet)'}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={theme.primary} />
          ) : (
            <EmptyState
              icon="💬"
              title="No conversations yet"
              message="Start lending or borrowing to chat with others"
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/(tabs)/marketplace')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1, flexDirection: 'row', gap: 6 },
        ]}
      >
        <Ionicons name="create" size={18} color="#0D0D0D" />
        <Text style={styles.fabText}>New Chat</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { flexGrow: 1, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },
  body: { flex: 1 },
  bodyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, flex: 1 },
  time: { ...typography.caption, marginLeft: spacing.sm },
  preview: { ...typography.caption, marginTop: 2 },
  chevron: { fontSize: 20 },
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
  fabText: { color: '#0D0D0D', fontWeight: '700', fontSize: 15 },
});
