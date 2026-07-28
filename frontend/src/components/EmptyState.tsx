// Empty State Component with animations
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { COLORS } from '../utils/constants';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'fullscreen';
}

export function EmptyState({ 
  icon = 'search-outline', 
  title, 
  message, 
  actionLabel, 
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle bounce animation for the icon
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    bounceLoop.start();

    return () => bounceLoop.stop();
  }, []);

  const isCompact = variant === 'compact';
  const iconSize = isCompact ? 48 : 64;
  const containerSize = isCompact ? 80 : 120;

  return (
    <Animated.View 
      style={[
        styles.container,
        variant === 'fullscreen' && styles.fullscreen,
        isCompact && styles.compact,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View 
        style={[
          styles.iconContainer,
          { 
            width: containerSize, 
            height: containerSize, 
            borderRadius: containerSize / 2,
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={COLORS.primary} />
      </Animated.View>
      <Text style={[styles.title, isCompact && styles.titleCompact]}>{title}</Text>
      {message && (
        <Text style={[styles.message, isCompact && styles.messageCompact]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
          size={isCompact ? 'small' : 'medium'}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  fullscreen: {
    flex: 1,
  },
  compact: {
    padding: 24,
    minHeight: 200,
  },
  iconContainer: {
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 18,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
    minWidth: 160,
  },
});
