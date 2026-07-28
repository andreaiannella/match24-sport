// Club Matches Screen
import React, { useEffect, useState } from 'react';
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
import { MatchCard, LoadingSpinner, EmptyState } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match } from '../../src/types';
import { GradientBackground } from '../../src/components';

export default function ClubMatchesScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'full' | 'completed'>('open');

  const fetchMatches = async () => {
    try {
      const data = await apiClient.getClubMatches();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const filteredMatches = matches.filter((m) => {
    if (activeTab === 'open') return m.status === 'open';
    if (activeTab === 'full') return m.status === 'full';
    return m.status === 'completed';
  });

  const getCounts = () => ({
    open: matches.filter((m) => m.status === 'open').length,
    full: matches.filter((m) => m.status === 'full').length,
    completed: matches.filter((m) => m.status === 'completed').length,
  });

  const counts = getCounts();

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('matches')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/club/create-match')}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => setActiveTab('open')}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Aperte ({counts.open})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'full' && styles.tabActive]}
          onPress={() => setActiveTab('full')}
        >
          <Text style={[styles.tabText, activeTab === 'full' && styles.tabTextActive]}>
            Piene ({counts.full})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completate ({counts.completed})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              onPress={() => router.push(`/match/${match.match_id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Nessuna partita"
            message={
              activeTab === 'open'
                ? 'Crea la prima partita per il tuo circolo'
                : 'Non ci sono partite in questa categoria'
            }
            actionLabel={activeTab === 'open' ? t('create_match') : undefined}
            onAction={activeTab === 'open' ? () => router.push('/club/create-match') : undefined}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
