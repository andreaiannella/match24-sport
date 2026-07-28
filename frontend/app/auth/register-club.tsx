// Register Club Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { GradientBackground } from '../../src/components';

export default function RegisterClubScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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
      await register(email, password, name, 'club_admin');
      router.replace('/club/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore durante la registrazione');
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
              <Ionicons name="business" size={32} color={COLORS.secondary} />
            </View>
            <Text style={styles.title}>{t('register_as_club')}</Text>
            <Text style={styles.subtitle}>Registra il tuo circolo e pubblica i tuoi campi</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              label="Nome Responsabile"
              placeholder="Mario Rossi"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon="person-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={t('email')}
              placeholder="circolo@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <Input
              label={t('password')}
              placeholder="Minimo 6 caratteri"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Input
              label="Conferma Password"
              placeholder="Ripeti la password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Button
              title="Registra Circolo"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="large"
              icon={<Ionicons name="business-outline" size={20} color={COLORS.background} />}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.info} />
            <Text style={styles.infoText}>
              Dopo la registrazione potrai configurare il tuo circolo, aggiungere i campi e iniziare a ricevere prenotazioni.
            </Text>
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
  form: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
