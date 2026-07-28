// Login Screen
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, GradientBackground } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, FONTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';

const appLogo = require('../../assets/images/gamification/app-logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Navigate after successful login
  useEffect(() => {
    if (isAuthenticated && user) {
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
      await login(email, password);

      setTimeout(async () => {
        try {
          const userData = await apiClient.getMe();
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
          router.replace('/player/home');
        }
      }, 200);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Errore di connessione. Riprova.';
      setError(errorMessage);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: il flusso Google dell'app originale dipendeva interamente dal proxy
    // OAuth di Emergent (demobackend.emergentagent.com) e non aveva comunque un
    // vero punto di avvio collegato (solo il callback che lo riceve, e solo su
    // web). Va ricostruito con credenziali OAuth Google reali prima di attivarlo.
    Alert.alert(
      'Non ancora disponibile',
      'L\'accesso con Google è in arrivo - per ora usa email e password.'
    );
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
              <Image source={appLogo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Ciao</Text>
              <Text style={styles.subtitle}>Il tuo prossimo match parte da qui.</Text>
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
                title="Accedi"
                onPress={handleLogin}
                loading={isLoading}
                fullWidth
                size="large"
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>oppure</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Accedi con Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestButton}
                onPress={() => router.push('/guest/explore')}
                activeOpacity={0.8}
              >
                <Text style={styles.guestButtonText}>Esplora partite senza account</Text>
              </TouchableOpacity>
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
    fontFamily: FONTS.label,
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
    marginVertical: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.body,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    marginHorizontal: 14,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 13,
    fontFamily: FONTS.title,
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontFamily: FONTS.button,
    color: COLORS.text,
  },
  guestButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 13.5,
    fontFamily: FONTS.label,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  footerLink: {
    color: COLORS.primary,
    fontFamily: FONTS.button,
    fontSize: 15,
  },
});
