import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme, spacing, radius } from '../theme/ThemeProvider';

interface Props {
  count?: number;
}

function ShimmerBlock({ width, height }: { width: number | string; height: number }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius: radius.sm,
        backgroundColor: theme.bgElevated,
        opacity: anim,
      }}
    />
  );
}

export function SkeletonCard({ count = 3 }: Props) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            { backgroundColor: theme.bgSurface, borderColor: theme.border },
          ]}
        >
          <View style={styles.row}>
            <ShimmerBlock width={40} height={40} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <ShimmerBlock width="70%" height={14} />
              <ShimmerBlock width="40%" height={12} />
            </View>
            <ShimmerBlock width={60} height={24} />
          </View>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <ShimmerBlock width="90%" height={10} />
            <ShimmerBlock width="60%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
