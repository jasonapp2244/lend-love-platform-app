import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme, spacing, radius, typography } from '../theme/ThemeProvider';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, rightIcon, style, ...rest }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.fieldRow,
          {
            backgroundColor: theme.bgElevated,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityState={{ disabled: rest.editable === false }}
          {...rest}
          style={[styles.input, { color: theme.textPrimary }, style]}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  icon: {
    paddingHorizontal: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});
