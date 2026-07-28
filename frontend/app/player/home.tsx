// Player Home Screen - Stable Version
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, EmptyState, Card, MatchCardSkeleton, RatingCardSkeleton, SportImage } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match, PlayerRating } from '../../src/types';
import { lightHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

export default function PlayerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [matches, setMatches] = useState<Match[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [matchesData, ratingsData] = await Promise.all([
        apiClient.listMatches({ status: 'open', limit: 5 }),
        apiClient.getPlayerRatings(),
      ]);
      setMatches(matchesData);
      setRatings(ratingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh data when screen comes into focus (e.g., after joining a match)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getRatingForSport = (sport: string) => {
    return ratings.find((r) => r.sport === sport);
  };

  if (isLoading) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{t('welcome')},</Text>
              <Text style={styles.userName}>{user?.name || 'Giocatore'}</Text>
            </View>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="search" size={28} color={COLORS.primary} />
              <Text style={[styles.quickActionText, { color: COLORS.primary }]}>
                {t('find_match')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="calendar" size={28} color={COLORS.secondary} />
              <Text style={[styles.quickActionText, { color: COLORS.secondary }]}>
                {t('my_matches')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('rating')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.ratingsRow}>
                {[1, 2, 3, 4].map((i) => (
                  <RatingCardSkeleton key={i} />
                ))}
              </View>
            </ScrollView>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Partite Disponibili</Text>
            </View>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('welcome')},</Text>
            <Text style={styles.userName}>{user?.name || 'Giocatore'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/player/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: COLORS.primary + '20' }]}
            onPress={() => router.push('/player/search')}
          >
            <Ionicons name="search" size={28} color={COLORS.primary} />
            <Text style={[styles.quickActionText, { color: COLORS.primary }]}>
              {t('find_match')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: COLORS.secondary + '20' }]}
            onPress={() => router.push('/player/my-matches')}
          >
            <Ionicons name="calendar" size={28} color={COLORS.secondary} />
            <Text style={[styles.quickActionText, { color: COLORS.secondary }]}>
              {t('my_matches')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: COLORS.error + '20' }]}
            onPress={() => router.push('/player/favorites')}
          >
            <Ionicons name="heart" size={28} color={COLORS.error} />
            <Text style={[styles.quickActionText, { color: COLORS.error }]}>
              Preferiti
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('rating')}</Text>
            <TouchableOpacity onPress={() => router.push('/player/profile')}>
              <Text style={styles.seeAll}>{t('statistics')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.ratingsRow}>
              {SPORTS.map((sport) => {
                const rating = getRatingForSport(sport.id);
                return (
                  <Card key={sport.id} style={[styles.ratingCard, { borderColor: sport.color }]}>
                    <View style={[styles.sportIconContainer, { backgroundColor: sport.color + '20' }]}>
                      <SportImage sport={sport.id} size={28} />
                    </View>
                    <Text style={styles.sportName}>{sport.name}</Text>
                    <Text style={[styles.ratingValue, { color: sport.color }]}>
                      {rating?.rating || 1200}
                    </Text>
                    <View style={styles.ratingStats}>
                      <Text style={styles.ratingStat}>
                        {rating?.wins || 0}W / {rating?.losses || 0}L
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partite Disponibili</Text>
            <TouchableOpacity onPress={() => router.push('/player/search')}>
              <Text style={styles.seeAll}>{t('all')}</Text>
            </TouchableOpacity>
          </View>
          {matches.length > 0 ? (
            matches.map((match) => (
              <MatchCard
                key={match.match_id}
                match={match}
                onPress={() => router.push(`/match/${match.match_id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="tennisball-outline"
              title={t('no_matches_found')}
              message="Non ci sono partite disponibili al momento"
              actionLabel={t('search')}
              onAction={() => router.push('/player/search')}
            />
          )}
        </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCard: {
    width: 140,
    alignItems: 'center',
    borderWidth: 1,
  },
  sportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sportName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  ratingStats: {
    marginTop: 4,
  },
  ratingStat: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
