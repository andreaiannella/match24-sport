// Splash Screen with Animated Logo - Match Sport 24
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AnimatedLogo } from './AnimatedLogo';
import { COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../../assets/background-gradient.png');

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showText, setShowText] = useState(false);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  
  useEffect(() => {
    // Show text after logo animation starts
    const textTimer = setTimeout(() => {
      setShowText(true);
      textOpacity.value = withTiming(1, { duration: 600 });
    }, 1000);
    
    // Fade out and complete after animation
    const completeTimer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 400 }, () => {
        runOnJS(onComplete)();
      });
    }, 3200);
    
    return () => {
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, []);
  
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  
  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));
  
  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <AnimatedLogo size={150} spinning={false} />
        
        {showText && (
          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.title}>Match Sport 24</Text>
            <Text style={styles.subtitle}>Trova la tua partita</Text>
          </Animated.View>
        )}
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
