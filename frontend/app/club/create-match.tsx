// Create Match Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input, LoadingSpinner } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS, SKILL_LEVELS, MATCH_FORMATS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Court } from '../../src/types';
import { format, addDays } from 'date-fns';
import { GradientBackground } from '../../src/components';

// Default match durations per sport (in minutes)
const SPORT_DURATIONS: Record<string, number> = {
  padel: 90,
  tennis: 60,
  tennis_singles: 60,
  tennis_doubles: 90,
  calcetto: 60,
  calcio8: 90,
};

// Available duration options (in minutes)
const DURATION_OPTIONS = [
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 ore' },
];

export default function CreateMatchScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60); // Duration in minutes
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [skillLevel, setSkillLevel] = useState('all');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [pricePerPlayer, setPricePerPlayer] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const data = await apiClient.getClubCourts();
        setCourts(data.filter((c: Court) => c.is_active));
        if (data.length > 0) {
          setSelectedCourt(data[0]);
          // Set default max players based on sport
          const sportFormat = MATCH_FORMATS[data[0].sport as keyof typeof MATCH_FORMATS];
          if (sportFormat) {
            setMaxPlayers(sportFormat.maxPlayers.toString());
          }
          // Set default duration based on sport
          const sportDuration = SPORT_DURATIONS[data[0].sport] || 60;
          setDuration(sportDuration);
        }
      } catch (error) {
        console.error('Error fetching courts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourts();
  }, []);

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    const sportFormat = MATCH_FORMATS[court.sport as keyof typeof MATCH_FORMATS];
    if (sportFormat) {
      setMaxPlayers(sportFormat.maxPlayers.toString());
    }
    // Auto-update duration based on sport
    const sportDuration = SPORT_DURATIONS[court.sport] || 60;
    setDuration(sportDuration);
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const endTime = calculateEndTime(startTime, duration);

  const handleSubmit = async () => {
    if (!selectedCourt) {
      Alert.alert('Errore', 'Seleziona un campo');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createMatch({
        sport: selectedCourt.sport,
        format: selectedCourt.sport,
        court_id: selectedCourt.court_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        max_players: parseInt(maxPlayers),
        skill_level: skillLevel,
        price_per_player: parseFloat(pricePerPlayer) || 0,
        notes: notes || undefined,
      });
      Alert.alert(t('success'), t('match_created'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile creare la partita');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate next 14 days for date selection
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Time slots
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
  ];

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  if (courts.length === 0) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('create_match')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="tennisball-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nessun campo disponibile</Text>
          <Text style={styles.emptySubtitle}>Aggiungi prima un campo per poter creare partite</Text>
          <Button
            title={t('add_court')}
            onPress={() => router.push('/club/add-court')}
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('create_match')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Court Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.courtsRow}>
                {courts.map((court) => {
                  const sport = SPORTS.find((s) => s.id === court.sport);
                  return (
                    <TouchableOpacity
                      key={court.court_id}
                      style={[
                        styles.courtOption,
                        selectedCourt?.court_id === court.court_id && {
                          borderColor: sport?.color || COLORS.primary,
                          backgroundColor: (sport?.color || COLORS.primary) + '20',
                        },
                      ]}
                      onPress={() => handleCourtSelect(court)}
                    >
                      <Ionicons
                        name={court.sport === 'calcetto' ? 'football-outline' : 'tennisball-outline'}
                        size={24}
                        color={sport?.color || COLORS.primary}
                      />
                      <Text style={styles.courtName}>{court.name}</Text>
                      <Text style={[styles.courtSport, { color: sport?.color }]}>
                        {sport?.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('date')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.datesRow}>
                {dateOptions.map((date, index) => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[
                        styles.dateDay,
                        isSelected && styles.dateDaySelected,
                      ]}>
                        {format(date, 'EEE').slice(0, 3)}
                      </Text>
                      <Text style={[
                        styles.dateNum,
                        isSelected && styles.dateNumSelected,
                      ]}>
                        {format(date, 'd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('time')}</Text>
            
            {/* Start Time */}
            <View style={styles.timeSelect}>
              <Text style={styles.timeLabel}>Orario di inizio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeSlotsRow}>
                  {timeSlots.map((time) => (
                    <TouchableOpacity
                      key={`start-${time}`}
                      style={[
                        styles.timeSlot,
                        startTime === time && styles.timeSlotSelected,
                      ]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        startTime === time && styles.timeSlotTextSelected,
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Duration Selection */}
            <View style={styles.durationSection}>
              <View style={styles.durationHeader}>
                <Text style={styles.timeLabel}>Durata partita</Text>
                <TouchableOpacity 
                  style={styles.customizeButton}
                  onPress={() => setShowCustomDuration(!showCustomDuration)}
                >
                  <Ionicons 
                    name={showCustomDuration ? "chevron-up" : "settings-outline"} 
                    size={18} 
                    color={COLORS.primary} 
                  />
                  <Text style={styles.customizeText}>
                    {showCustomDuration ? 'Chiudi' : 'Personalizza'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Duration Options */}
              <View style={styles.durationOptionsRow}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.durationOption,
                      duration === option.value && styles.durationOptionSelected,
                    ]}
                    onPress={() => setDuration(option.value)}
                  >
                    <Text style={[
                      styles.durationText,
                      duration === option.value && styles.durationTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sport default hint */}
              {selectedCourt && (
                <Text style={styles.durationHint}>
                  Durata standard per {selectedCourt.sport}: {SPORT_DURATIONS[selectedCourt.sport] || 60} min
                </Text>
              )}
            </View>

            {/* Calculated End Time Display */}
            <View style={styles.endTimeDisplay}>
              <View style={styles.endTimeBox}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.endTimeLabel}>Orario di fine calcolato:</Text>
                <Text style={styles.endTimeValue}>{endTime}</Text>
              </View>
            </View>
          </View>

          {/* Skill Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('level')}</Text>
            <View style={styles.levelGrid}>
              {SKILL_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.levelOption,
                    skillLevel === level.id && styles.levelOptionSelected,
                  ]}
                  onPress={() => setSkillLevel(level.id)}
                >
                  <Text style={[
                    styles.levelText,
                    skillLevel === level.id && styles.levelTextSelected,
                  ]}>
                    {level.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Players & Price */}
          <View style={styles.rowInputs}>
            <Input
              label="Max Giocatori"
              placeholder="4"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="number-pad"
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <Input
              label={`${t('price')} (\u20AC)`}
              placeholder="0"
              value={pricePerPlayer}
              onChangeText={setPricePerPlayer}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          {/* Notes */}
          <Input
            label="Note (opzionale)"
            placeholder="Es. Palle fornite, porta scarpe pulite..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            title={t('create_match')}
            onPress={handleSubmit}
            loading={isSubmitting}
            fullWidth
            size="large"
            style={styles.submitButton}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  courtsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  courtOption: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courtName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  courtSport: {
    fontSize: 12,
    marginTop: 4,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateOption: {
    width: 56,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  dateOptionSelected: {
    backgroundColor: COLORS.secondary,
  },
  dateDay: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  dateDaySelected: {
    color: COLORS.background,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  dateNumSelected: {
    color: COLORS.background,
  },
  timeRow: {
    gap: 16,
  },
  timeSelect: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  timeSlotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.secondary,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeSlotTextSelected: {
    color: COLORS.background,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  levelOptionSelected: {
    backgroundColor: COLORS.secondary,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  levelTextSelected: {
    color: COLORS.background,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  submitButton: {
    marginTop: 16,
  },
  durationSection: {
    marginTop: 16,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  customizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  durationOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  durationTextSelected: {
    color: COLORS.primary,
  },
  durationHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  endTimeDisplay: {
    marginTop: 16,
  },
  endTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  endTimeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  endTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
