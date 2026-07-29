// Tournament Bracket Screen - tabellone vero, con dati reali
import React, { useState, useCallback } from 'react';
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
import { LoadingSpinner, GradientBackground } from '../../../../src/components';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { COLORS, FONTS } from '../../../../src/utils/constants';
import { apiClient } from '../../../../src/api/client';
import { Tournament, Match } from '../../../../src/types';

export default function TournamentBracketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTournament = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.getTournament(id);
      setTournament(data);
    } catch (error) {
      console.error('Error fetching bracket:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchTournament();
    }, [fetchTournament])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournament();
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento tabellone..." />;
  }

  if (!tournament || !tournament.matches) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <Text style={styles.errorText}>Tabellone non ancora disponibile</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Raggruppo le partite per round, mantenendo l'ordine cronologico
  // (l'API le restituisce gia' ordinate: round piu' precoce prima)
  const rounds: { name: string; matches: Match[] }[] = [];
  tournament.matches.forEach((m) => {
    const roundName = m.tournament_round || 'Round';
    let round = rounds.find((r) => r.name === roundName);
    if (!round) {
      round = { name: roundName, matches: [] };
      rounds.push(round);
    }
    round.matches.push(m);
  });

  const isMyMatch = (m: Match) =>
    m.team_a_names?.includes(user?.name || '__none__') ||
    m.team_b_names?.includes(user?.name || '__none__') ||
    m.result?.team_a_players.includes(user?.user_id || '__none__') ||
    m.result?.team_b_players.includes(user?.user_id || '__none__');

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

          <Text style={styles.subtitle}>Torneo lampo</Text>
          <Text style={styles.title}>Tabellone</Text>

          {rounds.map((round) => (
            <View key={round.name} style={styles.roundSection}>
              <Text style={styles.roundLabel}>{round.name.toUpperCase()}</Text>
              {round.matches.map((match) => {
                const isLive = match.status === 'full' || match.status === 'open';
                const isCompleted = match.status === 'completed';
                const result = match.result;
                const aWon = result?.winner_team === 'A';
                const bWon = result?.winner_team === 'B';
                const highlight = isMyMatch(match);

                return (
                  <View
                    key={match.match_id}
                    style={[styles.matchCard, isLive && highlight && styles.matchCardLive]}
                  >
                    {isLive && highlight && (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>LA TUA PARTITA</Text>
                      </View>
                    )}
                    <View style={[styles.teamRow, aWon && styles.teamRowWinner]}>
                      <Text style={[styles.teamName, aWon && styles.teamNameWinner]} numberOfLines={1}>
                        {match.team_a_names?.join(' + ') || 'Squadra A'}
                      </Text>
                      {isCompleted && (
                        <Text style={[styles.score, aWon && styles.scoreWinner]}>{result?.score_team_a}</Text>
                      )}
                    </View>
                    <View style={styles.divider} />
                    <View style={[styles.teamRow, bWon && styles.teamRowWinner]}>
                      <Text style={[styles.teamName, bWon && styles.teamNameWinner]} numberOfLines={1}>
                        {match.team_b_names?.join(' + ') || 'Squadra B'}
                      </Text>
                      {isCompleted && (
                        <Text style={[styles.score, bWon && styles.scoreWinner]}>{result?.score_team_b}</Text>
                      )}
                    </View>
                    {!isCompleted && (
                      <TouchableOpacity
                        style={styles.matchLink}
                        onPress={() => router.push(`/match/${match.match_id}` as any)}
                      >
                        <Text style={styles.matchLinkText}>Vai alla partita</Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          {tournament.status === 'completed' && (
            <View style={styles.completedBanner}>
              <Ionicons name="trophy" size={22} color={COLORS.primary} />
              <Text style={styles.completedBannerText}>Torneo concluso</Text>
            </View>
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
  errorText: { color: COLORS.textMuted, fontFamily: FONTS.body, textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textSecondary },
  title: { fontSize: 28, fontFamily: FONTS.title, color: COLORS.text, marginBottom: 20 },
  roundSection: { marginBottom: 20 },
  roundLabel: {
    fontSize: 11.5, fontFamily: FONTS.title, letterSpacing: 0.6, color: COLORS.textMuted, marginBottom: 10,
  },
  matchCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceLight,
    borderRadius: 16, marginBottom: 10, overflow: 'hidden', position: 'relative',
  },
  matchCardLive: { borderColor: COLORS.secondary, borderWidth: 1.5 },
  liveBadge: {
    position: 'absolute', top: -9, right: 12, backgroundColor: COLORS.secondary,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  liveBadgeText: { fontSize: 9, fontFamily: FONTS.title, color: COLORS.background, letterSpacing: 0.3 },
  teamRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12,
  },
  teamRowWinner: { backgroundColor: COLORS.success + '12' },
  teamName: { flex: 1, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textSecondary },
  teamNameWinner: { color: COLORS.success, fontFamily: FONTS.subtitle },
  score: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.textMuted },
  scoreWinner: { color: COLORS.success },
  divider: { height: 1, backgroundColor: COLORS.surfaceLight },
  matchLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.surfaceLight,
  },
  matchLinkText: { fontSize: 12.5, fontFamily: FONTS.label, color: COLORS.primary },
  completedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 16, padding: 16, marginTop: 8,
  },
  completedBannerText: { fontSize: 15, fontFamily: FONTS.title, color: COLORS.primary },
});
