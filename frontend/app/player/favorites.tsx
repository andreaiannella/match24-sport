// Player Favorite Clubs Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ListSkeleton } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Club } from '../../src/types';
import { lightHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

export default function FavoriteClubsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const data = await apiClient.getFavoriteClubs();
      setClubs(data);
    } catch (error) {
      console.error('Error fetching favorite clubs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (clubId: string) => {
    lightHaptic();
    try {
      await apiClient.removeFavoriteClub(clubId);
      setClubs(clubs.filter(c => c.club_id !== clubId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Circoli Preferiti</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.scrollContent}>
          <ListSkeleton count={3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
          }
        >
          {clubs.length > 0 ? (
            clubs.map((club) => (
              <Card 
                key={club.club_id} 
                style={styles.clubCard}
                onPress={() => router.push(`/player/club/${club.club_id}`)}
              >
                <View style={styles.clubHeader}>
                  <View style={styles.clubIcon}>
                    <Ionicons name="business" size={24} color={COLORS.secondary} />
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color={COLORS.textMuted} />
                      <Text style={styles.clubLocation}>{club.city}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => handleRemoveFavorite(club.club_id)}
                  >
                    <Ionicons name="heart" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                {club.description && (
                  <Text style={styles.clubDescription} numberOfLines={2}>
                    {club.description}
                  </Text>
                )}
              </Card>
            ))
          ) : (
            <EmptyState
              icon="heart-outline"
              title="Nessun circolo preferito"
              message="Aggiungi i tuoi circoli preferiti per trovarli più velocemente"
              actionLabel="Cerca partite"
              onAction={() => router.push('/player/search')}
            />
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  clubCard: {
    marginBottom: 12,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clubLocation: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  favoriteButton: {
    padding: 8,
  },
  clubDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
});
