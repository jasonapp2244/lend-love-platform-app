import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, type PressableProps } from 'react-native';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', loading, icon, fullWidth, disabled, ...rest }: Props) {
  const { theme } = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.primary, fg: '#0D0D0D' },
    secondary: { bg: theme.secondary, fg: '#0D0D0D' },
    outline: { bg: 'transparent', fg: theme.primary, border: theme.primary },
    ghost: { bg: 'transparent', fg: theme.textPrimary },
    danger: { bg: theme.danger, fg: '#FFFFFF' },
  };
  const p = palette[variant];

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: p.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyBold,
  },
});
