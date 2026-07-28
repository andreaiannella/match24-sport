// Onboarding Tutorial Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/utils/constants';
import { Button, GradientBackground } from '../src/components';
import { mediumHaptic } from '../src/utils/haptics';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'tennisball',
    iconColor: COLORS.primary,
    title: 'Trova la tua partita',
    description: 'Cerca partite di Padel, Tennis, Calcetto e Calcio a 8 nella tua zona. Filtra per sport, livello e orario.',
  },
  {
    id: '2',
    icon: 'people',
    iconColor: COLORS.secondary,
    title: 'Incontra nuovi giocatori',
    description: 'Unisciti a partite con giocatori del tuo livello. Chatta con i partecipanti e organizza i dettagli.',
  },
  {
    id: '3',
    icon: 'trophy',
    iconColor: COLORS.accent,
    title: 'Migliora il tuo rating',
    description: 'Registra i risultati delle partite e scala la classifica. Il sistema ELO ti abbina con avversari adeguati.',
  },
  {
    id: '4',
    icon: 'business',
    iconColor: COLORS.info,
    title: 'Per i circoli sportivi',
    description: 'Sei un gestore di un circolo? Registra il tuo club, gestisci i campi e attira nuovi clienti.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    mediumHaptic();
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    mediumHaptic();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    mediumHaptic();
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
    router.replace('/');
  };

  const currentSlide = slides[currentIndex];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Skip Button */}
        <View style={styles.header}>
          {currentIndex > 0 ? (
            <TouchableOpacity onPress={handlePrev} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Salta</Text>
          </TouchableOpacity>
        </View>

        {/* Current Slide */}
        <View style={styles.slideContainer}>
          <View style={[styles.iconContainer, { backgroundColor: currentSlide.iconColor + '30' }]}>
            <Ionicons name={currentSlide.icon} size={80} color={currentSlide.iconColor} />
          </View>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.description}>{currentSlide.description}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setCurrentIndex(index)}
              style={[
                styles.dot,
                {
                  width: currentIndex === index ? 24 : 8,
                  backgroundColor: currentIndex === index ? COLORS.primary : COLORS.surface,
                },
              ]}
            />
          ))}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomContainer}>
          <Button
            title={currentIndex === slides.length - 1 ? 'Inizia ora' : 'Avanti'}
            onPress={handleNext}
            fullWidth
            size="large"
            icon={
              <Ionicons
                name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={COLORS.background}
              />
            }
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.85,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
