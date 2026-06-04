import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/auth';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Input } from './Input';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraud / Scam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
] as const;

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: 'message' | 'profile' | 'listing';
  contentId: string;
  reportedUserId?: string;
}

export function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
}: ReportModalProps) {
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!uid || !reason) {
      Alert.alert('Select a reason', 'Please choose why you are reporting this content.');
      return;
    }
    setSubmitting(true);
    try {
      const ref = doc(collection(db, 'reports'));
      await setDoc(ref, {
        id: ref.id,
        reporterId: uid,
        reportedUserId: reportedUserId ?? null,
        contentType,
        contentId,
        reason,
        description: description.trim() || null,
        status: 'open',
        createdAt: Date.now(),
      });
      Alert.alert('Report Submitted', 'Thank you. Our team will review this content.');
      setReason('');
      setDescription('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          <Text style={[typography.h2, { color: theme.textPrimary, marginBottom: spacing.lg }]}>
            Report Content
          </Text>

          {REASONS.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setReason(r.value)}
              style={[
                styles.reasonRow,
                {
                  borderColor: reason === r.value ? theme.primary : theme.border,
                  backgroundColor: reason === r.value ? theme.successTint : theme.bgElevated,
                },
              ]}
            >
              <Text style={[typography.body, { color: theme.textPrimary }]}>{r.label}</Text>
              {reason === r.value && (
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Selected</Text>
              )}
            </Pressable>
          ))}

          <View style={{ height: spacing.md }} />

          <Input
            label="Details (optional)"
            placeholder="Provide additional context"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <View style={{ height: spacing.lg }} />

          <Button
            label="Submit Report"
            variant="danger"
            fullWidth
            loading={submitting}
            onPress={handleSubmit}
          />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" fullWidth onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  reasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
