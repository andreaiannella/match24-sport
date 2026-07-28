// Player Search Screen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, EmptyState, ListSkeleton, SportImage, SponsorBanner } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS, SKILL_LEVELS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match } from '../../src/types';
import { selectionHaptic, lightHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

export default function PlayerSearchScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [matches, setMatches] = useState<Match[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchCity, setSearchCity] = useState('');
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const params: any = { status: 'open', limit: 50 };
      if (searchCity) params.city = searchCity;
      if (selectedSport) params.sport = selectedSport;
      if (selectedLevel) params.skill_level = selectedLevel;

      const data = await apiClient.listMatches(params);
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchCity, selectedSport, selectedLevel]);

  const fetchCities = async () => {
    try {
      const data = await apiClient.getCities();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  // Refresh data when screen comes into focus (e.g., after joining a match)
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [fetchMatches])
  );

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [selectedSport, selectedLevel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleSearch = () => {
    setIsLoading(true);
    fetchMatches();
  };

  const clearFilters = () => {
    setSearchCity('');
    setSelectedSport(null);
    setSelectedLevel(null);
    setIsLoading(true);
    fetchMatches();
  };

  const activeFiltersCount = [
    searchCity,
    selectedSport,
    selectedLevel,
  ].filter(Boolean).length;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('find_match')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca città..."
            placeholderTextColor={COLORS.textMuted}
            value={searchCity}
            onChangeText={setSearchCity}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchCity ? (
            <TouchableOpacity onPress={() => setSearchCity('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFiltersCount > 0 && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={activeFiltersCount > 0 ? COLORS.background : COLORS.textMuted}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('sport')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {SPORTS.map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.filterChip,
                      selectedSport === sport.id && {
                        backgroundColor: sport.color,
                      },
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setSelectedSport(selectedSport === sport.id ? null : sport.id);
                    }}
                  >
                    <SportImage sport={sport.id} size={18} />
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedSport === sport.id && { color: COLORS.background },
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('level')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.filterChip,
                      selectedLevel === level.id && styles.filterChipActive,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setSelectedLevel(selectedLevel === level.id ? null : level.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedLevel === level.id && { color: COLORS.background },
                      ]}
                    >
                      {level.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {activeFiltersCount > 0 && (
            <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={styles.clearFiltersText}>Rimuovi filtri</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View style={styles.scrollContent}>
          <ListSkeleton count={4} />
        </View>
      ) : (
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
          {searchCity && <SponsorBanner city={searchCity} />}
          <Text style={styles.resultsCount}>
            {matches.length} {matches.length === 1 ? 'partita trovata' : 'partite trovate'}
          </Text>
          {matches.length > 0 ? (
            matches.map((match) => (
              <MatchCard
                key={match.match_id}
                match={match}
                onPress={() => router.push(`/match/${match.match_id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="search-outline"
              title={t('no_matches_found')}
              message="Prova a modificare i filtri di ricerca"
            />
          )}
        </ScrollView>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  filtersPanel: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  clearFiltersText: {
    color: COLORS.error,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
});
