import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useTheme,
  spacing,
  radius,
  typography,
} from '../src/theme/ThemeProvider';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { DateField } from '../src/components/DateField';
import { Picker } from '../src/components/Picker';
import { TypeToggle } from '../src/components/TypeToggle';
import { useAuthStore } from '../src/store/auth';
import { createLoan } from '../src/services/loans';
import {
  CreateLoanSchema,
  COMPLIANCE,
  PLATFORM_DEFAULTS,
  type CreateLoanInput,
  type InstallmentFrequency,
} from '../src/shared';

const DEFAULT_DUE_MS = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days
const DEFAULT_RETURN_MS = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days

export default function CreateLoanScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const qc = useQueryClient();

  const [type, setType] = useState<'money' | 'item'>('money');

  // Money fields
  const [amount, setAmount] = useState('');
  const [interest, setInterest] = useState('0');
  const [installments, setInstallments] = useState('1');
  const [frequency, setFrequency] = useState<InstallmentFrequency>('monthly');
  const [dueDate, setDueDate] = useState<number>(DEFAULT_DUE_MS);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');

  // Item fields
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [condition, setCondition] = useState('');
  const [deposit, setDeposit] = useState('');
  const [replacement, setReplacement] = useState('');
  const [returnDate, setReturnDate] = useState<number>(DEFAULT_RETURN_MS);

  const mutation = useMutation({
    mutationFn: async (input: CreateLoanInput) => {
      if (!uid) throw new Error('Not signed in');
      return createLoan(uid, input);
    },
    onSuccess: async (loanId) => {
      await qc.invalidateQueries({ queryKey: ['myLoans'] });
      await qc.invalidateQueries({ queryKey: ['marketplace'] });
      router.replace({ pathname: '/loan/[id]', params: { id: loanId } } as never);
    },
    onError: (err: any) => {
      Alert.alert('Could not publish', err?.message ?? 'Please review the form and try again.');
    },
  });

  const handlePublish = () => {
    try {
      const input: CreateLoanInput =
        type === 'money'
          ? {
              type: 'money',
              amount: Number(amount),
              currency: PLATFORM_DEFAULTS.CURRENCY,
              interestRate: Number(interest),
              installments: parseInt(installments, 10) || 1,
              installmentFrequency: frequency,
              lateFeePerDay: 0,
              dueDate,
              description,
              notes,
            }
          : {
              type: 'item',
              itemTitle,
              description: itemDesc,
              condition,
              deposit: deposit ? Number(deposit) : undefined,
              replacementValue: Number(replacement),
              returnDate,
              notes,
            };

      const parsed = CreateLoanSchema.safeParse(input);
      if (!parsed.success) {
        Alert.alert(
          'Check your inputs',
          parsed.error.errors.map((e) => `• ${e.message}`).join('\n')
        );
        return;
      }
      mutation.mutate(parsed.data);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unexpected error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text
          onPress={() => router.back()}
          style={[styles.back, { color: theme.textPrimary }]}
        >
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create Loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.section, { color: theme.textPrimary }]}>Type</Text>
          <TypeToggle
            options={[
              { value: 'money', label: 'Money', emoji: '💸' },
              { value: 'item', label: 'Item', emoji: '📦' },
            ]}
            value={type}
            onChange={(v) => setType(v as 'money' | 'item')}
            activeColor={type === 'money' ? theme.secondary : theme.secondary}
          />

          <View style={{ height: spacing.xl }} />

          {type === 'money' ? (
            <View style={styles.form}>
              <Input
                label="Amount (USD)"
                placeholder="Amount"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                leftIcon={<Text style={{ color: theme.primary }}>$</Text>}
              />
              <View style={styles.rowGap} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Interest %"
                    placeholder="0"
                    keyboardType="numeric"
                    value={interest}
                    onChangeText={setInterest}
                    leftIcon={<Text style={{ color: theme.secondary }}>%</Text>}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Installments"
                    placeholder="1"
                    keyboardType="numeric"
                    value={installments}
                    onChangeText={setInstallments}
                  />
                </View>
              </View>
              <View style={styles.rowGap} />
              <Picker
                label="Installment Frequency"
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Bi-weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'oneTime', label: 'One-Time' },
                ]}
                value={frequency}
                onChange={(v) => setFrequency(v as InstallmentFrequency)}
              />
              <View style={styles.rowGap} />
              <DateField
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
                minDate={new Date(Date.now() + COMPLIANCE.MIN_LOAN_TERM_DAYS * 24 * 60 * 60 * 1000)}
              />
              <View style={styles.rowGap} />
              <Input
                label="Description"
                placeholder="Short description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                style={{ height: 80, textAlignVertical: 'top' }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input label="Item Title" placeholder="Item Title" value={itemTitle} onChangeText={setItemTitle} />
              <View style={styles.rowGap} />
              <Input
                label="Description"
                placeholder="Description"
                value={itemDesc}
                onChangeText={setItemDesc}
                multiline
                style={{ height: 100, textAlignVertical: 'top' }}
              />
              <View style={styles.rowGap} />
              <Input
                label="Condition"
                placeholder="e.g., New, Good"
                value={condition}
                onChangeText={setCondition}
              />
              <View style={styles.rowGap} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Deposit (optional)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={deposit}
                    onChangeText={setDeposit}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Replacement Value"
                    placeholder="0"
                    keyboardType="numeric"
                    value={replacement}
                    onChangeText={setReplacement}
                  />
                </View>
              </View>
              <View style={styles.rowGap} />
              <DateField label="Return Date" value={returnDate} onChange={setReturnDate} />
            </View>
          )}

          <View style={styles.rowGap} />
          <Input
            label="Notes (optional)"
            placeholder="Anything else?"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <View style={{ height: spacing.xxl }} />

          <Button
            label="Publish Loan"
            variant="primary"
            fullWidth
            loading={mutation.isPending}
            onPress={handlePublish}
          />
          <View style={{ height: spacing.md }} />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  section: { ...typography.h3, marginBottom: spacing.md },
  form: { width: '100%' },
  row: { flexDirection: 'row' },
  rowGap: { height: spacing.md },
});
