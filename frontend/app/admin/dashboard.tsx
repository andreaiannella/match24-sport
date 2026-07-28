// Admin Dashboard Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/utils/constants';
import { GradientBackground } from '../../src/components';

interface AdminStats {
  total_users: number;
  total_players: number;
  total_clubs: number;
  total_matches: number;
  active_subscriptions: number;
  recent_registrations: number;
  matches_today: number;
  revenue_month: number;
  free_clubs: number;
  premium_clubs: number;
  total_referred_players: number;
  clubs_using_invites: number;
  broadcasts_sent_month: number;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchStats = async () => {
    try {
      const stats = await apiClient.getAdminStats();
      setStats(stats);
      setLoadError(false);
    } catch (error) {
      // Previously this silently fell back to hardcoded demo numbers, which meant a real
      // fetch failure looked identical to a healthy dashboard. Surface it instead.
      console.log('Error fetching admin stats:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.warning} />
        </View>
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
            tintColor={COLORS.warning}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Super Admin</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.warning} />
          </View>
        </View>

        {loadError && (
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorCardText}>
              Impossibile caricare le statistiche. Trascina per aggiornare.
            </Text>
          </Card>
        )}

        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
            <Text style={styles.statLabel}>Utenti Totali</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="business" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.statNumber}>{stats?.total_clubs || 0}</Text>
            <Text style={styles.statLabel}>Circoli</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="tennisball" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statNumber}>{stats?.total_matches || 0}</Text>
            <Text style={styles.statLabel}>Partite</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="card" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.statNumber}>{stats?.active_subscriptions || 0}</Text>
            <Text style={styles.statLabel}>Abbonamenti</Text>
          </View>
        </View>

        {/* Today Stats */}
        <Card style={styles.todayCard}>
          <Text style={styles.sectionTitle}>Oggi</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <Text style={styles.todayNumber}>{stats?.matches_today || 0}</Text>
              <Text style={styles.todayLabel}>Partite in programma</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayNumber}>{stats?.recent_registrations || 0}</Text>
              <Text style={styles.todayLabel}>Nuovi utenti (7gg)</Text>
            </View>
          </View>
        </Card>

        {/* Revenue */}
        <Card style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Text style={styles.sectionTitle}>Ricavi Mensili</Text>
            <View style={styles.revenueBadge}>
              <Text style={styles.revenueBadgeText}>EUR</Text>
            </View>
          </View>
          <Text style={styles.revenueAmount}>€{stats?.revenue_month?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.revenueSubtext}>Da abbonamenti club attivi (equivalente mensile)</Text>
        </Card>

        {/* Growth - business model pivot metrics */}
        <Card style={styles.growthCard}>
          <Text style={styles.sectionTitle}>Crescita</Text>

          <View style={styles.growthRow}>
            <View style={styles.growthItem}>
              <Text style={styles.growthNumber}>{stats?.free_clubs ?? 0}</Text>
              <Text style={styles.growthLabel}>Circoli gratuiti</Text>
            </View>
            <View style={styles.growthItem}>
              <Text style={[styles.growthNumber, { color: COLORS.accent }]}>{stats?.premium_clubs ?? 0}</Text>
              <Text style={styles.growthLabel}>Circoli premium</Text>
            </View>
          </View>

          <View style={styles.growthDivider} />

          <View style={styles.growthRow}>
            <View style={styles.growthItem}>
              <Text style={styles.growthNumber}>{stats?.total_referred_players ?? 0}</Text>
              <Text style={styles.growthLabel}>Giocatori da inviti circoli</Text>
            </View>
            <View style={styles.growthItem}>
              <Text style={styles.growthNumber}>{stats?.clubs_using_invites ?? 0}</Text>
              <Text style={styles.growthLabel}>Circoli che invitano</Text>
            </View>
          </View>

          <View style={styles.growthDivider} />

          <View style={styles.growthItem}>
            <Text style={styles.growthNumber}>{stats?.broadcasts_sent_month ?? 0}</Text>
            <Text style={styles.growthLabel}>Broadcast inviati (ultimi 30gg)</Text>
          </View>
        </Card>

        {/* Platform Health */}
        <Card style={styles.healthCard}>
          <Text style={styles.sectionTitle}>Stato Piattaforma</Text>
          <View style={styles.healthItems}>
            <View style={styles.healthItem}>
              <View style={[styles.healthDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.healthText}>Backend API</Text>
              <Text style={styles.healthStatus}>Operativo</Text>
            </View>
            <View style={styles.healthItem}>
              <View style={[styles.healthDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.healthText}>Database</Text>
              <Text style={styles.healthStatus}>Operativo</Text>
            </View>
            <View style={styles.healthItem}>
              <View style={[styles.healthDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.healthText}>Socket.IO</Text>
              <Text style={styles.healthStatus}>Operativo</Text>
            </View>
          </View>
        </Card>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: '600',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  adminBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  todayCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayStat: {
    flex: 1,
    alignItems: 'center',
  },
  todayNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  todayLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  todayDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  revenueCard: {
    marginBottom: 16,
    backgroundColor: COLORS.warning + '10',
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  revenueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.warning,
    marginTop: 8,
  },
  revenueSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  errorCardText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  growthCard: {
    marginBottom: 16,
  },
  growthRow: {
    flexDirection: 'row',
  },
  growthItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  growthNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  growthLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  growthDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  healthCard: {
    marginBottom: 16,
  },
  healthItems: {
    gap: 12,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  healthText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  healthStatus: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
});
