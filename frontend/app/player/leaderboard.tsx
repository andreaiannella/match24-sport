// Club Leaderboard Screen - classifica reale, con periodi che si azzerano davvero
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner, EmptyState, GradientBackground } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { COLORS, FONTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { ClubLeaderboardEntry, Club } from '../../src/types';

type Period = 'week' | 'month' | 'all_time';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Settimana',
  month: 'Mese',
  all_time: 'Sempre',
};

const AVATAR_COLORS = ['#FF3D8F', '#00E5C7', '#A374FF', '#FFB020', '#34D399', '#4F8CFF'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [entries, setEntries] = useState<ClubLeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>('all_time');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clubId) return;
    try {
      const [clubData, leaderboardData] = await Promise.all([
        apiClient.getClub(clubId),
        apiClient.getClubLeaderboard(clubId, period, 50),
      ]);
      setClub(clubData);
      setEntries(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [clubId, period]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento..." />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.clubName}>{club?.name || '...'}</Text>
          <Text style={styles.title}>Classifica</Text>

          <View style={styles.periodRow}>
            {(['week', 'month', 'all_time'] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, period === p && styles.periodChipActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {entries.length === 0 ? (
            <EmptyState
              icon="trophy-outline"
              title="Nessun punteggio ancora"
              message={period === 'all_time' ? 'Gioca la prima partita in questo circolo per entrare in classifica' : `Nessun punteggio ${PERIOD_LABELS[period].toLowerCase()} ancora - i punti ripartono a ogni nuovo periodo`}
            />
          ) : (
            <>
              {podium.length > 0 && (
                <View style={styles.podiumCard}>
                  <View style={styles.podiumRow}>
                    {podium[1] && (
                      <View style={styles.podiumItem}>
                        <View style={[styles.podiumAvatar, { backgroundColor: avatarColor(1) }]}>
                          <Text style={styles.podiumAvatarText}>{podium[1].name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.podiumRank}>2</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{podium[1].name}</Text>
                        <Text style={styles.podiumPts}>{podium[1].points} pt</Text>
                      </View>
                    )}
                    {podium[0] && (
                      <View style={[styles.podiumItem, styles.podiumFirst]}>
                        <Ionicons name="trophy" size={22} color={COLORS.primary} style={styles.crownIcon} />
                        <View style={[styles.podiumAvatar, styles.podiumAvatarBig, { backgroundColor: avatarColor(0) }]}>
                          <Text style={styles.podiumAvatarTextBig}>{podium[0].name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.podiumRankFirst}>1</Text>
                        <Text style={styles.podiumNameFirst} numberOfLines={1}>{podium[0].name}</Text>
                        <Text style={styles.podiumPtsFirst}>{podium[0].points} pt</Text>
                      </View>
                    )}
                    {podium[2] && (
                      <View style={styles.podiumItem}>
                        <View style={[styles.podiumAvatar, { backgroundColor: avatarColor(2) }]}>
                          <Text style={styles.podiumAvatarText}>{podium[2].name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.podiumRank}>3</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{podium[2].name}</Text>
                        <Text style={styles.podiumPts}>{podium[2].points} pt</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {rest.length > 0 && (
                <View style={styles.section}>
                  {rest.map((entry, i) => {
                    const isMe = entry.user_id === user?.user_id;
                    return (
                      <View key={entry.user_id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                        <Text style={[styles.rankNum, isMe && styles.rankNumMe]}>{i + 4}</Text>
                        <View style={[styles.rankAvatar, { backgroundColor: avatarColor(i + 3) }]}>
                          <Text style={styles.rankAvatarText}>{entry.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.rankInfo}>
                          <Text style={styles.rankName}>{isMe ? 'Tu' : entry.name}</Text>
                          <Text style={styles.rankPts}>{entry.points} punti · {entry.wins}V {entry.losses}P</Text>
                        </View>
                        {entry.current_streak > 0 && (
                          <View style={styles.streakBadge}>
                            <Ionicons name="flame" size={14} color={COLORS.accent} />
                            <Text style={styles.streakBadgeText}>{entry.current_streak}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingVertical: 12 },
  backButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  clubName: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textSecondary },
  title: { fontSize: 28, fontFamily: FONTS.title, color: COLORS.text, marginBottom: 16 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip: {
    flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceLight,
  },
  periodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodChipText: { fontSize: 13.5, fontFamily: FONTS.button, color: COLORS.textSecondary },
  periodChipTextActive: { color: COLORS.background },
  podiumCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary + '40',
    borderRadius: 26, padding: 18, marginBottom: 20,
  },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 14 },
  podiumItem: { flex: 1, alignItems: 'center' },
  podiumFirst: { marginBottom: 10 },
  crownIcon: { marginBottom: 4 },
  podiumAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  podiumAvatarBig: { width: 60, height: 60, borderRadius: 30 },
  podiumAvatarText: { fontSize: 18, fontFamily: FONTS.title, color: '#fff' },
  podiumAvatarTextBig: { fontSize: 22, fontFamily: FONTS.title, color: '#fff' },
  podiumRank: { fontSize: 13, fontFamily: FONTS.title, color: COLORS.textMuted },
  podiumRankFirst: { fontSize: 15, fontFamily: FONTS.title, color: COLORS.primary },
  podiumName: { fontSize: 12.5, fontFamily: FONTS.subtitle, color: COLORS.textSecondary, marginTop: 2 },
  podiumNameFirst: { fontSize: 14, fontFamily: FONTS.title, color: COLORS.text, marginTop: 2 },
  podiumPts: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  podiumPtsFirst: { fontSize: 12.5, fontFamily: FONTS.label, color: COLORS.primary },
  section: { marginBottom: 24 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.surfaceLight, borderRadius: 16, padding: 13, marginBottom: 9,
  },
  rankRowMe: { borderColor: COLORS.accent, borderWidth: 1.5 },
  rankNum: { fontSize: 15, fontFamily: FONTS.title, color: COLORS.textMuted, width: 20, textAlign: 'center' },
  rankNumMe: { color: COLORS.accent },
  rankAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rankAvatarText: { fontSize: 14, fontFamily: FONTS.title, color: '#fff' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14.5, fontFamily: FONTS.subtitle, color: COLORS.text },
  rankPts: { fontSize: 11.5, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.accent + '18', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  streakBadgeText: { fontSize: 12, fontFamily: FONTS.button, color: COLORS.accent },
});
