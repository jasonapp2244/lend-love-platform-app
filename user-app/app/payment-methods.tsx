import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { usePlatformConfig } from '../src/hooks/usePlatformConfig';

export default function PaymentMethods() {
  const router = useRouter();
  const { theme } = useTheme();
  const { flag } = usePlatformConfig();
  const paykingsEnabled = flag('integrations.paykings.enabled');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [tab, setTab] = useState<'card' | 'bank'>('card');

  const handleSave = () => {
    if (!paykingsEnabled) {
      Alert.alert(
        'Payment Processing Unavailable',
        'Payment integration is not yet enabled. Contact the platform administrator.',
      );
      return;
    }
    // In production: tokenize card/bank via Paykings NMI API
    Alert.alert('Coming Soon', 'Payment methods will be available once the platform is live.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>←</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!paykingsEnabled && (
          <View style={[styles.banner, { backgroundColor: theme.warningTint, borderColor: theme.secondary }]}>
            <Text style={[typography.caption, { color: theme.textPrimary }]}>
              Payment processing is in demo mode. Card/bank details are not stored or processed.
            </Text>
          </View>
        )}

        <View style={styles.tabRow}>
          <Button
            label="Credit / Debit Card"
            variant={tab === 'card' ? 'primary' : 'ghost'}
            onPress={() => setTab('card')}
          />
          <Button
            label="Bank Account (ACH)"
            variant={tab === 'bank' ? 'primary' : 'ghost'}
            onPress={() => setTab('bank')}
          />
        </View>

        {tab === 'card' ? (
          <View style={styles.form}>
            <Input
              label="Card Number"
              placeholder="4242 4242 4242 4242"
              keyboardType="numeric"
              value={cardNumber}
              onChangeText={setCardNumber}
              leftIcon={<Text style={{ color: theme.textSecondary }}>💳</Text>}
            />
            <View style={{ height: spacing.md }} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Expiry" placeholder="MM/YY" value={expiry} onChangeText={setExpiry} />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Input label="CVV" placeholder="123" keyboardType="numeric" secureTextEntry value={cvv} onChangeText={setCvv} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Bank Account Number"
              placeholder="Account number"
              keyboardType="numeric"
              value={bankAccount}
              onChangeText={setBankAccount}
              leftIcon={<Text style={{ color: theme.textSecondary }}>🏦</Text>}
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="Routing Number"
              placeholder="9-digit routing number"
              keyboardType="numeric"
              value={routingNumber}
              onChangeText={setRoutingNumber}
            />
          </View>
        )}

        <View style={{ height: spacing.xl }} />
        <Button label="Save Payment Method" variant="primary" fullWidth onPress={handleSave} />

        <View style={{ height: spacing.xl }} />
        <View style={[styles.infoBox, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            Your card/bank details are securely tokenized by our payment partner (Paykings / NMI Gateway).
            Raw card numbers are never stored on our servers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  back: { fontSize: 24 },
  title: { ...typography.h2 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  form: { width: '100%' },
  row: { flexDirection: 'row' },
  infoBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
});
