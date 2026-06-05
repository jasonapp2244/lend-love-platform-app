import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { usePlatformConfig } from '../../src/hooks/usePlatformConfig';
import { Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../src/services/firebase';
import {
  fetchConversation,
  subscribeToMessages,
  sendMessage,
  sendAttachmentMessage,
  counterpartyName,
} from '../../src/services/chat';
import { blockUser } from '../../src/services/moderation';
import { ReportModal } from '../../src/components/ReportModal';
import type { Conversation, Message } from '../../src/shared';

export default function ConversationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const { flag } = usePlatformConfig();
  const chatAttachmentsEnabled = flag('mobile.chatAttachments');

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const otherUserId = conv?.participantIds.find((p) => p !== uid) ?? '';

  useEffect(() => {
    if (!id) return;
    fetchConversation(id).then(setConv);
    const unsub = subscribeToMessages(id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    });
    return unsub;
  }, [id]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || !uid || !id) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(id, uid, t);
    } catch {
      setText(t); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async () => {
    if (!uid || !id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `chat/${id}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await sendAttachmentMessage(id, uid, url, 'image');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not send image.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {conv ? counterpartyName(conv.participantIds, uid ?? '') : '…'}
          </Text>
          {conv?.loanId ? (
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              Loan #{conv.loanId.slice(0, 6)}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Options',
              undefined,
              [
                {
                  text: 'Report User',
                  onPress: () => setReportVisible(true),
                },
                {
                  text: 'Block User',
                  style: 'destructive',
                  onPress: () => {
                    if (!uid || !otherUserId) return;
                    Alert.alert('Block this user?', 'They will not be able to message you.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Block',
                        style: 'destructive',
                        onPress: async () => {
                          await blockUser(uid, otherUserId);
                          Alert.alert('Blocked', 'This user has been blocked.');
                          router.back();
                        },
                      },
                    ]);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
          }}
          hitSlop={8}
        >
          <Text style={{ fontSize: 20, color: theme.textSecondary }}>...</Text>
        </Pressable>
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="message"
        contentId={id ?? ''}
        reportedUserId={otherUserId}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id || `${m.senderId}-${m.sentAt}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Bubble msg={item} selfUid={uid} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={theme.primary} />
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                Send the first message to start the conversation.
              </Text>
            )
          }
        />

        <View
          style={[
            styles.composer,
            { backgroundColor: theme.bgSurface, borderTopColor: theme.border },
          ]}
        >
          {chatAttachmentsEnabled && (
            <Pressable
              onPress={handleAttachment}
              disabled={sending}
              hitSlop={8}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Text style={{ fontSize: 20, color: theme.textSecondary }}>📎</Text>
            </Pressable>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
              },
            ]}
          />
          <Pressable
            disabled={!text.trim() || sending}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: !text.trim() ? theme.bgElevated : theme.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.sendIcon, { color: !text.trim() ? theme.textMuted : '#0D0D0D' }]}>
              ➤
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg, selfUid }: { msg: Message; selfUid: string | null }) {
  const { theme } = useTheme();
  const self = msg.senderId === selfUid;
  return (
    <View style={[styles.bubbleRow, { justifyContent: self ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: self ? theme.primary : theme.bgSurface,
            borderColor: self ? theme.primary : theme.border,
            borderTopLeftRadius: self ? radius.lg : 4,
            borderTopRightRadius: self ? 4 : radius.lg,
          },
        ]}
      >
        {msg.attachmentUrl && msg.attachmentType === 'image' && (
          <Image
            source={{ uri: msg.attachmentUrl }}
            style={{ width: 200, height: 150, borderRadius: radius.md, marginBottom: spacing.xs }}
            resizeMode="cover"
          />
        )}
        <Text style={[styles.bubbleText, { color: self ? '#0D0D0D' : theme.textPrimary }]}>
          {msg.text}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: self ? 'rgba(0,0,0,0.5)' : theme.textMuted },
          ]}
        >
          {new Date(msg.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  back: { fontSize: 24 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3 },
  headerSub: { ...typography.caption },
  list: { padding: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xxxl },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  bubble: {
    maxWidth: '78%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bubbleText: { ...typography.body },
  bubbleTime: { ...typography.label, marginTop: 4, fontSize: 10 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { fontSize: 18, fontWeight: '700' },
});
