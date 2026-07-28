// Player Onboarding Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS, SKILL_LEVELS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { GradientBackground } from '../../src/components';

export default function PlayerOnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [city, setCity] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const toggleSport = (sportId: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((s) => s !== sportId)
        : [...prev, sportId]
    );
  };

  const setSkillLevel = (sport: string, level: string) => {
    setSkillLevels((prev) => ({ ...prev, [sport]: level }));
  };

  const handleComplete = async () => {
    if (!city) {
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.updatePlayerProfile({
        city,
        nickname,
        preferred_sports: selectedSports,
        skill_levels: skillLevels,
      });
      router.replace('/player/home');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoIcon}>
              <Ionicons name="person" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Completa il tuo profilo</Text>
            <Text style={styles.subtitle}>
              Aiutaci a trovare le partite perfette per te
            </Text>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informazioni Base</Text>
            <Input
              label={t('city')}
              placeholder="Es. Milano"
              value={city}
              onChangeText={setCity}
              leftIcon="location-outline"
              autoComplete="off"
              textContentType="none"
            />
            <Input
              label={`${t('nickname')} (opzionale)`}
              placeholder="Il tuo soprannome in campo"
              value={nickname}
              onChangeText={setNickname}
              leftIcon="at-outline"
              autoComplete="off"
              textContentType="none"
            />
          </View>

          {/* Sports Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('preferred_sports')}</Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportCard,
                    selectedSports.includes(sport.id) && {
                      borderColor: sport.color,
                      backgroundColor: sport.color + '20',
                    },
                  ]}
                  onPress={() => toggleSport(sport.id)}
                >
                  <Ionicons
                    name={sport.id === 'calcetto' ? 'football-outline' : 'tennisball-outline'}
                    size={32}
                    color={selectedSports.includes(sport.id) ? sport.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.sportCardText,
                      selectedSports.includes(sport.id) && { color: sport.color },
                    ]}
                  >
                    {sport.name}
                  </Text>
                  {selectedSports.includes(sport.id) && (
                    <View style={[styles.checkMark, { backgroundColor: sport.color }]}>
                      <Ionicons name="checkmark" size={14} color={COLORS.background} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Skill Levels */}
          {selectedSports.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('level')}</Text>
              {selectedSports.map((sportId) => {
                const sport = SPORTS.find((s) => s.id === sportId)!;
                return (
                  <Card key={sportId} style={styles.levelCard}>
                    <Text style={styles.levelCardTitle}>{sport.name}</Text>
                    <View style={styles.levelOptions}>
                      {SKILL_LEVELS.filter((l) => l.id !== 'all').map((level) => (
                        <TouchableOpacity
                          key={level.id}
                          style={[
                            styles.levelOption,
                            skillLevels[sportId] === level.id && {
                              backgroundColor: sport.color,
                            },
                          ]}
                          onPress={() => setSkillLevel(sportId, level.id)}
                        >
                          <Text
                            style={[
                              styles.levelOptionText,
                              skillLevels[sportId] === level.id && { color: COLORS.background },
                            ]}
                          >
                            {level.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          <Button
            title="Completa"
            onPress={handleComplete}
            loading={isLoading}
            disabled={!city}
            fullWidth
            size="large"
            style={styles.submitButton}
          />

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/player/home')}
          >
            <Text style={styles.skipText}>Salta per ora</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportCard: {
    flex: 1,
    minWidth: '30%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  sportCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCard: {
    marginBottom: 12,
  },
  levelCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  levelOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  levelOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    marginTop: 8,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
});
