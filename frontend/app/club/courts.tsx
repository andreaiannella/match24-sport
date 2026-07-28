// Club Courts Management Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner, EmptyState, Button, SportBadge } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Court } from '../../src/types';
import { GradientBackground } from '../../src/components';

export default function ClubCourtsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourts = async () => {
    try {
      const data = await apiClient.getClubCourts();
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourts();
  };

  const handleDeleteCourt = async (court: Court) => {
    Alert.alert(
      'Elimina Campo',
      `Sei sicuro di voler eliminare "${court.name}"? Questa azione non può essere annullata.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteCourt(court.court_id, true); // true = permanent delete
              await fetchCourts();
              Alert.alert('Successo', 'Campo eliminato con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare il campo');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('courts')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/club/add-court')}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {courts.length > 0 ? (
          courts.map((court) => (
            <Card key={court.court_id} style={styles.courtCard}>
              <View style={styles.courtHeader}>
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <View style={styles.courtBadges}>
                    <SportBadge sport={court.sport} size="small" />
                    <View style={[
                      styles.indoorBadge,
                      { backgroundColor: court.is_indoor ? COLORS.secondary + '20' : COLORS.accent + '20' }
                    ]}>
                      <Ionicons 
                        name={court.is_indoor ? 'home' : 'sunny'} 
                        size={12} 
                        color={court.is_indoor ? COLORS.secondary : COLORS.accent} 
                      />
                      <Text style={[
                        styles.indoorBadgeText,
                        { color: court.is_indoor ? COLORS.secondary : COLORS.accent }
                      ]}>
                        {court.is_indoor ? 'Indoor' : 'Outdoor'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[
                  styles.activeBadge,
                  { backgroundColor: court.is_active ? COLORS.success + '20' : COLORS.error + '20' }
                ]}>
                  <Text style={[
                    styles.activeText,
                    { color: court.is_active ? COLORS.success : COLORS.error }
                  ]}>
                    {court.is_active ? 'Attivo' : 'Inattivo'}
                  </Text>
                </View>
              </View>

              {court.notes && (
                <Text style={styles.courtNotes}>{court.notes}</Text>
              )}

              {court.available_hours && court.available_hours.length > 0 && (
                <View style={styles.hoursContainer}>
                  <Text style={styles.hoursLabel}>Orari disponibili:</Text>
                  <View style={styles.hoursRow}>
                    {court.available_hours.slice(0, 4).map((hour, index) => (
                      <View key={index} style={styles.hourBadge}>
                        <Text style={styles.hourText}>{hour}</Text>
                      </View>
                    ))}
                    {court.available_hours.length > 4 && (
                      <Text style={styles.moreHours}>+{court.available_hours.length - 4}</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.courtActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/club/edit-court/${court.court_id}`)}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.secondary} />
                  <Text style={styles.editButtonText}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCourt(court)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="tennisball-outline"
            title="Nessun campo"
            message="Aggiungi il primo campo del tuo circolo"
            actionLabel={t('add_court')}
            onAction={() => router.push('/club/add-court')}
          />
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  courtCard: {
    marginBottom: 12,
  },
  courtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  courtBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  indoorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  indoorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courtNotes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  hoursContainer: {
    marginBottom: 12,
  },
  hoursLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hourBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hourText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moreHours: {
    fontSize: 12,
    color: COLORS.textMuted,
    alignSelf: 'center',
  },
  courtActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
});
