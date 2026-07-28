// Club Onboarding Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { GradientBackground } from '../../src/components';

export default function ClubOnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !address || !city) {
      Alert.alert('Errore', 'Compila i campi obbligatori: Nome, Indirizzo e Città');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.registerClub({
        name,
        description,
        address,
        city,
        phone,
        email: email || undefined,
      });
      
      // Refresh user data to update role - wait for it to complete
      if (refreshUser) {
        await refreshUser();
      }
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      Alert.alert('Successo', 'Circolo registrato con successo! Il tuo profilo è già attivo e gratuito.', [
        { text: 'OK', onPress: () => router.replace('/club/dashboard') }
      ]);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile registrare il circolo');
    } finally {
      setIsLoading(false);
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
          <View style={styles.header}>
            <View style={styles.logoIcon}>
              <Ionicons name="business" size={40} color={COLORS.secondary} />
            </View>
            <Text style={styles.title}>Registra il tuo Circolo</Text>
            <Text style={styles.subtitle}>
              Inserisci le informazioni della tua struttura sportiva
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={`${t('club_name')} *`}
              placeholder="Es. Tennis Club Milano"
              value={name}
              onChangeText={setName}
              leftIcon="business-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={t('club_description')}
              placeholder="Descrivi il tuo circolo..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              leftIcon="document-text-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={`${t('club_address')} *`}
              placeholder="Via Roma 1"
              value={address}
              onChangeText={setAddress}
              leftIcon="location-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={`${t('city')} *`}
              placeholder="Milano"
              value={city}
              onChangeText={setCity}
              leftIcon="navigate-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={t('club_phone')}
              placeholder="+39 02 1234567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Input
              label={t('email')}
              placeholder="info@tennisclub.it"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              autoComplete="off"
              textContentType="none"
            />

            <Button
              title="Registra Circolo"
              onPress={handleSubmit}
              loading={isLoading}
              fullWidth
              size="large"
              style={styles.submitButton}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="gift-outline" size={24} color={COLORS.success} />
            <Text style={styles.infoText}>
              L'iscrizione è gratuita: potrai gestire i tuoi campi e ricevere prenotazioni da subito, senza scadenze.
            </Text>
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
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + '20',
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
  form: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.success + '10',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
});
