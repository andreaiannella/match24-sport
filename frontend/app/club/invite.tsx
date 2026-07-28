// Club Invite Screen - let a club invite its existing player base (zero-cost growth channel)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner, Button, Input, GradientBackground } from '../../src/components';
import { COLORS, BORDER_RADIUS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';

interface ClubInviteData {
  referral_code: string;
  deep_link: string;
  share_message: string;
  referred_players_count: number;
  is_premium: boolean;
  followers_count: number;
}

export default function ClubInviteScreen() {
  const router = useRouter();
  const [data, setData] = useState<ClubInviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvite = async () => {
    try {
      const result = await apiClient.getClubInvite();
      setData(result);
      setError(null);
    } catch (e) {
      setError('Impossibile caricare il link di invito. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvite();
  }, []);

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({ message: data.share_message });
    } catch (e) {
      // User dismissed the share sheet or share failed silently - nothing to do
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastFeedback({ type: 'error', text: 'Inserisci titolo e messaggio' });
      return;
    }
    setIsSendingBroadcast(true);
    setBroadcastFeedback(null);
    try {
      const result = await apiClient.sendClubBroadcast(broadcastTitle.trim(), broadcastMessage.trim());
      setBroadcastFeedback({
        type: 'success',
        text: `Messaggio inviato a ${result.recipients_count} giocatori`,
      });
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Impossibile inviare il messaggio. Riprova più tardi.';
      setBroadcastFeedback({ type: 'error', text: detail });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento..." />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Invita i tuoi giocatori</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introBox}>
            <Ionicons name="megaphone-outline" size={24} color={COLORS.primary} />
            <Text style={styles.introText}>
              I tuoi giocatori abituali sono il modo più semplice e gratuito per far crescere il tuo circolo
              sull'app. Condividi il link o dai loro il codice qui sotto.
            </Text>
          </View>

          {error ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Riprova" onPress={() => { setIsLoading(true); fetchInvite(); }} size="small" />
            </Card>
          ) : data ? (
            <>
              <Card style={styles.codeCard}>
                <Text style={styles.codeLabel}>Il tuo codice invito</Text>
                <Text style={styles.codeValue}>{data.referral_code}</Text>
                <Text style={styles.codeHint}>
                  I giocatori possono inserirlo in fase di iscrizione, anche se non aprono il link direttamente.
                </Text>
              </Card>

              <Card style={styles.statCard}>
                <View style={styles.statRow}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="people-outline" size={22} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statNumber}>{data.referred_players_count}</Text>
                    <Text style={styles.statLabel}>
                      {data.referred_players_count === 1
                        ? 'giocatore iscritto tramite il tuo invito'
                        : 'giocatori iscritti tramite il tuo invito'}
                    </Text>
                  </View>
                </View>
              </Card>

              <Button
                title="Condividi invito"
                onPress={handleShare}
                variant="gradient"
                size="large"
                fullWidth
                icon={<Ionicons name="share-social-outline" size={20} color={COLORS.background} />}
                style={styles.shareButton}
              />

              <Text style={styles.tip}>
                Suggerimento: funziona bene su WhatsApp, nel gruppo del circolo o nella bacheca in reception.
              </Text>

              {/* Broadcast: premium perk to message everyone who already follows the club */}
              {data.is_premium ? (
                <Card style={styles.broadcastCard}>
                  <View style={styles.broadcastHeader}>
                    <Ionicons name="chatbox-ellipses-outline" size={20} color={COLORS.secondary} />
                    <Text style={styles.broadcastTitle}>Messaggio ai tuoi giocatori</Text>
                  </View>
                  <Text style={styles.broadcastSubtitle}>
                    Invia un annuncio a {data.followers_count} {data.followers_count === 1 ? 'giocatore che segue' : 'giocatori che seguono'} il circolo.
                  </Text>

                  {broadcastFeedback ? (
                    <Text style={[
                      styles.broadcastFeedback,
                      { color: broadcastFeedback.type === 'success' ? COLORS.success : COLORS.error },
                    ]}>
                      {broadcastFeedback.text}
                    </Text>
                  ) : null}

                  <Input
                    label="Titolo"
                    placeholder="Es. Campi liberi stasera!"
                    value={broadcastTitle}
                    onChangeText={setBroadcastTitle}
                    maxLength={80}
                  />
                  <Input
                    label="Messaggio"
                    placeholder="Scrivi il tuo annuncio..."
                    value={broadcastMessage}
                    onChangeText={setBroadcastMessage}
                    multiline
                    maxLength={500}
                  />
                  <Button
                    title="Invia messaggio"
                    onPress={handleSendBroadcast}
                    loading={isSendingBroadcast}
                    variant="secondary"
                    fullWidth
                  />
                  <Text style={styles.broadcastHint}>Puoi inviare al massimo un messaggio ogni 24 ore.</Text>
                </Card>
              ) : (
                <Card style={styles.upsellCard}>
                  <Ionicons name="star-outline" size={22} color={COLORS.accent} />
                  <Text style={styles.upsellTitle}>Vuoi scrivere direttamente ai tuoi giocatori?</Text>
                  <Text style={styles.upsellText}>
                    Con Premium puoi inviare un messaggio broadcast a tutti i giocatori che seguono il tuo circolo
                    (es. "campi liberi stasera") e comparire in evidenza nella ricerca.
                  </Text>
                  <Button
                    title="Scopri Premium"
                    onPress={() => router.push('/club/subscription')}
                    variant="outline"
                    size="small"
                  />
                </Card>
              )}
            </>
          ) : null}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  introBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  errorCard: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  codeCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  statCard: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  shareButton: {
    marginBottom: 16,
  },
  tip: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  broadcastCard: {
    marginTop: 20,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  broadcastSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  broadcastFeedback: {
    fontSize: 13,
    marginBottom: 8,
  },
  broadcastHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  upsellCard: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  upsellTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  upsellText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
});
