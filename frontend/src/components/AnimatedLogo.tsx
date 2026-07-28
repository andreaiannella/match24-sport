// Animated Logo Component - Match Sport 24
// Logo "24" with stretch and spin animation
import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../utils/constants';

interface AnimatedLogoProps {
  size?: number;
  spinning?: boolean; // Simple spinning mode for loading states
  onAnimationComplete?: () => void;
}

export function AnimatedLogo({ size = 120, spinning = false, onAnimationComplete }: AnimatedLogoProps) {
  // Animation values
  const rotation = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  
  useEffect(() => {
    if (spinning) {
      // Simple continuous spin for loading states
      rotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1, // Infinite
        false
      );
    } else {
      // Complex animation sequence for splash screen
      // Phase 1: Stretch horizontally and rotate
      scaleX.value = withSequence(
        withTiming(1.3, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withDelay(200, withTiming(0.8, { duration: 300 })),
        withTiming(1, { duration: 300 })
      );
      
      // Phase 2: Stretch vertically
      scaleY.value = withSequence(
        withDelay(400, withTiming(1.2, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })),
        withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withDelay(200, withTiming(1.2, { duration: 300 })),
        withTiming(1, { duration: 300 })
      );
      
      // Rotation: Full 360 spin
      rotation.value = withSequence(
        withDelay(100, withTiming(360, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })),
        withDelay(200, withTiming(720, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
      );
      
      // Callback when animation completes
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 2800);
      }
    }
  }, [spinning]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  });
  
  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/images/logo-24.png')}
        style={[
          {
            width: size,
            height: size,
          },
          animatedStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

// Simple spinning loader version
export function LogoSpinner({ size = 60 }: { size?: number }) {
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });
  
  return (
    <Animated.Image
      source={require('../../assets/images/logo-24.png')}
      style={[
        {
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
