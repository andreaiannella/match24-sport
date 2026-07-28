// Admin Clubs Management Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/utils/constants';
import { GradientBackground } from '../../src/components';

interface Club {
  club_id: string;
  name: string;
  city: string;
  address: string;
  courts_count: number;
  matches_count: number;
  subscription_status: string;
  subscription_plan?: string | null;
  subscription_expires: string | null;
  is_premium: boolean;
  referred_players_count: number;
}

export default function AdminClubsScreen() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState(false);

  const fetchClubs = async () => {
    try {
      const clubs = await apiClient.getAdminClubs();
      setClubs(clubs);
      setLoadError(false);
    } catch (error) {
      console.log('Error fetching clubs:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClubs();
  };

  const getSubscriptionBadge = (isPremium: boolean) => {
    return isPremium
      ? { bg: COLORS.accent + '20', text: COLORS.accent, label: 'Premium' }
      : { bg: COLORS.textMuted + '20', text: COLORS.textMuted, label: 'Gratuito' };
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClub = ({ item }: { item: Club }) => {
    const subBadge = getSubscriptionBadge(item.is_premium);
    
    return (
      <Card style={styles.clubCard}>
        <View style={styles.clubHeader}>
          <View style={styles.clubIcon}>
            <Ionicons name="business" size={24} color={COLORS.secondary} />
          </View>
          <View style={styles.clubInfo}>
            <Text style={styles.clubName}>{item.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.clubLocation}>{item.city}</Text>
            </View>
          </View>
          <View style={[styles.subBadge, { backgroundColor: subBadge.bg }]}>
            <Text style={[styles.subBadgeText, { color: subBadge.text }]}>
              {subBadge.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="tennisball-outline" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{item.courts_count}</Text>
            <Text style={styles.statLabel}>Campi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.success} />
            <Text style={styles.statValue}>{item.matches_count}</Text>
            <Text style={styles.statLabel}>Partite</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="megaphone-outline" size={18} color={COLORS.warning} />
            <Text style={styles.statValue}>{item.referred_players_count}</Text>
            <Text style={styles.statLabel}>Da inviti</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Visualizza dettagli</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </Card>
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Circoli</Text>
        <Text style={styles.subtitle}>{filteredClubs.length} circoli registrati</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca circolo o città..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.accent + '20' }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.accent }]}>
            {clubs.filter(c => c.is_premium).length}
          </Text>
          <Text style={styles.summaryLabel}>Premium</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.textMuted + '20' }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.textMuted }]}>
            {clubs.filter(c => !c.is_premium).length}
          </Text>
          <Text style={styles.summaryLabel}>Gratuiti</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.success + '20' }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
            {clubs.reduce((sum, c) => sum + (c.referred_players_count || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Giocatori da inviti</Text>
        </View>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.errorBannerText}>Impossibile caricare i circoli. Trascina per aggiornare.</Text>
        </View>
      )}

      <FlatList
        data={filteredClubs}
        renderItem={renderClub}
        keyExtractor={(item) => item.club_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.warning}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nessun circolo trovato</Text>
          </View>
        }
      />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  clubCard: {
    marginBottom: 12,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clubIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clubLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  subBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
