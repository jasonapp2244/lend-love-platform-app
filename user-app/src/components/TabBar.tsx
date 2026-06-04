import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '../theme/ThemeProvider';

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (key: T) => void;
}

export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? theme.primary : theme.textSecondary,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {t.label}
            </Text>
            <View
              style={[
                styles.underline,
                { backgroundColor: active ? theme.primary : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  label: {
    ...typography.body,
  },
  underline: {
    height: 2,
    width: '60%',
    borderRadius: 1,
    marginTop: spacing.xs,
  },
});
