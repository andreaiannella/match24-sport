// Privacy Policy Page - Required for Apple App Store compliance
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/utils/constants';
import { GradientBackground } from '../src/components';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Ultimo aggiornamento: Marzo 2026</Text>

        <Text style={styles.sectionTitle}>1. Informazioni Raccolte</Text>
        <Text style={styles.paragraph}>
          Match Sport 24 raccoglie le seguenti informazioni:
        </Text>
        <Text style={styles.bulletPoint}>• Email e nome per la creazione dell&apos;account</Text>
        <Text style={styles.bulletPoint}>• Foto del profilo (opzionale)</Text>
        <Text style={styles.bulletPoint}>• Informazioni sul circolo sportivo per i gestori</Text>
        <Text style={styles.bulletPoint}>• Dati di utilizzo dell&apos;app per migliorare il servizio</Text>

        <Text style={styles.sectionTitle}>2. Utilizzo delle Informazioni</Text>
        <Text style={styles.paragraph}>
          Utilizziamo le informazioni raccolte per:
        </Text>
        <Text style={styles.bulletPoint}>• Fornire e migliorare i nostri servizi</Text>
        <Text style={styles.bulletPoint}>• Gestire il tuo account e abbonamento</Text>
        <Text style={styles.bulletPoint}>• Comunicare aggiornamenti importanti</Text>
        <Text style={styles.bulletPoint}>• Garantire la sicurezza della piattaforma</Text>

        <Text style={styles.sectionTitle}>3. Condivisione dei Dati</Text>
        <Text style={styles.paragraph}>
          Non vendiamo i tuoi dati personali. Condividiamo informazioni solo:
        </Text>
        <Text style={styles.bulletPoint}>• Con fornitori di servizi necessari (pagamenti, hosting)</Text>
        <Text style={styles.bulletPoint}>• Quando richiesto dalla legge</Text>
        <Text style={styles.bulletPoint}>• Con il tuo consenso esplicito</Text>

        <Text style={styles.sectionTitle}>4. Sicurezza</Text>
        <Text style={styles.paragraph}>
          Implementiamo misure di sicurezza tecniche e organizzative per proteggere i tuoi dati, 
          inclusa la crittografia delle comunicazioni e l&apos;accesso limitato ai dati personali.
        </Text>

        <Text style={styles.sectionTitle}>5. I Tuoi Diritti</Text>
        <Text style={styles.paragraph}>
          Hai il diritto di:
        </Text>
        <Text style={styles.bulletPoint}>• Accedere ai tuoi dati personali</Text>
        <Text style={styles.bulletPoint}>• Correggere dati inesatti</Text>
        <Text style={styles.bulletPoint}>• Richiedere la cancellazione del tuo account</Text>
        <Text style={styles.bulletPoint}>• Esportare i tuoi dati</Text>

        <Text style={styles.sectionTitle}>6. Cancellazione Account</Text>
        <Text style={styles.paragraph}>
          Puoi richiedere la cancellazione del tuo account in qualsiasi momento attraverso 
          le Impostazioni dell&apos;app. Tutti i tuoi dati verranno eliminati entro 30 giorni 
          dalla richiesta, salvo obblighi legali di conservazione.
        </Text>

        <Text style={styles.sectionTitle}>7. Abbonamenti</Text>
        <Text style={styles.paragraph}>
          Gli abbonamenti sono gestiti tramite App Store (iOS) o Google Play (Android). 
          I pagamenti vengono processati direttamente da Apple o Google. 
          L&apos;abbonamento si rinnova automaticamente a meno che non venga annullato 
          almeno 24 ore prima della fine del periodo corrente.
        </Text>

        <Text style={styles.sectionTitle}>8. Contatti</Text>
        <Text style={styles.paragraph}>
          Per domande sulla privacy, contattaci a:{'\n'}
          support@matchsport24.com
        </Text>

        <Text style={styles.footer}>
          © 2026 Match Sport 24. Tutti i diritti riservati.
        </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  footer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
