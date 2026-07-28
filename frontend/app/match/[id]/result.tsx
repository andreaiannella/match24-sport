// Match Result Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input, LoadingSpinner } from '../../../src/components';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { COLORS } from '../../../src/utils/constants';
import { apiClient } from '../../../src/api/client';
import { Match, MatchParticipant } from '../../../src/types';
import { GradientBackground } from '../../../src/components';

export default function MatchResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [scoreTeamA, setScoreTeamA] = useState('');
  const [scoreTeamB, setScoreTeamB] = useState('');
  const [winnerTeam, setWinnerTeam] = useState<'A' | 'B' | 'draw'>('A');
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!id) return;
      try {
        const data = await apiClient.getMatch(id);
        setMatch(data);

        // If result exists, populate fields
        if (data.result) {
          setScoreTeamA(data.result.score_team_a);
          setScoreTeamB(data.result.score_team_b);
          setWinnerTeam(data.result.winner_team);
          setTeamAPlayers(data.result.team_a_players || []);
          setTeamBPlayers(data.result.team_b_players || []);
        } else {
          // Auto-split participants into teams
          const participants = data.participants || [];
          const half = Math.ceil(participants.length / 2);
          setTeamAPlayers(participants.slice(0, half).map((p: MatchParticipant) => p.user_id));
          setTeamBPlayers(participants.slice(half).map((p: MatchParticipant) => p.user_id));
        }
      } catch (error) {
        console.error('Error fetching match:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatch();
  }, [id]);

  const togglePlayerTeam = (playerId: string) => {
    if (teamAPlayers.includes(playerId)) {
      setTeamAPlayers((prev) => prev.filter((id) => id !== playerId));
      setTeamBPlayers((prev) => [...prev, playerId]);
    } else {
      setTeamBPlayers((prev) => prev.filter((id) => id !== playerId));
      setTeamAPlayers((prev) => [...prev, playerId]);
    }
  };

  const handleSubmit = async () => {
    if (!match || !scoreTeamA || !scoreTeamB) {
      Alert.alert('Errore', 'Inserisci i punteggi di entrambe le squadre');
      return;
    }

    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      Alert.alert('Errore', 'Entrambe le squadre devono avere almeno un giocatore');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.submitResult(match.match_id, {
        score_team_a: scoreTeamA,
        score_team_b: scoreTeamB,
        winner_team: winnerTeam,
        team_a_players: teamAPlayers,
        team_b_players: teamBPlayers,
      });
      
      // If we get here, the result was submitted successfully
      Alert.alert(t('success'), 'Risultato inviato! Il circolo dovrà confermarlo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Submit result error:', error);
      
      // Check if it's a network error but result might have been saved
      const status = error.response?.status;
      const isClientError = status && status >= 400 && status < 500;
      
      if (isClientError) {
        // Real client error - show message
        Alert.alert('Errore', error.response?.data?.detail || 'Impossibile inviare il risultato');
      } else {
        // Network/server error - result might have been saved
        // Try to refresh the match to check
        try {
          const freshMatch = await apiClient.getMatch(match.match_id);
          if (freshMatch.result && freshMatch.result.status === 'pending_confirmation') {
            // Result was saved!
            Alert.alert(t('success'), 'Risultato inviato! Il circolo dovrà confermarlo.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
            return;
          }
        } catch (refreshError) {
          // Couldn't check
        }
        Alert.alert('Errore', 'Errore di connessione. Riprova.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!match) return;

    setIsSubmitting(true);
    try {
      await apiClient.confirmResult(match.match_id);
      Alert.alert(t('success'), t('result_confirmed'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile confermare');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlayerInfo = (playerId: string) => {
    return match?.participants?.find((p: MatchParticipant) => p.user_id === playerId);
  };

  const canConfirm = match?.result && 
    match.result.status === 'pending_confirmation' && 
    !match.result.confirmations?.includes(user?.user_id || '');

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  if (!match) {
    return null;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {match.result ? t('confirm_result') : t('submit_result')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Teams Section */}
        <View style={styles.teamsContainer}>
          {/* Team A */}
          <Card style={[styles.teamCard, winnerTeam === 'A' && styles.winnerCard]}>
            <TouchableOpacity
              style={styles.teamHeader}
              onPress={() => setWinnerTeam('A')}
              disabled={!!match.result}
            >
              <Text style={styles.teamTitle}>{t('team_a')}</Text>
              {winnerTeam === 'A' && (
                <View style={styles.winnerBadge}>
                  <Ionicons name="trophy" size={16} color={COLORS.background} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.playersList}>
              {teamAPlayers.map((playerId) => {
                const player = getPlayerInfo(playerId);
                return (
                  <TouchableOpacity
                    key={playerId}
                    style={styles.playerItem}
                    onPress={() => togglePlayerTeam(playerId)}
                    disabled={!!match.result}
                  >
                    {player?.profile?.profile_picture || player?.user?.picture ? (
                      <Image
                        source={{ uri: player.profile?.profile_picture || player.user?.picture }}
                        style={styles.playerAvatar}
                      />
                    ) : (
                      <View style={styles.playerAvatarPlaceholder}>
                        <Ionicons name="person" size={12} color={COLORS.textMuted} />
                      </View>
                    )}
                    <Text style={styles.playerName}>{player?.user_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input
              label={t('score')}
              placeholder="Es. 6-4, 7-5"
              value={scoreTeamA}
              onChangeText={setScoreTeamA}
              editable={!match.result}
              containerStyle={styles.scoreInput}
            />
          </Card>

          {/* VS Divider */}
          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
            <TouchableOpacity
              style={[
                styles.drawButton,
                winnerTeam === 'draw' && styles.drawButtonActive,
              ]}
              onPress={() => setWinnerTeam('draw')}
              disabled={!!match.result}
            >
              <Text style={[
                styles.drawButtonText,
                winnerTeam === 'draw' && styles.drawButtonTextActive,
              ]}>
                {t('draw')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Team B */}
          <Card style={[styles.teamCard, winnerTeam === 'B' && styles.winnerCard]}>
            <TouchableOpacity
              style={styles.teamHeader}
              onPress={() => setWinnerTeam('B')}
              disabled={!!match.result}
            >
              <Text style={styles.teamTitle}>{t('team_b')}</Text>
              {winnerTeam === 'B' && (
                <View style={styles.winnerBadge}>
                  <Ionicons name="trophy" size={16} color={COLORS.background} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.playersList}>
              {teamBPlayers.map((playerId) => {
                const player = getPlayerInfo(playerId);
                return (
                  <TouchableOpacity
                    key={playerId}
                    style={styles.playerItem}
                    onPress={() => togglePlayerTeam(playerId)}
                    disabled={!!match.result}
                  >
                    {player?.profile?.profile_picture || player?.user?.picture ? (
                      <Image
                        source={{ uri: player.profile?.profile_picture || player.user?.picture }}
                        style={styles.playerAvatar}
                      />
                    ) : (
                      <View style={styles.playerAvatarPlaceholder}>
                        <Ionicons name="person" size={12} color={COLORS.textMuted} />
                      </View>
                    )}
                    <Text style={styles.playerName}>{player?.user_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input
              label={t('score')}
              placeholder="Es. 4-6, 5-7"
              value={scoreTeamB}
              onChangeText={setScoreTeamB}
              editable={!match.result}
              containerStyle={styles.scoreInput}
            />
          </Card>
        </View>

        {/* Info */}
        {!match.result && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              Tocca i giocatori per spostarli tra le squadre. Tocca una squadra per selezionarla come vincitore.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canConfirm ? (
            <Button
              title={t('confirm_result')}
              onPress={handleConfirm}
              loading={isSubmitting}
              fullWidth
              size="large"
            />
          ) : !match.result ? (
            <Button
              title={t('submit_result')}
              onPress={handleSubmit}
              loading={isSubmitting}
              fullWidth
              size="large"
            />
          ) : (
            <View style={styles.confirmedMessage}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.confirmedText}>
                {match.result.status === 'confirmed' 
                  ? t('result_confirmed')
                  : 'Hai già confermato questo risultato'}
              </Text>
            </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  teamsContainer: {
    marginTop: 16,
  },
  teamCard: {
    marginBottom: 8,
  },
  winnerCard: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  winnerBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playersList: {
    gap: 8,
    marginBottom: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 10,
    borderRadius: 10,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  playerAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 10,
  },
  scoreInput: {
    marginBottom: 0,
  },
  vsDivider: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  drawButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  drawButtonActive: {
    backgroundColor: COLORS.warning,
  },
  drawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  drawButtonTextActive: {
    color: COLORS.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  actions: {
    marginTop: 24,
  },
  confirmedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '20',
    padding: 16,
    borderRadius: 12,
  },
  confirmedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 8,
  },
});
