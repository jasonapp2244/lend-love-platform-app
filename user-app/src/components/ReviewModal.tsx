import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Alert, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth';
import { submitReview } from '../services/reviews';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Input } from './Input';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  targetUid: string;
  targetName: string;
  loanId: string;
}

export function ReviewModal({ visible, onClose, targetUid, targetName, loanId }: ReviewModalProps) {
  const { theme } = useTheme();
  const { uid, profile } = useAuthStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!uid || !profile) return;
    setSubmitting(true);
    try {
      await submitReview(targetUid, uid, profile.fullName, loanId, rating, comment);
      Alert.alert('Review Submitted', `Thank you for reviewing ${targetName}!`);
      setRating(5);
      setComment('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          <Text style={[typography.h2, { color: theme.textPrimary, marginBottom: spacing.md }]}>
            Rate {targetName}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} hitSlop={4}>
                <Text style={{ fontSize: 36, color: star <= rating ? theme.secondary : theme.border }}>
                  {star <= rating ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.lg, textAlign: 'center' }]}>
            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
          </Text>

          <Input
            label="Comment (optional)"
            placeholder="Share your experience"
            value={comment}
            onChangeText={setComment}
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <View style={{ height: spacing.lg }} />

          <Button label="Submit Review" variant="primary" fullWidth loading={submitting} onPress={handleSubmit} />
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
