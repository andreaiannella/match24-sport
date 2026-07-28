// Main Entry Screen - Welcome Page (Compact, No Scroll)
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, LoadingSpinner } from '../src/components';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { COLORS } from '../src/utils/constants';
import { GradientBackground } from '../src/components';

// Sport icons URLs
const SPORT_ICONS: Record<string, string> = {
  padel: 'https://customer-assets.emergentagent.com/job_padel-finder-app/artifacts/3cxy0zew_padel%20%281%29.png',
  tennis: 'https://customer-assets.emergentagent.com/job_padel-finder-app/artifacts/z6g71agz_tennis%20%281%29.png',
  calcetto: 'https://customer-assets.emergentagent.com/job_padel-finder-app/artifacts/vba4q5gu_calcetto.png',
  calcio8: 'https://customer-assets.emergentagent.com/job_padel-finder-app/artifacts/s1kuk84k_calcio%20a%208.png',
};

const SPORTS_DATA = [
  { id: 'padel', name: 'Padel' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'calcetto', name: 'Calcetto' },
  { id: 'calcio8', name: 'Calcio a 8' },
];

export default function Index() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, isGuest, enterGuestMode } = useAuth();
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 2000);

    if (!authLoading) {
      setShowContent(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Handle Google OAuth callback
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        router.replace('/auth/callback');
        return;
      }
    }
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (showContent && isAuthenticated && user) {
      if (user.role === 'super_admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'club_admin') {
        router.replace('/club/dashboard');
      } else {
        router.replace('/player/home');
      }
    }
  }, [showContent, isAuthenticated, user]);

  // Redirect guest users to explore screen
  useEffect(() => {
    if (showContent && isGuest && !isAuthenticated) {
      router.replace('/guest/explore');
    }
  }, [showContent, isGuest, isAuthenticated]);

  // Check onboarding - REMOVED: Don't force onboarding anymore for Apple compliance
  // Users can explore without account first

  // Handle guest mode entry
  const handleExploreAsGuest = () => {
    enterGuestMode();
    router.replace('/guest/explore');
  };

  if (!showContent) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image
          source={require('../assets/images/logo-24.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>Match Sport 24</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>{t('welcome')}</Text>
        <Text style={styles.heroSubtitle}>
          Trova e prenota partite di Padel, Tennis, Calcetto e Calcio a 8 nella tua città
        </Text>

        {/* Sports Row with Custom Icons */}
        <View style={styles.sportsRow}>
          {SPORTS_DATA.map((sport) => (
            <View key={sport.id} style={styles.sportItem}>
              <Image
                source={{ uri: SPORT_ICONS[sport.id] }}
                style={styles.sportIcon}
                resizeMode="contain"
              />
              <Text style={styles.sportName}>{sport.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        {/* FIRST BUTTON: Explore without account - Apple Guideline 5.1.1(v) compliance */}
        <Button
          title="Esplora partite"
          onPress={handleExploreAsGuest}
          variant="primary"
          size="large"
          fullWidth
          icon={<Ionicons name="search-outline" size={20} color={COLORS.background} />}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title={t('register_as_player')}
          onPress={() => router.push('/auth/register')}
          variant="outline"
          size="large"
          fullWidth
          style={styles.secondaryButton}
          icon={<Ionicons name="person-outline" size={20} color={COLORS.primary} />}
        />

        <Button
          title={t('register_as_club')}
          onPress={() => router.push('/auth/register-club')}
          variant="outline"
          size="large"
          fullWidth
          style={styles.secondaryButton}
          icon={<Ionicons name="business-outline" size={20} color={COLORS.primary} />}
        />

        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginLinkText}>
            {t('have_account')} <Text style={styles.loginLinkTextBold}>{t('login')}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Features Row */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="search-outline" size={24} color={COLORS.primary} />
          <Text style={styles.featureText}>Trova partite</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="chatbubbles-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.featureText}>Chat di gruppo</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="trophy-outline" size={24} color={COLORS.accent} />
          <Text style={styles.featureText}>Rating ELO</Text>
        </View>
      </View>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  sportsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  sportItem: {
    alignItems: 'center',
    width: 70,
  },
  sportIcon: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ctaSection: {
    paddingBottom: 16,
  },
  secondaryButton: {
    marginTop: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  loginLinkTextBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
