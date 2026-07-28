// Global Gradient Background Component - "Notturna" theme
// A night-pitch gradient (deep charcoal-green, not navy) with a single warm floodlight glow
// in the upper corner - the app's one atmospheric signature, used consistently everywhere.
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientBackground({ children, style }: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surfaceLight, COLORS.background]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Floodlight glow - the single atmospheric touch, always upper-right, never repeated elsewhere */}
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: -140,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 340,
    backgroundColor: COLORS.primary,
    opacity: 0.10,
  },
});
