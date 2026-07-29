// Tournament Detail Screen - iscrizione individuale (padel/tennis) o Slot Aperto a squadre (calcetto/calcio8)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input, LoadingSpinner, SportImage, GradientBackground } from '../../../../src/components';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { COLORS, FONTS, SPORTS } from '../../../../src/utils/constants';
import { apiClient } from '../../../../src/api/client';
import { Tournament, Club } from '../../../../src/types';
import { lightHaptic } from '../../../../src/utils/haptics';

const iconFlame = require('../../../../assets/images/gamification/icon-flame.png');

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  const fetchTournament = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.getTournament(id);
      setTournament(data);
      if (data.club_id) {
        const clubData = await apiClient.getClub(data.club_id);
        setClub(clubData);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
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

  const sportInfo = SPORTS.find((s) => s.id === tournament?.sport);

  const handleJoinIndividual = async () => {
    if (!tournament) return;
    setIsJoining(true);
    lightHaptic();
    try {
      await apiClient.joinTournament(tournament.tournament_id);
      await fetchTournament();
    } catch (err: any) {
      Alert.alert('Errore', err.response?.data?.detail || 'Impossibile iscriverti');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!tournament || !teamName.trim()) return;
    setCreatingTeam(true);
    try {
      await apiClient.createTournamentTeam(tournament.tournament_id, teamName.trim());
      setTeamName('');
      setShowCreateTeam(false);
      await fetchTournament();
    } catch (err: any) {
      Alert.alert('Errore', err.response?.data?.detail || 'Impossibile creare la squadra');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!tournament) return;
    lightHaptic();
    try {
      await apiClient.joinTournamentTeam(tournament.tournament_id, teamId);
      await fetchTournament();
    } catch (err: any) {
      Alert.alert('Errore', err.response?.data?.detail || 'Impossibile unirti alla squadra');
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento..." />;
  }

  if (!tournament) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <Text style={styles.errorText}>Torneo non trovato</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const isIndividualMode = tournament.registration_mode === 'individual';
  const iAmParticipant = isIndividualMode
    ? tournament.participants?.some((p) => p.user_id === user?.user_id)
    : tournament.teams?.some((t) => t.member_user_ids.includes(user?.user_id || ''));
  const isFull = tournament.status !== 'open';
  const fillPercent = Math.min(100, (tournament.current_players / tournament.max_players) * 100);
  const numTeamsNeeded = tournament.max_players / tournament.team_size;

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

          <Card style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.sportBadge}>
                {tournament.sport && <SportImage sport={tournament.sport} size={26} />}
              </View>
              <View style={[styles.statusTag, isFull && styles.statusTagFull]}>
                {!isFull && <View style={styles.liveDot} />}
                <Text style={[styles.statusTagText, isFull && styles.statusTagTextFull]}>
                  {tournament.status === 'open' ? 'SLOT APERTO' :
                   tournament.status === 'full' ? 'AL COMPLETO' :
                   tournament.status === 'in_progress' ? 'IN CORSO' : 'CONCLUSO'}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>
              {sportInfo?.name || tournament.sport} · {club?.name || '...'}
            </Text>
            <Text style={styles.heroSub}>
              {tournament.date} · {tournament.start_time} ·{' '}
              {isIndividualMode ? `${tournament.team_size} per squadra` : `${tournament.team_size}vs${tournament.team_size}`}
            </Text>

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${fillPercent}%`, backgroundColor: sportInfo?.color || COLORS.primary }]} />
              </View>
              <Text style={styles.progressLabel}>{tournament.current_players}/{tournament.max_players}</Text>
            </View>

            {!isIndividualMode && (
              <Text style={styles.teamModeNote}>
                Non conosci ancora i tuoi avversari? Nessun problema: crea una squadra o unisciti a una che ha ancora posto.
              </Text>
            )}
          </Card>

          {/* Modalità individuale: padel/tennis */}
          {isIndividualMode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Iscritti ({tournament.participants?.length || 0}/{tournament.max_players})
              </Text>
              <View style={styles.participantsWrap}>
                {tournament.participants?.map((p) => (
                  <View key={p.user_id} style={styles.participantChip}>
                    <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.participantText}>
                      {p.user_id === user?.user_id ? 'Tu' : p.user_id.slice(-6)}
                    </Text>
                  </View>
                ))}
              </View>

              {iAmParticipant ? (
                <View style={styles.joinedBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.joinedBannerText}>Sei iscritto a questo torneo</Text>
                </View>
              ) : !isFull ? (
                <Button
                  title="Unisciti alla battaglia"
                  onPress={handleJoinIndividual}
                  loading={isJoining}
                  fullWidth
                  size="large"
                />
              ) : (
                <Text style={styles.fullText}>Le iscrizioni sono chiuse</Text>
              )}
            </View>
          )}

          {/* Modalità a squadre: calcetto/calcio8 */}
          {!isIndividualMode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Squadre ({tournament.teams?.length || 0}/{numTeamsNeeded})
              </Text>

              {tournament.teams?.map((team) => {
                const isMyTeam = team.member_user_ids.includes(user?.user_id || '');
                const isTeamFull = team.member_user_ids.length >= tournament.team_size;
                return (
                  <Card key={team.team_id} style={[styles.teamCard, isMyTeam && styles.teamCardMine]}>
                    <View style={styles.teamCardHeader}>
                      <Text style={styles.teamName}>{team.team_name}</Text>
                      <Text style={styles.teamCount}>{team.member_user_ids.length}/{tournament.team_size}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${(team.member_user_ids.length / tournament.team_size) * 100}%`, backgroundColor: sportInfo?.color || COLORS.primary }]} />
                    </View>
                    {isMyTeam ? (
                      <View style={styles.joinedBannerSmall}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.joinedBannerSmallText}>Fai parte di questa squadra</Text>
                      </View>
                    ) : !isTeamFull && !isFull && !iAmParticipant ? (
                      <TouchableOpacity style={styles.joinTeamButton} onPress={() => handleJoinTeam(team.team_id)}>
                        <Text style={styles.joinTeamButtonText}>Unisciti a questa squadra</Text>
                      </TouchableOpacity>
                    ) : null}
                  </Card>
                );
              })}

              {!iAmParticipant && !isFull && (tournament.teams?.length || 0) < numTeamsNeeded && (
                showCreateTeam ? (
                  <Card style={styles.createTeamCard}>
                    <Input
                      label="Nome squadra"
                      placeholder="Es. I Bomber"
                      value={teamName}
                      onChangeText={setTeamName}
                    />
                    <Button
                      title="Crea squadra"
                      onPress={handleCreateTeam}
                      loading={creatingTeam}
                      fullWidth
                    />
                  </Card>
                ) : (
                  <TouchableOpacity style={styles.newTeamButton} onPress={() => setShowCreateTeam(true)}>
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.newTeamButtonText}>Crea una nuova squadra</Text>
                  </TouchableOpacity>
                )
              )}

              {isFull && (
                <Text style={styles.fullText}>Le iscrizioni sono chiuse, il tabellone è in preparazione</Text>
              )}
            </View>
          )}

          {tournament.status === 'in_progress' && (
            <TouchableOpacity style={styles.bracketLink} onPress={() => router.push(`/player/tournament/${tournament.tournament_id}/bracket` as any)}>
              <Image source={iconFlame} style={styles.bracketLinkIcon} />
              <Text style={styles.bracketLinkText}>Il tabellone è partito - guardalo</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {tournament.status === 'completed' && (
            <TouchableOpacity style={styles.bracketLink} onPress={() => router.push(`/player/tournament/${tournament.tournament_id}/bracket` as any)}>
              <Ionicons name="trophy" size={20} color={COLORS.primary} />
              <Text style={styles.bracketLinkText}>Torneo concluso - guarda il tabellone finale</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
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
  heroCard: { marginBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sportBadge: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  statusTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accent + '20',
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusTagFull: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.textMuted },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  statusTagText: { fontSize: 10.5, fontFamily: FONTS.button, color: COLORS.accent, letterSpacing: 0.4 },
  statusTagTextFull: { color: COLORS.textMuted },
  heroTitle: { fontSize: 21, fontFamily: FONTS.title, color: COLORS.text, marginBottom: 4 },
  heroSub: { fontSize: 13.5, fontFamily: FONTS.body, color: COLORS.textSecondary, marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 7, borderRadius: 7, backgroundColor: COLORS.surfaceLight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 7 },
  progressLabel: { fontSize: 12.5, fontFamily: FONTS.label, color: COLORS.textSecondary },
  teamModeNote: {
    fontSize: 12.5, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 14,
    lineHeight: 18, backgroundColor: COLORS.surfaceLight, padding: 10, borderRadius: 10,
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: FONTS.title, color: COLORS.text, marginBottom: 12 },
  participantsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  participantChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.surfaceLight, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  participantText: { fontSize: 12.5, fontFamily: FONTS.label, color: COLORS.textSecondary },
  joinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.success + '15',
    borderWidth: 1, borderColor: COLORS.success, borderRadius: 14, padding: 14,
  },
  joinedBannerText: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.success },
  fullText: { fontSize: 13.5, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
  teamCard: { marginBottom: 12 },
  teamCardMine: { borderWidth: 1.5, borderColor: COLORS.primary },
  teamCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  teamName: { fontSize: 15.5, fontFamily: FONTS.subtitle, color: COLORS.text },
  teamCount: { fontSize: 13, fontFamily: FONTS.label, color: COLORS.textSecondary },
  joinedBannerSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  joinedBannerSmallText: { fontSize: 12.5, fontFamily: FONTS.label, color: COLORS.success },
  joinTeamButton: {
    marginTop: 12, backgroundColor: COLORS.primary + '18', borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  joinTeamButtonText: { fontSize: 13.5, fontFamily: FONTS.button, color: COLORS.primary },
  createTeamCard: { marginTop: 4 },
  newTeamButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  newTeamButtonText: { fontSize: 14.5, fontFamily: FONTS.button, color: COLORS.primary },
  bracketLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.primary + '50', borderRadius: 16, padding: 14,
  },
  bracketLinkIcon: { width: 20, height: 20 },
  bracketLinkText: { flex: 1, fontSize: 13.5, fontFamily: FONTS.subtitle, color: COLORS.text },
});
