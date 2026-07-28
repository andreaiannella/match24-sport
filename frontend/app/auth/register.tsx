// Register Screen (Player)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
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
import { COLORS, FONTS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';

const appLogo = require('../../assets/images/gamification/app-logo.png');

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
      await register(email, password, name, 'player', referralCode || undefined);
      router.replace('/player/onboarding');
    } catch (err: any) {
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
              <Image source={appLogo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Crea il tuo account</Text>
              <Text style={styles.subtitle}>Il tuo prossimo match parte da qui.</Text>
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
                  Sei stato invitato da <Text style={styles.inviteBannerBold}>{invitingClubName}</Text>
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
                title="Crea account"
                onPress={handleRegister}
                loading={isLoading}
                fullWidth
                size="large"
                style={styles.submitButton}
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
    marginVertical: 20,
  },
  logo: {
    width: 76,
    height: 76,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
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
    fontFamily: FONTS.body,
    fontSize: 14,
    flex: 1,
  },
  inviteBannerBold: {
    fontFamily: FONTS.title,
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
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
