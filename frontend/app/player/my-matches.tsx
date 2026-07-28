// Player My Matches Screen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, LoadingSpinner, EmptyState, Card } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match } from '../../src/types';
import { GradientBackground } from '../../src/components';

export default function PlayerMyMatchesScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const fetchData = useCallback(async () => {
    try {
      // Use the new endpoint that returns both upcoming and past matches
      const data = await apiClient.getPlayerMyMatches(50);
      setUpcomingMatches(data.upcoming || []);
      setPastMatches(data.past || []);
    } catch (error) {
      console.error('Error fetching my matches:', error);
      // Fallback to empty arrays
      setUpcomingMatches([]);
      setPastMatches([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const displayMatches = activeTab === 'upcoming' ? upcomingMatches : pastMatches;

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('my_matches')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Prossime ({upcomingMatches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            {t('match_history')} ({pastMatches.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {displayMatches.length > 0 ? (
          displayMatches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              onPress={() => router.push(`/match/${match.match_id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
            title={
              activeTab === 'upcoming'
                ? 'Nessuna partita in programma'
                : 'Nessuna partita nello storico'
            }
            message={
              activeTab === 'upcoming'
                ? 'Cerca e prenota una partita'
                : 'Le tue partite passate appariranno qui'
            }
            actionLabel={activeTab === 'upcoming' ? t('find_match') : undefined}
            onAction={
              activeTab === 'upcoming'
                ? () => router.push('/player/search')
                : undefined
            }
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
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
