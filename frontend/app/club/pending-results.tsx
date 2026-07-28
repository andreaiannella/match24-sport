// Club Pending Results Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, EmptyState } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { GradientBackground } from '../../src/components';

interface PendingResult {
  result_id: string;
  match_id: string;
  score_a: number;
  score_b: number;
  winner_team: string;
  submitted_by: string;
  submitted_by_name: string;
  status: string;
  created_at: string;
  match: {
    sport: string;
    date: string;
    time: string;
    court_id?: string;
  };
}

export default function ClubPendingResultsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchPendingResults = async () => {
    try {
      const results = await apiClient.getClubPendingResults();
      setPendingResults(results);
    } catch (error) {
      console.error('Error fetching pending results:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingResults();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingResults();
  };

  const handleConfirm = async (matchId: string) => {
    Alert.alert(
      'Conferma Risultato',
      'Sei sicuro di voler confermare questo risultato? Questa azione è definitiva.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'default',
          onPress: async () => {
            setConfirmingId(matchId);
            try {
              await apiClient.clubConfirmMatchResult(matchId);
              Alert.alert('Successo', 'Risultato confermato con successo!');
              // Remove from list
              setPendingResults(prev => prev.filter(r => r.match_id !== matchId));
            } catch (error: any) {
              Alert.alert('Errore', error.response?.data?.detail || 'Impossibile confermare il risultato');
            } finally {
              setConfirmingId(null);
            }
          },
        },
      ]
    );
  };

  const getSportIcon = (sport: string): string => {
    switch (sport?.toLowerCase()) {
      case 'padel':
        return 'tennisball-outline';
      case 'tennis':
        return 'tennisball-outline';
      case 'calcetto':
      case 'calcio8':
        return 'football-outline';
      default:
        return 'trophy-outline';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento risultati..." />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Risultati da Confermare</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {pendingResults.length > 0 ? (
          pendingResults.map((result) => (
            <Card key={result.result_id} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.sportBadge}>
                  <Ionicons name={getSportIcon(result.match.sport) as any} size={18} color={COLORS.primary} />
                  <Text style={styles.sportText}>{result.match.sport}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                  <Text style={styles.statusText}>In attesa</Text>
                </View>
              </View>

              <View style={styles.matchInfo}>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.dateTimeText}>
                    {formatDate(result.match.date)} alle {result.match.time}
                  </Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.dateTimeText}>
                    Inserito da: {result.submitted_by_name}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <View style={styles.teamScore}>
                  <Text style={styles.teamLabel}>Squadra A</Text>
                  <Text style={[
                    styles.scoreValue,
                    result.winner_team === 'A' && styles.winnerScore
                  ]}>
                    {result.score_a}
                  </Text>
                  {result.winner_team === 'A' && (
                    <Ionicons name="trophy" size={16} color={COLORS.accent} />
                  )}
                </View>
                <Text style={styles.vsText}>-</Text>
                <View style={styles.teamScore}>
                  <Text style={styles.teamLabel}>Squadra B</Text>
                  <Text style={[
                    styles.scoreValue,
                    result.winner_team === 'B' && styles.winnerScore
                  ]}>
                    {result.score_b}
                  </Text>
                  {result.winner_team === 'B' && (
                    <Ionicons name="trophy" size={16} color={COLORS.accent} />
                  )}
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <Button
                  title="Vedi Dettagli"
                  variant="outline"
                  onPress={() => router.push(`/match/${result.match_id}`)}
                  style={styles.detailsButton}
                />
                <Button
                  title="Conferma"
                  variant="primary"
                  loading={confirmingId === result.match_id}
                  onPress={() => handleConfirm(result.match_id)}
                  style={styles.confirmButton}
                />
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Tutto confermato!"
            message="Non ci sono risultati in attesa di conferma"
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
  refreshButton: {
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
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  sportText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  matchInfo: {
    gap: 8,
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 24,
  },
  teamScore: {
    alignItems: 'center',
    gap: 4,
  },
  teamLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  winnerScore: {
    color: COLORS.primary,
  },
  vsText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
