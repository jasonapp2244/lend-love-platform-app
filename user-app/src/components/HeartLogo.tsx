import React from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * Lend Love™ brand mark (heart + $ on rounded green tile).
 * Used in headers and the Welcome screen.
 */
export function HeartLogo({ size = 64 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo-mark.png')}
      style={[styles.img, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

/**
 * Full Lend Love™ wordmark — green "Lend" + gold "LOVE" with heart-$.
 */
export function FullLogo({ width = 280 }: { width?: number }) {
  return (
    <Image
      source={require('../../assets/logo-full.png')}
      style={{ width, height: width * (1310 / 1850) }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    alignSelf: 'center',
  },
});
