// Club Dashboard Screen - Fixed Loading Logic
import React, { useEffect, useState, useRef } from 'react';
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
import { Card, DashboardSkeleton } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Club } from '../../src/types';
import { format, parseISO } from 'date-fns';
import { lightHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

export default function ClubDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref for retry count to avoid stale closure issues
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const isMountedRef = useRef(true);

  const fetchDashboard = async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log(`[Dashboard] Fetching... attempt ${retryCountRef.current + 1}`);
      const data = await apiClient.getClubDashboard();
      
      if (!isMountedRef.current) return;
      
      console.log('[Dashboard] Success:', data?.club?.name);
      setDashboardData(data);
      setError(null);
      retryCountRef.current = 0;
      setIsLoading(false);
      setRefreshing(false);
      
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      const status = err.response?.status;
      console.log(`[Dashboard] Error: ${status}, retry: ${retryCountRef.current}`);
      
      // 403 or 404 means club doesn't exist yet
      if (status === 403 || status === 404) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`[Dashboard] Retrying in 1.5s... attempt ${retryCountRef.current}/${maxRetries}`);
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchDashboard();
            }
          }, 1500);
          return;
        }
        
        // After max retries, redirect to onboarding
        console.log('[Dashboard] Max retries reached, redirecting to onboarding');
        setIsLoading(false);
        router.replace('/club/onboarding');
        return;
      }
      
      // Other errors - show error state
      console.error('[Dashboard] Error fetching:', err);
      setError('Impossibile caricare la dashboard');
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;
    fetchDashboard();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    retryCountRef.current = 0;
    fetchDashboard();
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'trial': return COLORS.warning;
      case 'expired': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getSubscriptionStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo';
      case 'trial': return 'Prova';
      case 'expired': return 'Scaduto';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <DashboardSkeleton />
      </SafeAreaView>
    </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  if (!dashboardData) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Nessun dato disponibile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Ricarica</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  const club = dashboardData.club;
  const stats = dashboardData.stats;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/club/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
      >
        {/* Club Info */}
        <Card style={styles.clubCard}>
          <View style={styles.clubHeader}>
            <View>
              <Text style={styles.clubName}>{club.name}</Text>
              <Text style={styles.clubLocation}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                {' '}{club.city}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/club/edit-profile')}
            >
              <Ionicons name="pencil" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.subscriptionBadge}>
            <View style={[
              styles.subscriptionDot,
              { backgroundColor: getSubscriptionStatusColor(club.subscription_status) }
            ]} />
            <Text style={[
              styles.subscriptionText,
              { color: getSubscriptionStatusColor(club.subscription_status) }
            ]}>
              {getSubscriptionStatusLabel(club.subscription_status)}
              {club.subscription_expires_at && (
                ` - Scade il ${format(parseISO(club.subscription_expires_at), 'dd/MM/yyyy')}`
              )}
            </Text>
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="tennisball-outline" size={28} color={COLORS.secondary} />
            <Text style={styles.statValue}>{stats.courts_count}</Text>
            <Text style={styles.statLabel}>Campi</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="calendar-outline" size={28} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.open_matches}</Text>
            <Text style={styles.statLabel}>Partite Aperte</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="people-outline" size={28} color={COLORS.warning} />
            <Text style={styles.statValue}>{stats.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Prenotazioni</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/invite');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="megaphone-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Invita Giocatori</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/add-court');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionText}>Aggiungi Campo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/create-match');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionText}>Crea Partita</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/courts');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="grid-outline" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.actionText}>Gestisci Campi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/matches');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.error + '20' }]}>
              <Ionicons name="list-outline" size={24} color={COLORS.error} />
            </View>
            <Text style={styles.actionText}>Le Partite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              lightHaptic();
              router.push('/club/pending-results');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
              <Ionicons name="trophy-outline" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.actionText}>Conferma Risultati</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Matches */}
        {dashboardData.upcoming_matches && dashboardData.upcoming_matches.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prossime Partite</Text>
              <TouchableOpacity onPress={() => router.push('/club/matches')}>
                <Text style={styles.seeAllText}>Vedi tutte</Text>
              </TouchableOpacity>
            </View>
            {dashboardData.upcoming_matches.slice(0, 3).map((match: any) => (
              <Card 
                key={match.match_id} 
                style={styles.matchCard}
                onPress={() => router.push(`/match/${match.match_id}`)}
              >
                <View style={styles.matchInfo}>
                  <Text style={styles.matchSport}>{match.sport}</Text>
                  <Text style={styles.matchDate}>
                    {format(parseISO(match.date), 'dd/MM')} - {match.start_time}
                  </Text>
                </View>
                <View style={styles.matchPlayers}>
                  <Ionicons name="people" size={16} color={COLORS.secondary} />
                  <Text style={styles.matchPlayersText}>
                    {match.current_players}/{match.max_players}
                  </Text>
                </View>
              </Card>
            ))}
          </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  clubCard: {
    marginBottom: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clubName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  clubLocation: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  subscriptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  subscriptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  matchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchSport: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  matchDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  matchPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchPlayersText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 4,
  },
});
