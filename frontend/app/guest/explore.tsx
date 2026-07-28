// Guest Explore Screen - Apple Guideline 5.1.1(v) Compliance
// Allows users to browse matches without registration
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, EmptyState, Card, MatchCardSkeleton, GradientBackground, SponsorBanner } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Match } from '../../src/types';
import { lightHaptic } from '../../src/utils/haptics';

export default function GuestExploreScreen() {
  const router = useRouter();
  const { exitGuestMode } = useAuth();
  const { t } = useLanguage();

  const [matches, setMatches] = useState<Match[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [matchesData, citiesData] = await Promise.all([
        apiClient.listMatches({ 
          status: 'open', 
          limit: 50,
          city: selectedCity || undefined,
          sport: selectedSport || undefined,
        }),
        apiClient.getCities(),
      ]);
      setMatches(matchesData);
      setCities(citiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedCity, selectedSport]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [selectedCity, selectedSport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Show login prompt when user tries to join a match
  const handleMatchPress = (matchId: string) => {
    lightHaptic();
    Alert.alert(
      'Accesso richiesto',
      'Per partecipare a una partita o vedere i dettagli, devi accedere al tuo account.',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Accedi', 
          onPress: () => {
            exitGuestMode();
            router.push('/auth/login');
          }
        },
        { 
          text: 'Registrati', 
          onPress: () => {
            exitGuestMode();
            router.push('/auth/register');
          },
          style: 'default'
        },
      ]
    );
  };

  const handleBackToWelcome = () => {
    lightHaptic();
    exitGuestMode();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToWelcome}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Esplora Partite</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {[1, 2, 3, 4].map((i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToWelcome}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Esplora Partite</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Guest Banner */}
        <View style={styles.guestBanner}>
          <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
          <Text style={styles.guestBannerText}>
            Stai esplorando senza account. 
          </Text>
          <TouchableOpacity onPress={() => {
            exitGuestMode();
            router.push('/auth/login');
          }}>
            <Text style={styles.guestBannerLink}>Accedi</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          {/* City Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca la tua città..."
                placeholderTextColor={COLORS.textMuted}
                value={citySearch}
                onChangeText={(text) => {
                  setCitySearch(text);
                  setShowCitySuggestions(text.length > 0);
                  if (text.length === 0) {
                    setSelectedCity(null);
                  }
                }}
                onFocus={() => setShowCitySuggestions(citySearch.length > 0 || cities.length > 0)}
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (citySearch.trim()) {
                    setSelectedCity(citySearch.trim());
                    setShowCitySuggestions(false);
                    Keyboard.dismiss();
                  }
                }}
              />
              {(citySearch || selectedCity) && (
                <TouchableOpacity 
                  onPress={() => {
                    setCitySearch('');
                    setSelectedCity(null);
                    setShowCitySuggestions(false);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* City Suggestions Dropdown */}
            {showCitySuggestions && (
              <View style={styles.suggestionsContainer}>
                {cities
                  .filter(city => 
                    citySearch.length === 0 || 
                    city.toLowerCase().includes(citySearch.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setCitySearch(city);
                        setSelectedCity(city);
                        setShowCitySuggestions(false);
                        Keyboard.dismiss();
                        lightHaptic();
                      }}
                    >
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <Text style={styles.suggestionText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                {citySearch.length > 0 && !cities.some(c => c.toLowerCase() === citySearch.toLowerCase()) && (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => {
                      setSelectedCity(citySearch.trim());
                      setShowCitySuggestions(false);
                      Keyboard.dismiss();
                      lightHaptic();
                    }}
                  >
                    <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.suggestionText}>Cerca "{citySearch}"</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Selected City Tag */}
          {selectedCity && (
            <View style={styles.selectedCityContainer}>
              <View style={styles.selectedCityTag}>
                <Ionicons name="location" size={14} color={COLORS.background} />
                <Text style={styles.selectedCityText}>{selectedCity}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setCitySearch('');
                    setSelectedCity(null);
                  }}
                >
                  <Ionicons name="close" size={16} color={COLORS.background} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sport Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, !selectedSport && styles.filterChipActive]}
              onPress={() => setSelectedSport(null)}
            >
              <Text style={[styles.filterChipText, !selectedSport && styles.filterChipTextActive]}>
                Tutti gli sport
              </Text>
            </TouchableOpacity>
            {Object.entries(SPORTS).map(([key, sport]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, selectedSport === key && styles.filterChipActive]}
                onPress={() => setSelectedSport(selectedSport === key ? null : key)}
              >
                <Text style={[styles.filterChipText, selectedSport === key && styles.filterChipTextActive]}>
                  {sport.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Local sponsors for the selected city - sold directly, not intrusive */}
        {selectedCity && <SponsorBanner city={selectedCity} />}

        {/* Matches List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Nessuna partita disponibile"
              message={selectedCity || selectedSport 
                ? "Prova a cambiare i filtri di ricerca"
                : "Non ci sono partite aperte al momento. Torna più tardi!"
              }
            />
          ) : (
            <>
              <Text style={styles.resultsCount}>
                {matches.length} {matches.length === 1 ? 'partita trovata' : 'partite trovate'}
              </Text>
              {matches.map((match) => (
                <MatchCard
                  key={match.match_id}
                  match={match}
                  onPress={() => handleMatchPress(match.match_id)}
                />
              ))}
            </>
          )}

          {/* CTA to register */}
          <Card style={styles.ctaCard}>
            <Ionicons name="person-add-outline" size={32} color={COLORS.primary} />
            <Text style={styles.ctaTitle}>Vuoi partecipare?</Text>
            <Text style={styles.ctaText}>
              Registrati gratuitamente per prenotare il tuo posto, chattare con gli altri giocatori e tracciare il tuo rating.
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => {
                exitGuestMode();
                router.push('/auth/register');
              }}
            >
              <Text style={styles.ctaButtonText}>Registrati gratis</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    gap: 8,
  },
  guestBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  guestBannerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filtersSection: {
    paddingBottom: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipCity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  ctaCard: {
    marginTop: 24,
    alignItems: 'center',
    padding: 24,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  selectedCityContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedCityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  selectedCityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.background,
  },
});
