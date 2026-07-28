// Animated Card Component with entrance animations
import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, Pressable } from 'react-native';
import { COLORS } from '../utils/constants';
import { lightHaptic } from '../utils/haptics';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export function AnimatedCard({ 
  children, 
  style, 
  delay = 0, 
  onPress,
  disabled = false 
}: AnimatedCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const handlePressIn = () => {
    if (!disabled && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      lightHaptic();
      onPress();
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { translateY },
      { scale: scaleAnim },
    ],
  };

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
      >
        <Animated.View style={[defaultStyle, style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[defaultStyle, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const defaultStyle = {
  backgroundColor: COLORS.surface,
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
};
