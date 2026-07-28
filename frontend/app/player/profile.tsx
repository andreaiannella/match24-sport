// Player Profile Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner, Button, SportImage } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, FONTS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { PlayerProfile, PlayerRating, PlayerStreak, PlayerBadge } from '../../src/types';
import { GradientBackground } from '../../src/components';

const iconFlame = require('../../assets/images/gamification/icon-flame.png');
const iconPodium = require('../../assets/images/gamification/icon-podium.png');

const BADGE_LABELS: Record<string, string> = {
  torneo_vinto: 'Torneo Vinto',
};

export default function PlayerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useLanguage();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<PlayerStreak | null>(null);
  const [badges, setBadges] = useState<PlayerBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [profileData, ratingsData, statsData, streakData, badgesData] = await Promise.all([
        apiClient.getPlayerProfile(),
        apiClient.getPlayerRatings(),
        apiClient.getPlayerStats(),
        apiClient.getMyStreak(),
        apiClient.getMyBadges(),
      ]);
      setProfile(profileData);
      setRatings(ratingsData);
      setStats(statsData);
      setStreak(streakData);
      setBadges(badgesData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const getRatingLevel = (rating: number): string => {
    if (rating < 1000) return t('beginner');
    if (rating < 1400) return t('intermediate');
    return t('advanced');
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.picture || profile?.profile_picture ? (
              <Image
                source={{ uri: user?.picture || profile?.profile_picture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={COLORS.textMuted} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => router.push('/player/edit-profile')}
            >
              <Ionicons name="camera" size={16} color={COLORS.background} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {profile?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{profile.city}</Text>
            </View>
          )}
          {streak && streak.current_streak > 0 && (
            <View style={styles.streakPill}>
              <Image source={iconFlame} style={styles.streakIcon} />
              <Text style={styles.streakText}>{streak.current_streak} di fila</Text>
              {streak.best_streak > streak.current_streak && (
                <Text style={styles.streakBest}>· record {streak.best_streak}</Text>
              )}
            </View>
          )}
        </View>

        {/* Stats Summary */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.total_matches || 0}</Text>
              <Text style={styles.statLabel}>{t('matches_played')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats?.total_wins || 0}
              </Text>
              <Text style={styles.statLabel}>{t('wins')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>
                {stats?.total_losses || 0}
              </Text>
              <Text style={styles.statLabel}>{t('losses')}</Text>
            </View>
          </View>
        </Card>

        {/* Badge vinti - solo se ce n'e' almeno uno, niente sezione vuota */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Image source={iconPodium} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>I tuoi trofei</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.badgesRow}>
                {badges.map((badge) => (
                  <View key={badge.badge_id} style={styles.badgeChip}>
                    <Ionicons name="trophy" size={22} color={COLORS.primary} />
                    <Text style={styles.badgeLabel}>
                      {BADGE_LABELS[badge.badge_type] || badge.badge_type}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Ratings by Sport */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('rating')}</Text>
          {SPORTS.map((sport) => {
            const rating = ratings.find((r) => r.sport === sport.id);
            return (
              <Card key={sport.id} style={styles.ratingCard}>
                <View style={styles.ratingHeader}>
                  <View style={[styles.sportIcon, { backgroundColor: sport.color + '20' }]}>
                    <SportImage sport={sport.id} size={28} />
                  </View>
                  <View style={styles.ratingInfo}>
                    <Text style={styles.sportName}>{sport.name}</Text>
                    <Text style={[styles.levelBadge, { color: sport.color }]}>
                      {getRatingLevel(rating?.rating || 1200)}
                    </Text>
                  </View>
                  <View style={styles.ratingValueContainer}>
                    <Text style={[styles.ratingValue, { color: sport.color }]}>
                      {rating?.rating || 1200}
                    </Text>
                  </View>
                </View>
                <View style={styles.ratingStats}>
                  <View style={styles.ratingStatItem}>
                    <Text style={styles.ratingStatValue}>{rating?.matches_played || 0}</Text>
                    <Text style={styles.ratingStatLabel}>Partite</Text>
                  </View>
                  <View style={styles.ratingStatItem}>
                    <Text style={[styles.ratingStatValue, { color: COLORS.success }]}>
                      {rating?.wins || 0}
                    </Text>
                    <Text style={styles.ratingStatLabel}>{t('wins')}</Text>
                  </View>
                  <View style={styles.ratingStatItem}>
                    <Text style={[styles.ratingStatValue, { color: COLORS.error }]}>
                      {rating?.losses || 0}
                    </Text>
                    <Text style={styles.ratingStatLabel}>{t('losses')}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lingua / Language</Text>
          <View style={styles.languageGrid}>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.languageText,
                    language === lang.code && styles.languageTextActive,
                  ]}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/player/edit-profile')}
          >
            <Ionicons name="create-outline" size={24} color={COLORS.text} />
            <Text style={styles.menuItemText}>{t('edit')} {t('profile')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/player/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            <Text style={styles.menuItemText}>{t('notifications')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            <Text style={[styles.menuItemText, { color: COLORS.error }]}>{t('logout')}</Text>
          </TouchableOpacity>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent + '18',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
  },
  streakIcon: {
    width: 16,
    height: 16,
  },
  streakText: {
    fontSize: 13.5,
    fontFamily: FONTS.button,
    color: COLORS.accent,
  },
  streakBest: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  statsCard: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 20,
    height: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  badgeChip: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    minWidth: 100,
  },
  badgeLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.label,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ratingCard: {
    marginBottom: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sportName: {
    fontSize: 16,
    fontFamily: FONTS.subtitle,
    color: COLORS.text,
  },
  levelBadge: {
    fontSize: 12,
    fontFamily: FONTS.label,
    marginTop: 2,
  },
  ratingValueContainer: {
    alignItems: 'flex-end',
  },
  ratingValue: {
    fontSize: 32,
    fontFamily: FONTS.title,
  },
  ratingStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ratingStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  ratingStatValue: {
    fontSize: 18,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  ratingStatLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  languageOptionActive: {
    backgroundColor: COLORS.primary,
  },
  languageText: {
    fontSize: 14,
    fontFamily: FONTS.label,
    color: COLORS.textSecondary,
  },
  languageTextActive: {
    color: COLORS.background,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
    marginLeft: 12,
  },
  logoutItem: {
    marginTop: 8,
  },
});
