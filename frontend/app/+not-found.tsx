// 404 Not Found Screen - Handles unmatched routes and deep links
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/utils/constants';
import { useAuth } from '../src/contexts/AuthContext';
import { GradientBackground } from '../src/components';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const handleGoHome = () => {
    // Navigate to appropriate home based on user role
    if (user) {
      if (user.role === 'club_admin') {
        router.replace('/club/dashboard');
      } else {
        router.replace('/player/home');
      }
    } else {
      router.replace('/auth/login');
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={80} color={COLORS.warning} />
        </View>
        
        <Text style={styles.title}>Pagina non trovata</Text>
        
        <Text style={styles.subtitle}>
          La pagina che stai cercando non esiste o non è disponibile.
        </Text>
        
        {pathname && pathname !== '/' && (
          <View style={styles.pathContainer}>
            <Text style={styles.pathLabel}>Percorso richiesto:</Text>
            <Text style={styles.pathText}>{pathname}</Text>
          </View>
        )}

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <Ionicons name="home-outline" size={20} color={COLORS.background} />
            <Text style={styles.primaryButtonText}>Vai alla Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Torna indietro</Text>
          </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  pathContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  pathLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  pathText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
