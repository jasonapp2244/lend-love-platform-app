import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTheme, spacing, radius, typography } from '../src/theme/ThemeProvider';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Toggle } from '../src/components/Toggle';
import { useAuthStore } from '../src/store/auth';
import { usePlatformConfig } from '../src/hooks/usePlatformConfig';
import { updateProfile } from '../src/services/users';
import { getProfile } from '../src/services/auth';
import { UpdateProfileSchema } from '../src/shared';

export default function AccountSettings() {
  const router = useRouter();
  const { theme } = useTheme();
  const { uid, profile, setProfile } = useAuthStore();
  const { flag } = usePlatformConfig();
  const biometricEnabled = flag('mobile.biometricLogin');

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [notifications, setNotifications] = useState(profile?.notificationsEnabled ?? true);
  const [biometrics, setBiometrics] = useState(profile?.biometricsEnabled ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone ?? '');
      setAddress(profile.address ?? '');
      setOccupation(profile.occupation ?? '');
      setNotifications(profile.notificationsEnabled);
      setBiometrics(profile.biometricsEnabled);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const input = {
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        occupation: occupation.trim() || undefined,
        notificationsEnabled: notifications,
        biometricsEnabled: biometrics,
      };
      const parsed = UpdateProfileSchema.safeParse(input);
      if (!parsed.success) {
        Alert.alert('Check your inputs', parsed.error.errors.map((e) => e.message).join('\n'));
        return;
      }
      await updateProfile(uid, parsed.data);
      const fresh = await getProfile(uid);
      setProfile(fresh);
      Alert.alert('Saved', 'Your changes have been saved.');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text onPress={() => router.back()} style={[styles.back, { color: theme.textPrimary }]}>
          ←
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Account Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[typography.h2, { color: theme.textPrimary }]}>Profile</Text>
          <View style={{ height: spacing.md }} />

          <Input
            label="Full Name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<Text style={{ color: theme.textSecondary }}>👤</Text>}
          />
          <View style={{ height: spacing.md }} />
          <Input
            label="Phone Number"
            placeholder="+1 555-0000"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            leftIcon={<Text style={{ color: theme.textSecondary }}>📞</Text>}
          />
          <View style={{ height: spacing.md }} />
          <Input
            label="Home Address"
            placeholder="Street, City"
            value={address}
            onChangeText={setAddress}
            leftIcon={<Text style={{ color: theme.textSecondary }}>🏠</Text>}
          />
          <View style={{ height: spacing.md }} />
          <Input
            label="Occupation"
            placeholder="Your job title"
            value={occupation}
            onChangeText={setOccupation}
            leftIcon={<Text style={{ color: theme.textSecondary }}>💼</Text>}
          />

          <View style={{ height: spacing.xl }} />
          <Text style={[typography.h2, { color: theme.textPrimary }]}>Preferences</Text>
          <View style={{ height: spacing.md }} />

          <View style={[styles.prefRow, { borderColor: theme.border }]}>
            <View style={styles.prefBody}>
              <Text style={{ color: theme.primary, marginRight: spacing.md }}>🔔</Text>
              <Text style={[typography.body, { color: theme.textPrimary }]}>
                Enable notifications
              </Text>
            </View>
            <Toggle value={notifications} onChange={setNotifications} />
          </View>

          {biometricEnabled && (
            <View style={[styles.prefRow, { borderColor: theme.border }]}>
              <View style={styles.prefBody}>
                <Text style={{ color: theme.secondary, marginRight: spacing.md }}>🔒</Text>
                <Text style={[typography.body, { color: theme.textPrimary }]}>
                  Enable biometrics
                </Text>
              </View>
              <Toggle value={biometrics} onChange={setBiometrics} />
            </View>
          )}

          <View style={{ height: spacing.xl }} />
          <Button
            label="💾 Save Changes"
            variant="primary"
            fullWidth
            loading={saving}
            onPress={handleSave}
          />

          {/* Required by Apple G5.1.1(v) + Google 2024 policy */}
          <View style={{ height: spacing.xl }} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={{ height: spacing.lg }} />

          <Pressable
            onPress={() => router.push('/delete-account' as never)}
            style={({ pressed }) => [
              styles.deleteRow,
              {
                backgroundColor: theme.dangerTint,
                borderColor: theme.danger,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[typography.bodyBold, { color: theme.danger }]}>
              ⚠ Delete Account
            </Text>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>
              Permanently delete your account and personal data
            </Text>
          </Pressable>
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
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  prefBody: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1 },
  deleteRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
  },
});
