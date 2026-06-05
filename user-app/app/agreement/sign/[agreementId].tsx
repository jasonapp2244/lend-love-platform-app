import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme, spacing, radius, typography } from '../../../src/theme/ThemeProvider';
import { Button } from '../../../src/components/Button';
import { SignaturePad, type SignaturePadHandle } from '../../../src/components/SignaturePad';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../../src/services/firebase';
import { useAuthStore } from '../../../src/store/auth';
import {
  fetchAgreement,
  signAgreement,
  buildAgreementHtml,
} from '../../../src/services/agreements';
import { formatMoney, formatDate } from '../../../src/utils/format';

export default function PreviewAndSign() {
  const { agreementId } = useLocalSearchParams<{ agreementId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { uid } = useAuthStore();
  const qc = useQueryClient();
  const padRef = useRef<SignaturePadHandle>(null);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: agreement, isLoading, refetch } = useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: () => fetchAgreement(agreementId!),
    enabled: !!agreementId,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!agreement || !uid) throw new Error('Missing data');
      if (padRef.current?.isEmpty()) throw new Error('Please draw your signature first.');
      const svg = padRef.current!.toSvg();
      // In demo (single user signs both sides), determine which side to sign first
      const isLoaner = agreement.loanerId === uid;
      const party: 'loaner' | 'borrower' = isLoaner
        ? !agreement.loanerSignatureUrl
          ? 'loaner'
          : 'borrower'
        : 'borrower';
      await signAgreement(agreementId!, party, uid, svg);
      return party;
    },
    onSuccess: async (party) => {
      padRef.current?.clear();
      const freshData = await refetch();
      await qc.invalidateQueries({ queryKey: ['myLoans'] });

      // Generate and upload PDF when both parties have signed
      const fresh = freshData.data;
      if (fresh?.loanerSignatureUrl && fresh?.borrowerSignatureUrl && Platform.OS !== 'web') {
        try {
          const html = buildAgreementHtml(fresh);
          const { uri } = await Print.printToFileAsync({ html });
          const response = await fetch(uri);
          const blob = await response.blob();
          const storageRef = ref(storage, `agreements/${fresh.id}/signed.pdf`);
          await uploadBytes(storageRef, blob);
          const pdfUrl = await getDownloadURL(storageRef);
          await updateDoc(doc(db, 'agreements', fresh.id), { pdfUrl });
        } catch { /* PDF upload is best-effort */ }
      }

      Alert.alert(
        'Signed',
        party === 'loaner'
          ? 'Loaner signature saved. Sign as borrower to activate the loan.'
          : 'Agreement fully signed. The loan is now active.'
      );
    },
    onError: (err: any) => Alert.alert('Could not sign', err?.message ?? 'Try again.'),
  });

  const handlePrint = async () => {
    if (!agreement) return;
    setPrinting(true);
    try {
      const html = buildAgreementHtml(agreement);
      if (Platform.OS === 'web') {
        // On web, open in new tab
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 250);
        }
      } else {
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      Alert.alert('Print failed', e?.message ?? 'Try again.');
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!agreement) return;
    setSharing(true);
    try {
      const html = buildAgreementHtml(agreement);
      if (Platform.OS === 'web') {
        // Trigger HTML download on web
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loan-agreement-${agreement.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Loan Agreement',
          });
        }
      }
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Try again.');
    } finally {
      setSharing(false);
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Preview & e-Sign</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !agreement ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.docCard}>
            <Text style={styles.docTitle}>Loan Agreement</Text>
            <View style={styles.divider} />
            <Text style={styles.meta}>Agreement ID: {agreement.id}</Text>
            <Text style={styles.meta}>Loan ID: {agreement.loanId}</Text>

            <Text style={styles.sectionTitle}>Parties</Text>
            <DocRow label="Loaner" value={agreement.loanerName} />
            <DocRow label="Borrower" value={agreement.borrowerName} />
            <DocRow label="Amount" value={formatMoney(agreement.loanAmount, agreement.currency)} />
            <DocRow label="Interest Rate" value={`${agreement.interestRate.toFixed(2)}%`} />
            <DocRow label="Late Fee/Day" value={formatMoney(agreement.lateFeePerDay)} />

            <Text style={styles.sectionTitle}>Truth-in-Lending Disclosure</Text>
            <View style={styles.tila}>
              <DocRow label="APR" value={`${agreement.apr.toFixed(2)}%`} bold />
              <DocRow label="Finance Charge" value={formatMoney(agreement.financeCharge)} bold />
              <DocRow label="Amount Financed" value={formatMoney(agreement.loanAmount)} bold />
              <DocRow
                label="Total of Payments"
                value={formatMoney(agreement.totalOfPayments)}
                bold
              />
              <Text style={styles.tilaNote}>
                Single payment of {formatMoney(agreement.totalOfPayments)} due {formatDate(agreement.dueDate)}.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.terms}>{agreement.terms}</Text>

            <Text style={styles.sectionTitle}>Signatures</Text>
            <View style={styles.sigRow}>
              <View style={styles.sigBox}>
                <Text style={styles.sigLine}>
                  {agreement.borrowerSignatureUrl ? '✓ Signed' : '— Awaiting —'}
                </Text>
                <Text style={styles.sigName}>Borrower: {agreement.borrowerName}</Text>
              </View>
              <View style={styles.sigBox}>
                <Text style={styles.sigLine}>
                  {agreement.loanerSignatureUrl ? '✓ Signed' : '— Awaiting —'}
                </Text>
                <Text style={styles.sigName}>Loaner: {agreement.loanerName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={handlePrint} disabled={printing} hitSlop={10}>
              <Text style={[styles.actionIcon, { color: theme.textPrimary }]}>
                {printing ? '…' : '🖨'}
              </Text>
            </Pressable>
            <Pressable onPress={handleShare} disabled={sharing} hitSlop={10}>
              <Text style={[styles.actionIcon, { color: theme.textPrimary }]}>
                {sharing ? '…' : '↗'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            Draw your signature
          </Text>
          <SignaturePad ref={padRef} height={180} />

          <View style={styles.signRow}>
            <View style={{ flex: 1 }}>
              <Button
                label="Clear"
                variant="outline"
                fullWidth
                onPress={() => padRef.current?.clear()}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Button
                label="✓ Save Signature"
                variant="primary"
                fullWidth
                loading={signMutation.isPending}
                onPress={() => signMutation.mutate()}
              />
            </View>
          </View>

          {agreement.loanerSignatureUrl && agreement.borrowerSignatureUrl ? (
            <View
              style={[
                styles.complete,
                { backgroundColor: theme.successTint, borderColor: theme.primary },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                ✓ Agreement complete — loan is now active.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DocRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.docRow}>
      <Text style={[styles.docLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.docValue, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
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
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  docTitle: { color: '#3D9A2E', fontSize: 22, fontWeight: '700' },
  divider: {
    height: 2,
    backgroundColor: '#3D9A2E',
    marginVertical: spacing.sm,
  },
  meta: { color: '#555555', fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: '#236E16',
    fontWeight: '700',
    fontSize: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  docLabel: { color: '#555555', fontSize: 13 },
  docValue: { color: '#111827', fontSize: 13, fontWeight: '500' },
  tila: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F5A800',
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  tilaNote: { color: '#78350F', fontSize: 11, marginTop: spacing.xs },
  terms: { color: '#1F2937', fontSize: 13 },
  sigRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  sigBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: spacing.xs,
  },
  sigLine: { color: '#333', fontSize: 11, fontStyle: 'italic' },
  sigName: { color: '#555', fontSize: 11, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  actionIcon: { fontSize: 24 },
  section: { ...typography.h3, marginBottom: spacing.md },
  signRow: { flexDirection: 'row', marginTop: spacing.lg },
  complete: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
});
