// Register Screen (Player)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, GradientBackground } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { register, isLoading } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState(ref ? String(ref).toUpperCase() : '');
  const [invitingClubName, setInvitingClubName] = useState<string | null>(null);

  // If we arrived via a club's invite link, resolve the code to show "invited by <club>"
  useEffect(() => {
    if (ref) {
      apiClient.getClubByReferralCode(String(ref))
        .then((club) => setInvitingClubName(club.name))
        .catch(() => {
          // Invalid/expired code in the link: keep the field editable, just don't show the banner
        });
    }
  }, [ref]);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Compila tutti i campi');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    try {
      setError('');
      console.log('[Register] Starting registration for:', email);
      await register(email, password, name, 'player', referralCode || undefined);
      console.log('[Register] Registration successful, redirecting to onboarding');
      router.replace('/player/onboarding');
    } catch (err: any) {
      console.error('[Register] Registration failed:', err?.message || err);
      console.error('[Register] Error response:', JSON.stringify(err?.response?.data));
      const errorMessage = err.response?.data?.detail || 
                          err.message || 
                          'Errore durante la registrazione. Verifica la connessione.';
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
              <View style={styles.logoIcon}>
                <Ionicons name="person-add" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{t('register_as_player')}</Text>
              <Text style={styles.subtitle}>Crea il tuo account e trova partite</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {invitingClubName ? (
              <View style={styles.inviteBanner}>
                <Ionicons name="gift-outline" size={20} color={COLORS.primary} />
                <Text style={styles.inviteBannerText}>
                  Sei stato invitato da <Text style={{ fontWeight: '800' }}>{invitingClubName}</Text>
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Input
                label={t('name')}
                placeholder="Mario Rossi"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon="person-outline"
            />

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
              placeholder="Minimo 6 caratteri"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <Input
              label="Conferma Password"
              placeholder="Ripeti la password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <Input
              label="Codice invito circolo (facoltativo)"
              placeholder="Es. MSP-A7K2"
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.toUpperCase())}
              autoCapitalize="characters"
              leftIcon="pricetag-outline"
              editable={!invitingClubName}
            />

            <Button
              title={t('register')}
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="large"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('have_account')}</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}> {t('login')}</Text>
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
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
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
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  inviteBannerText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  form: {
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
