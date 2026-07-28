// Match Detail Screen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, SportBadge } from '../../../src/components';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { COLORS } from '../../../src/utils/constants';
import { apiClient } from '../../../src/api/client';
import { Match, MatchParticipant } from '../../../src/types';
import { format, parseISO } from 'date-fns';
import { it, es, fr, enUS } from 'date-fns/locale';
import { lightHaptic } from '../../../src/utils/haptics';
import { GradientBackground } from '../../../src/components';

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const getLocale = () => {
    switch (language) {
      case 'es': return es;
      case 'fr': return fr;
      case 'en': return enUS;
      default: return it;
    }
  };

  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.getMatch(id);
      setMatch(data);
      
      // Check if club is in favorites
      if (data.club_id && user?.role === 'player') {
        try {
          const favStatus = await apiClient.checkFavoriteStatus(data.club_id);
          setIsFavorite(favStatus.is_favorite);
        } catch (e) {
          // Ignore error for favorite status check
        }
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      Alert.alert('Errore', 'Impossibile caricare la partita');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatch();
  };

  const isParticipant = match?.participants?.some(
    (p: MatchParticipant) => p.user_id === user?.user_id
  );

  const spotsLeft = match ? match.max_players - match.current_players : 0;
  const isFull = spotsLeft <= 0;
  const canJoin = !isParticipant && !isFull && match?.status === 'open';
  const canLeave = isParticipant && match?.status !== 'completed';
  const canChat = isParticipant && match?.status !== 'cancelled';
  const canSubmitResult = isParticipant && (match?.status === 'full' || match?.status === 'completed');

  const handleJoin = async () => {
    if (!match) return;
    setIsJoining(true);
    try {
      await apiClient.joinMatch(match.match_id);
      // Success - refresh match data and show success message
      await fetchMatch();
      Alert.alert(t('success'), t('booking_confirmed'));
    } catch (error: any) {
      console.error('Join match error:', error);
      
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const isClientError = status && status >= 400 && status < 500;
      
      if (isClientError) {
        // Check if it's "already joined" - this means user is actually in
        if (detail === 'Already joined this match') {
          await fetchMatch();
          Alert.alert(t('success'), t('booking_confirmed'));
          return;
        }
        // Real error
        Alert.alert('Errore', detail || 'Impossibile iscriversi');
      } else {
        // Network/server error - might have succeeded
        // Refresh to check
        try {
          const freshMatch = await apiClient.getMatch(match.match_id);
          const nowParticipant = freshMatch.participants?.some(
            (p: MatchParticipant) => p.user_id === user?.user_id
          );
          if (nowParticipant) {
            // Join succeeded!
            setMatch(freshMatch);
            Alert.alert(t('success'), t('booking_confirmed'));
            return;
          }
        } catch (e) {
          // Couldn't verify
        }
        Alert.alert('Errore', 'Errore di connessione. Riprova.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!match) return;
    Alert.alert(
      'Conferma',
      'Sei sicuro di voler cancellare la prenotazione?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              await apiClient.leaveMatch(match.match_id);
              await fetchMatch();
              Alert.alert(t('success'), t('booking_cancelled'));
            } catch (error: any) {
              Alert.alert('Errore', error.response?.data?.detail || 'Impossibile cancellare');
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return t('beginner');
      case 'intermediate': return t('intermediate');
      case 'advanced': return t('advanced');
      default: return t('all_levels');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return t('open');
      case 'full': return t('full');
      case 'completed': return t('completed');
      case 'cancelled': return t('cancelled');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return COLORS.success;
      case 'full': return COLORS.warning;
      case 'completed': return COLORS.textMuted;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const toggleFavorite = async () => {
    if (!match?.club_id || user?.role !== 'player') return;
    
    setFavoriteLoading(true);
    lightHaptic();
    
    try {
      if (isFavorite) {
        await apiClient.removeFavoriteClub(match.club_id);
        setIsFavorite(false);
      } else {
        await apiClient.addFavoriteClub(match.club_id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert(
        'Errore',
        isFavorite ? 'Impossibile rimuovere dai preferiti' : 'Impossibile aggiungere ai preferiti'
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  if (!match) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Partita non trovata</Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('match_detail')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Match Header */}
        <Card style={styles.mainCard}>
          <View style={styles.matchHeader}>
            <SportBadge sport={match.sport} size="large" />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(match.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(match.status) }]}>
                {getStatusLabel(match.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.clubName}>{match.club_name}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>{t('date')}</Text>
              <Text style={styles.infoValue}>
                {format(parseISO(match.date), 'EEEE d MMMM', { locale: getLocale() })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color={COLORS.secondary} />
              <Text style={styles.infoLabel}>{t('time')}</Text>
              <Text style={styles.infoValue}>{match.start_time} - {match.end_time}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>{t('city')}</Text>
              <Text style={styles.infoValue}>{match.club_city}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="trophy" size={20} color={COLORS.warning} />
              <Text style={styles.infoLabel}>{t('level')}</Text>
              <Text style={styles.infoValue}>{getLevelLabel(match.skill_level)}</Text>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.participantsSection}>
            <View style={styles.participantsHeader}>
              <Text style={styles.participantsTitle}>{t('participants')}</Text>
              <Text style={styles.participantsCount}>
                {match.current_players}/{match.max_players}
              </Text>
            </View>
            <View style={styles.participantsList}>
              {match.participants?.map((p: MatchParticipant) => (
                <View key={p.user_id} style={styles.participantItem}>
                  {p.profile?.profile_picture || p.user?.picture ? (
                    <Image
                      source={{ uri: p.profile?.profile_picture || p.user?.picture }}
                      style={styles.participantAvatar}
                    />
                  ) : (
                    <View style={styles.participantAvatarPlaceholder}>
                      <Ionicons name="person" size={16} color={COLORS.textMuted} />
                    </View>
                  )}
                  <Text style={styles.participantName}>{p.user_name}</Text>
                  {p.user_id === user?.user_id && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>Tu</Text>
                    </View>
                  )}
                </View>
              ))}
              {/* Empty slots */}
              {[...Array(spotsLeft)].map((_, i) => (
                <View key={`empty-${i}`} style={styles.participantItem}>
                  <View style={styles.emptySlot}>
                    <Ionicons name="add" size={16} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptySlotText}>Posto libero</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <View>
              <Text style={styles.priceLabel}>{t('price')}</Text>
              <Text style={styles.priceNote}>{t('payment_on_site')}</Text>
            </View>
            <Text style={styles.priceValue}>
              {match.price_per_player > 0 ? `\u20AC${match.price_per_player.toFixed(2)}` : t('free')}
            </Text>
          </View>
        </Card>

        {/* Club Info */}
        {match.club ? (
          <Card style={styles.clubCard}>
            <View style={styles.clubCardHeader}>
              <Text style={styles.clubCardTitle}>{t('my_club')}</Text>
              {user?.role === 'player' && (
                <TouchableOpacity 
                  onPress={toggleFavorite}
                  disabled={favoriteLoading}
                  style={styles.favoriteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isFavorite ? COLORS.error : COLORS.textMuted} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.clubInfoName}>{match.club.name}</Text>
            {match.club.address && (
              <View style={styles.clubInfoRow}>
                <Ionicons name="navigate-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.clubInfoText}>{match.club.address}</Text>
              </View>
            )}
            {match.club.phone && (
              <View style={styles.clubInfoRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.clubInfoText}>{match.club.phone}</Text>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.clubCard}>
            <View style={styles.clubCardHeader}>
              <Text style={styles.clubCardTitle}>{t('my_club')}</Text>
              {user?.role === 'player' && match.club_id && (
                <TouchableOpacity 
                  onPress={toggleFavorite}
                  disabled={favoriteLoading}
                  style={styles.favoriteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isFavorite ? COLORS.error : COLORS.textMuted} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.clubInfoName}>{match.club_name}</Text>
            {match.club_city && (
              <View style={styles.clubInfoRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.clubInfoText}>{match.club_city}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Result if available */}
        {match.result && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="trophy" size={24} color={COLORS.accent} />
              <Text style={styles.resultTitle}>{t('result')}</Text>
              <View style={[
                styles.resultStatusBadge,
                { backgroundColor: match.result.status === 'confirmed' ? COLORS.success + '20' : COLORS.warning + '20' }
              ]}>
                <Text style={[
                  styles.resultStatusText,
                  { color: match.result.status === 'confirmed' ? COLORS.success : COLORS.warning }
                ]}>
                  {match.result.status === 'confirmed' ? t('result_confirmed') : t('pending_confirmation')}
                </Text>
              </View>
            </View>
            <View style={styles.scoreContainer}>
              <View style={styles.teamScore}>
                <Text style={styles.teamLabel}>{t('team_a')}</Text>
                <Text style={styles.scoreValue}>{match.result.score_team_a}</Text>
              </View>
              <Text style={styles.vsText}>vs</Text>
              <View style={styles.teamScore}>
                <Text style={styles.teamLabel}>{t('team_b')}</Text>
                <Text style={styles.scoreValue}>{match.result.score_team_b}</Text>
              </View>
            </View>
            {match.result.status !== 'confirmed' && isParticipant && !match.result.confirmations?.includes(user?.user_id || '') && (
              <Button
                title={t('confirm_result')}
                onPress={() => router.push(`/match/${match.match_id}/result`)}
                variant="outline"
                size="small"
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        {/* Notes */}
        {match.notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.notesTitle}>Note</Text>
            <Text style={styles.notesText}>{match.notes}</Text>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {canChat && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/match/${match.match_id}/chat`)}
          >
            <Ionicons name="chatbubbles" size={24} color={COLORS.background} />
          </TouchableOpacity>
        )}
        {canSubmitResult && !match.result && (
          <Button
            title={t('submit_result')}
            onPress={() => router.push(`/match/${match.match_id}/result`)}
            variant="secondary"
            style={{ flex: 1, marginRight: 8 }}
          />
        )}
        {canJoin && (
          <Button
            title={t('join_match')}
            onPress={handleJoin}
            loading={isJoining}
            style={{ flex: 1 }}
          />
        )}
        {canLeave && (
          <Button
            title={t('leave_match')}
            onPress={handleLeave}
            loading={isLeaving}
            variant="outline"
            style={{ flex: 1 }}
          />
        )}
      </View>
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
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  mainCard: {
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clubName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  infoItem: {
    width: '50%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  participantsSection: {
    marginBottom: 20,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  participantsCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 12,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  participantAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  emptySlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 12,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceNote: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  clubCard: {
    marginBottom: 16,
  },
  clubCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubCardTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  favoriteButton: {
    padding: 4,
  },
  clubInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  clubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  resultStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  vsText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginHorizontal: 16,
  },
  notesCard: {
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
