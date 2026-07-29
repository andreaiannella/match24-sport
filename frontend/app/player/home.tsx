// Player Home Screen - con gamification (streak, rango di circolo, torneo in evidenza)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
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
import { COLORS, FONTS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match, PlayerRating, Club, PlayerStreak, Tournament } from '../../src/types';
import { lightHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

const iconFlame = require('../../assets/images/gamification/icon-flame.png');
const iconCrown = require('../../assets/images/gamification/icon-crown.png');

export default function PlayerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [matches, setMatches] = useState<Match[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Gamification - tutto opzionale: un giocatore senza circolo preferito vede solo
  // la parte "storica" della home, niente sezioni vuote o rotte.
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [streak, setStreak] = useState<PlayerStreak | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [featuredTournament, setFeaturedTournament] = useState<Tournament | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [matchesData, ratingsData, favoriteClubs] = await Promise.all([
        apiClient.listMatches({ status: 'open', limit: 5 }),
        apiClient.getPlayerRatings(),
        apiClient.getFavoriteClubs(),
      ]);
      setMatches(matchesData);
      setRatings(ratingsData);

      if (favoriteClubs && favoriteClubs.length > 0) {
        const club = favoriteClubs[0];
        setMyClub(club);

        const [streakData, leaderboardData, tournamentsData] = await Promise.all([
          apiClient.getMyStreak(),
          apiClient.getClubLeaderboard(club.club_id, 'all_time', 100),
          apiClient.listTournaments({ club_id: club.club_id, status: 'open', limit: 1 }),
        ]);
        setStreak(streakData);

        const myIndex = leaderboardData.findIndex((e: any) => e.user_id === user?.user_id);
        setMyRank(myIndex >= 0 ? myIndex + 1 : null);
        setMyPoints(myIndex >= 0 ? leaderboardData[myIndex].points : 0);
        setFeaturedTournament(tournamentsData[0] || null);
      } else {
        setMyClub(null);
        setFeaturedTournament(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
            {streak && streak.current_streak > 0 && (
              <View style={styles.streakPill}>
                <Image source={iconFlame} style={styles.streakIcon} />
                <Text style={styles.streakNum}>{streak.current_streak}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/player/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rango nel circolo preferito - solo se il giocatore ne ha uno */}
        {myClub && (
          <TouchableOpacity
            style={styles.rankHero}
            activeOpacity={0.85}
            onPress={() => router.push(`/player/leaderboard?clubId=${myClub.club_id}` as any)}
          >
            <Image source={iconCrown} style={styles.crownFloat} />
            <Text style={styles.rankLabel}>NEL TUO CIRCOLO · {myClub.name.toUpperCase()}</Text>
            {myRank ? (
              <>
                <Text style={styles.rankNum}>#{myRank}</Text>
                <Text style={styles.rankSub}>{myPoints} punti classifica</Text>
              </>
            ) : (
              <Text style={styles.rankSub}>Gioca la tua prima partita qui per entrare in classifica</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Torneo in evidenza - solo se il circolo ne ha uno aperto */}
        {featuredTournament && (
          <TouchableOpacity
            style={styles.tournamentCard}
            activeOpacity={0.9}
            onPress={() => router.push(`/player/tournament/${featuredTournament.tournament_id}` as any)}
          >
            <View style={styles.tournamentBadge}>
              <SportImage sport={featuredTournament.sport} size={22} />
            </View>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>SLOT APERTO</Text>
            </View>
            <Text style={styles.tournamentTitle}>
              {SPORTS.find(s => s.id === featuredTournament.sport)?.name || featuredTournament.sport} · {myClub?.name}
            </Text>
            <Text style={styles.tournamentSub}>
              {featuredTournament.date} {featuredTournament.start_time} · {featuredTournament.current_players}/{featuredTournament.max_players} iscritti
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (featuredTournament.current_players / featuredTournament.max_players) * 100)}%` }]} />
            </View>
            <Text style={styles.tournamentCta}>Unisciti alla battaglia</Text>
          </TouchableOpacity>
        )}

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
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  streakIcon: {
    width: 16,
    height: 16,
  },
  streakNum: {
    fontSize: 15,
    fontFamily: FONTS.title,
    color: COLORS.accent,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankHero: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  crownFloat: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 56,
    height: 56,
    transform: [{ rotate: '12deg' }],
  },
  rankLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.label,
    letterSpacing: 0.6,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  rankNum: {
    fontSize: 38,
    fontFamily: FONTS.title,
    color: COLORS.primary,
    lineHeight: 42,
  },
  rankSub: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tournamentCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    position: 'relative',
  },
  tournamentBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.calcetto + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  liveTag: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent + '25',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  liveTagText: {
    fontSize: 9.5,
    fontFamily: FONTS.button,
    color: COLORS.accent,
    letterSpacing: 0.4,
  },
  tournamentTitle: {
    fontSize: 17,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginTop: 22,
  },
  tournamentSub: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.calcetto,
  },
  tournamentCta: {
    fontSize: 14,
    fontFamily: FONTS.button,
    color: COLORS.primary,
    textAlign: 'center',
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
    fontFamily: FONTS.label,
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
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.label,
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
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 28,
    fontFamily: FONTS.title,
  },
  ratingStats: {
    marginTop: 4,
  },
  ratingStat: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
});
