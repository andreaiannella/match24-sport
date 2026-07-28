// Edit Court Screen - Hidden from tabs
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card } from '../../../src/components';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { COLORS, SPORTS } from '../../../src/utils/constants';
import { apiClient } from '../../../src/api/client';
import { LoadingSpinner } from '../../../src/components/LoadingSpinner';
import { successHaptic } from '../../../src/utils/haptics';
import { GradientBackground } from '../../../src/components';

export default function EditCourtScreen() {
  const router = useRouter();
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const { t } = useLanguage();

  const [court, setCourt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [surfaceType, setSurfaceType] = useState('');
  const [isIndoor, setIsIndoor] = useState(false);
  const [pricePerHour, setPricePerHour] = useState('');
  
  // Schedule/Hours
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [availableHours, setAvailableHours] = useState<string[]>([]);

  useEffect(() => {
    fetchCourt();
  }, [courtId]);

  const fetchCourt = async () => {
    try {
      const courts = await apiClient.getClubCourts();
      const foundCourt = courts.find((c: any) => c.court_id === courtId);
      if (foundCourt) {
        setCourt(foundCourt);
        setName(foundCourt.name || '');
        setSport(foundCourt.sport || '');
        setSurfaceType(foundCourt.surface_type || '');
        setIsIndoor(foundCourt.is_indoor || false);
        setPricePerHour(foundCourt.price_per_hour?.toString() || '');
        setAvailableHours(foundCourt.available_hours || []);
        
        // Parse opening/closing from available_hours
        if (foundCourt.available_hours && foundCourt.available_hours.length > 0) {
          const firstSlot = foundCourt.available_hours[0];
          const lastSlot = foundCourt.available_hours[foundCourt.available_hours.length - 1];
          setOpeningTime(firstSlot.split('-')[0]);
          setClosingTime(lastSlot.split('-')[1]);
        }
      } else {
        Alert.alert('Errore', 'Campo non trovato');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching court:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del campo');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate available hours slots based on opening/closing time
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const [openHour] = openingTime.split(':').map(Number);
    const [closeHour] = closingTime.split(':').map(Number);
    
    for (let h = openHour; h < closeHour; h++) {
      const startTime = `${h.toString().padStart(2, '0')}:00`;
      const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;
      slots.push(`${startTime}-${endTime}`);
    }
    
    setAvailableHours(slots);
    return slots;
  };

  const handleSave = async () => {
    if (!name || !sport) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    setIsSaving(true);
    try {
      // Generate time slots if not set
      const slots = availableHours.length > 0 ? availableHours : generateTimeSlots();
      
      await apiClient.updateCourt(courtId!, {
        name,
        sport,
        surface_type: surfaceType,
        is_indoor: isIndoor,
        price_per_hour: parseFloat(pricePerHour) || 0,
        available_hours: slots,
      });
      successHaptic();
      Alert.alert('Successo', 'Campo aggiornato');
      router.back();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le modifiche');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifica Campo</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Input
            label="Nome Campo *"
            placeholder="Es. Campo 1"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Sport *</Text>
          <View style={styles.sportsRow}>
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sportOption,
                  sport === s.id && { borderColor: s.color, backgroundColor: s.color + '20' },
                ]}
                onPress={() => setSport(s.id)}
              >
                <Ionicons
                  name={s.id === 'calcetto' || s.id === 'calcio8' ? 'football-outline' : 'tennisball-outline'}
                  size={24}
                  color={sport === s.id ? s.color : COLORS.textMuted}
                />
                <Text style={[styles.sportText, sport === s.id && { color: s.color }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Tipo Superficie"
            placeholder="Es. Erba sintetica"
            value={surfaceType}
            onChangeText={setSurfaceType}
          />

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeOption, !isIndoor && styles.typeOptionSelected]}
              onPress={() => setIsIndoor(false)}
            >
              <Ionicons name="sunny-outline" size={24} color={!isIndoor ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.typeText, !isIndoor && { color: COLORS.primary }]}>Outdoor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, isIndoor && styles.typeOptionSelected]}
              onPress={() => setIsIndoor(true)}
            >
              <Ionicons name="home-outline" size={24} color={isIndoor ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.typeText, isIndoor && { color: COLORS.primary }]}>Indoor</Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Prezzo orario (€)"
            placeholder="0"
            value={pricePerHour}
            onChangeText={setPricePerHour}
            keyboardType="numeric"
          />

          <Text style={styles.sectionTitle}>Orari di Apertura</Text>
          <View style={styles.hoursRow}>
            <View style={styles.hourInput}>
              <Text style={styles.hourLabel}>Apertura</Text>
              <TouchableOpacity 
                style={styles.timeSelector}
                onPress={() => {
                  // Simple time selector - increment hours
                  const [h] = openingTime.split(':').map(Number);
                  const newH = h >= 23 ? 0 : h + 1;
                  setOpeningTime(`${newH.toString().padStart(2, '0')}:00`);
                }}
              >
                <Text style={styles.timeText}>{openingTime}</Text>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.hourInput}>
              <Text style={styles.hourLabel}>Chiusura</Text>
              <TouchableOpacity 
                style={styles.timeSelector}
                onPress={() => {
                  const [h] = closingTime.split(':').map(Number);
                  const newH = h >= 23 ? 0 : h + 1;
                  setClosingTime(`${newH.toString().padStart(2, '0')}:00`);
                }}
              >
                <Text style={styles.timeText}>{closingTime}</Text>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hoursHint}>
            Gli slot disponibili verranno generati automaticamente in base agli orari
          </Text>

          <Button
            title="Salva Modifiche"
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            size="large"
            style={{ marginTop: 24 }}
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
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
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
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 16,
  },
  hourInput: {
    flex: 1,
  },
  hourLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  hoursHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
