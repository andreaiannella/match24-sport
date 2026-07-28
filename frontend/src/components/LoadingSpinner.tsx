// Loading Spinner Component with Animated Logo
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { LogoSpinner } from './AnimatedLogo';
import { GradientBackground } from './GradientBackground';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  const logoSize = size === 'small' ? 40 : 70;
  
  if (fullScreen) {
    return (
      <GradientBackground>
        <View style={styles.fullScreen}>
          <LogoSpinner size={logoSize} />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </GradientBackground>
    );
  }

  return (
    <View style={styles.container}>
      <LogoSpinner size={logoSize} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
