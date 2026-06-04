import React, { useRef } from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ value, onChange, disabled }: Props) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.bgElevated, theme.primary],
  });
  const knobLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackColor, borderColor: theme.border },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              left: knobLeft,
              backgroundColor: value ? '#0D0D0D' : theme.textSecondary,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
