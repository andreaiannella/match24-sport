// Login Screen - Stable Version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, GradientBackground } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Navigate after successful login
  useEffect(() => {
    console.log('[Login useEffect] isAuthenticated:', isAuthenticated, 'user:', user?.email);
    if (isAuthenticated && user) {
      console.log('[Login] User authenticated, navigating to:', user.role);
      // Use setTimeout to ensure state is fully updated
      setTimeout(() => {
        if (user.role === 'super_admin') {
          router.push('/admin/dashboard');
        } else if (user.role === 'club_admin') {
          router.push('/club/dashboard');
        } else {
          router.push('/player/home');
        }
      }, 100);
    }
  }, [isAuthenticated, user]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    try {
      setError('');
      console.log('[Login] Attempting login for:', email);
      await login(email, password);
      console.log('[Login] Login successful');
      
      // Small delay then navigate
      setTimeout(async () => {
        try {
          const userData = await apiClient.getMe();
          console.log('[Login] User data:', userData?.role);
          
          if (userData) {
            if (userData.role === 'super_admin') {
              router.replace('/admin/dashboard');
            } else if (userData.role === 'club_admin') {
              router.replace('/club/dashboard');
            } else {
              router.replace('/player/home');
            }
          }
        } catch (navErr) {
          console.error('[Login] Navigation error:', navErr);
          // Fallback navigation
          router.replace('/player/home');
        }
      }, 200);
    } catch (err: any) {
      console.error('[Login] Login failed:', err?.message || err);
      const errorMessage = err.response?.data?.detail || 
                          err.message || 
                          'Errore di connessione. Riprova.';
      setError(errorMessage);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_padel-finder-app/artifacts/np98g9bo_logo%20pagna%20benvenuto.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Match Sport 24</Text>
              <Text style={styles.title}>{t('login')}</Text>
              <Text style={styles.subtitle}>Accedi al tuo account Match Sport 24</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Input
                label={t('email')}
                placeholder="nome@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <Input
              label={t('password')}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <TouchableOpacity 
              onPress={() => router.push('/auth/forgot-password')}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Password dimenticata?</Text>
            </TouchableOpacity>

            <Button
              title={t('login')}
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="large"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('no_account')}</Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.footerLink}> {t('register')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '20',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
