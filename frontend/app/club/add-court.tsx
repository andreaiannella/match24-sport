// Add Court Screen
import React, { useState } from 'react';
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
import { Button, Input, Card } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { GradientBackground } from '../../src/components';

export default function AddCourtScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('padel');
  const [isIndoor, setIsIndoor] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hours = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
    '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
    '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00',
    '20:00-21:00', '21:00-22:00', '22:00-23:00',
  ];

  const toggleHour = (hour: string) => {
    setSelectedHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour]
    );
  };

  const selectAllHours = () => {
    if (selectedHours.length === hours.length) {
      setSelectedHours([]);
    } else {
      setSelectedHours([...hours]);
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Errore', 'Inserisci il nome del campo');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.createCourt({
        name,
        sport: selectedSport,
        is_indoor: isIndoor,
        available_hours: selectedHours,
        notes: notes || undefined,
      });
      Alert.alert(t('success'), 'Campo aggiunto con successo', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiungere il campo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('add_court')}</Text>
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
          <Input
            label="Nome Campo *"
            placeholder="Es. Campo 1, Campo Centrale..."
            value={name}
            onChangeText={setName}
            leftIcon="tennisball-outline"
          />

          {/* Sport Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sport')} *</Text>
            <View style={styles.sportsRow}>
              {SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportOption,
                    selectedSport === sport.id && {
                      borderColor: sport.color,
                      backgroundColor: sport.color + '20',
                    },
                  ]}
                  onPress={() => setSelectedSport(sport.id)}
                >
                  <Ionicons
                    name={sport.id === 'calcetto' ? 'football-outline' : 'tennisball-outline'}
                    size={28}
                    color={selectedSport === sport.id ? sport.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.sportText,
                      selectedSport === sport.id && { color: sport.color },
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Indoor/Outdoor Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo Campo *</Text>
            <View style={styles.indoorRow}>
              <TouchableOpacity
                style={[
                  styles.indoorOption,
                  !isIndoor && styles.indoorOptionSelected,
                ]}
                onPress={() => setIsIndoor(false)}
              >
                <Ionicons
                  name="sunny-outline"
                  size={24}
                  color={!isIndoor ? COLORS.accent : COLORS.textMuted}
                />
                <Text style={[styles.indoorText, !isIndoor && styles.indoorTextSelected]}>
                  Outdoor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.indoorOption,
                  isIndoor && styles.indoorOptionSelected,
                ]}
                onPress={() => setIsIndoor(true)}
              >
                <Ionicons
                  name="home-outline"
                  size={24}
                  color={isIndoor ? COLORS.secondary : COLORS.textMuted}
                />
                <Text style={[styles.indoorText, isIndoor && styles.indoorTextSelected]}>
                  Indoor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Available Hours */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Orari Disponibili</Text>
              <TouchableOpacity onPress={selectAllHours}>
                <Text style={styles.selectAllText}>
                  {selectedHours.length === hours.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hoursGrid}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.hourOption,
                    selectedHours.includes(hour) && styles.hourOptionSelected,
                  ]}
                  onPress={() => toggleHour(hour)}
                >
                  <Text
                    style={[
                      styles.hourText,
                      selectedHours.includes(hour) && styles.hourTextSelected,
                    ]}
                  >
                    {hour}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Note (opzionale)"
            placeholder="Es. Indoor, superficie sintetica..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <Button
            title={t('add_court')}
            onPress={handleSubmit}
            loading={isLoading}
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportOption: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sportText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  indoorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  indoorOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  indoorOptionSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary + '20',
  },
  indoorText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  indoorTextSelected: {
    color: COLORS.text,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  hourOptionSelected: {
    backgroundColor: COLORS.secondary,
  },
  hourText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hourTextSelected: {
    color: COLORS.background,
  },
  submitButton: {
    marginTop: 16,
  },
});
