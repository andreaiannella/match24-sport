// Club Subscription Screen - PRODUCTION-GRADE Apple/Google Compliant
// ============================================================================
// CRITICAL: Production-safe IAP implementation for iOS App Store and Google Play
// - Never crashes on "Abbonati ora" button
// - Handles all edge cases gracefully
// - Shows static pricing when store products unavailable
// - Full Apple Guideline compliance (EULA, Privacy, auto-renewal disclosure)
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, GradientBackground } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { format, parseISO } from 'date-fns';
import { 
  useSubscription, 
  PRODUCT_IDS, 
  ParsedProduct 
} from '../../src/hooks/useSubscription';
import { successHaptic, errorHaptic } from '../../src/utils/haptics';

// Check if we're on native platform
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

// ============================================================================
// LEGAL URLs - CRITICAL FOR APPLE COMPLIANCE
// ============================================================================

const LEGAL_URLS = {
  PRIVACY_POLICY: 'https://matchsport24.com/privacy',
  TERMS_OF_USE: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
};

// ============================================================================
// STATIC PRICING - Fallback when store products unavailable
// MUST match App Store Connect / Google Play Console exactly
// ============================================================================

const STATIC_PRICING = {
  PRICE: '€49,99',
  PRICE_VALUE: 49.99,
  PERIOD: '/mese',
  NAME: 'Abbonamento Mensile',
  DESCRIPTION: 'Accesso completo alla piattaforma',
};

// Screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClubSubscriptionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.session_id ? String(params.session_id) : '';
  const { t } = useLanguage();

  // Local state
  const [club, setClub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoType, setPromoType] = useState<string | null>(null);
  const [promoValue, setPromoValue] = useState(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Prevent double-tap
  const purchaseInProgressRef = useRef(false);
  
  // Restore purchases state
  const [isRestoring, setIsRestoring] = useState(false);

  // IAP Hook - SIMPLIFIED INTERFACE
  const {
    status: iapStatus,
    isLoading: iapLoading,
    isReady: iapReady,
    isPurchasing,
    canPurchase,
    hasRealProduct,
    products: iapProducts,
    debugInfo,
    errorMessage: iapError,
    diagnostic,
    purchaseSubscription,
    restorePurchases,
    refreshProducts,
  } = useSubscription();

  // DEBUG LOGGING - Remove after debugging
  // useEffect(() => {
  //   console.log('[SUBSCRIPTION-SCREEN] Hook state changed:');
  //   console.log('  - iapStatus:', iapStatus);
  //   console.log('  - diagnostic:', JSON.stringify(diagnostic, null, 2));
  // }, [iapStatus, diagnostic]);

  // ========== DERIVED STATE ==========

  const isNativeMode = isNativePlatform;
  
  // Get display price - prefer store price, fallback to static
  const getDisplayPrice = useCallback((): string => {
    try {
      if (iapProducts && iapProducts.length > 0) {
        const product = iapProducts.find(
          (p: ParsedProduct) => p.productId === PRODUCT_IDS.MONTHLY
        );
        if (product?.price) {
          return product.price;
        }
      }
    } catch {
      // Ignore errors
    }
    return STATIC_PRICING.PRICE;
  }, [iapProducts]);

  // Determine if purchase button should be disabled
  const isPurchaseDisabled = useCallback((): boolean => {
    // Always disabled during processing
    if (isProcessing || isPurchasing || purchaseInProgressRef.current) {
      return true;
    }
    
    // For native IAP:
    if (isNativeMode) {
      // Disabled if still loading
      if (iapLoading) {
        return true;
      }
      
      // CRITICAL: Disabled if no real product loaded from store
      // This prevents the button from being clickable when store fetch failed
      if (!hasRealProduct) {
        return true;
      }
      
      // Disabled if canPurchase is false (combines hasRealProduct + isReady + !isPurchasing)
      if (!canPurchase) {
        return true;
      }
    }
    
    return false;
  }, [isProcessing, isPurchasing, isNativeMode, iapLoading, hasRealProduct, canPurchase]);

  // Get button label
  const getButtonLabel = useCallback((): string => {
    // Se l'utente è già premium, non mostrare il pulsante (gestione da Apple)
    if (club?.subscription_status === 'active') {
      return ''; // Pulsante nascosto
    }
    if (promoApplied && promoType === 'trial_months') {
      return `Attiva prova ${promoValue} mesi`;
    }
    return 'Abbonati ora';
  }, [club?.subscription_status, promoApplied, promoType, promoValue]);

  // Check if should show subscribe button
  const shouldShowSubscribeButton = useCallback((): boolean => {
    // Non mostrare il pulsante se l'utente è già premium
    if (club?.subscription_status === 'active') {
      return false;
    }
    return true;
  }, [club?.subscription_status]);

  // ========== DATA FETCHING ==========

  const fetchClub = useCallback(async () => {
    try {
      const data = await apiClient.getMyClub();
      setClub(data);
    } catch (error) {
      // Silent fail - user may not have a club yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check Stripe payment status (web only)
  const checkPaymentStatus = useCallback(async (stripeSessionId: string) => {
    if (!stripeSessionId) return;

    setIsProcessing(true);
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      try {
        const status = await apiClient.getSubscriptionStatus(stripeSessionId);
        if (status.payment_status === 'paid') {
          Alert.alert('Successo', 'Abbonamento attivato con successo!');
          await fetchClub();
          setIsProcessing(false);
          if (Platform.OS === 'web') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          return;
        }
        if (status.status === 'expired') {
          setIsProcessing(false);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsProcessing(false);
        }
      } catch (error) {
        setIsProcessing(false);
      }
    };

    poll();
  }, [fetchClub]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [sessionId, checkPaymentStatus]);

  // ========== PROMO CODE HANDLERS ==========

  const validatePromoCode = useCallback(async () => {
    if (!promoCode.trim()) {
      Alert.alert('Errore', 'Inserisci un codice promozionale');
      return;
    }

    setIsValidatingPromo(true);
    try {
      const response = await apiClient.validatePromoCode(promoCode.trim().toUpperCase());
      if (response.valid) {
        setPromoApplied(true);
        setPromoDiscount(response.discount || 0);
        setPromoType(response.type || 'percentage');
        setPromoValue(response.value || 0);
        Alert.alert('Successo', response.message);
      } else {
        Alert.alert('Errore', response.message || 'Codice non valido');
      }
    } catch (error) {
      Alert.alert('Errore', 'Codice promozionale non valido');
    } finally {
      setIsValidatingPromo(false);
    }
  }, [promoCode]);

  const removePromoCode = useCallback(() => {
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoType(null);
    setPromoValue(0);
  }, []);

  // ========== NATIVE IAP PURCHASE HANDLER ==========

  const handleIAPPurchase = useCallback(async () => {
    // CRITICAL: Prevent double-tap
    if (purchaseInProgressRef.current || isPurchasing || isProcessing) {
      return;
    }

    // Check if IAP is still loading
    if (iapLoading) {
      Alert.alert(
        'Caricamento in corso',
        'Stiamo caricando le informazioni dell\'abbonamento. Attendi qualche secondo e riprova.',
        [
          { text: 'Riprova', onPress: () => refreshProducts() },
          { text: 'OK' }
        ]
      );
      return;
    }

    // Check for products
    if (!iapProducts || iapProducts.length === 0 || !hasRealProduct) {
      Alert.alert(
        'Prodotto non disponibile',
        iapError || 'Il prodotto non è stato caricato dallo store. Verifica la connessione e riprova.',
        [
          { text: 'Riprova', onPress: () => refreshProducts() },
          { text: 'Chiudi' }
        ]
      );
      return;
    }

    // Find the target product
    const targetProduct = iapProducts.find(
      (p: ParsedProduct) => p.productId === PRODUCT_IDS.MONTHLY
    );

    if (!targetProduct) {
      Alert.alert('Errore', 'Prodotto non trovato');
      return;
    }

    // For Android, verify we have offerToken
    if (Platform.OS === 'android' && !targetProduct.offerToken) {
      Alert.alert(
        'Configurazione',
        'Configurazione acquisti incompleta. Contatta il supporto.',
        [{ text: 'OK' }]
      );
      return;
    }

    // ========== EXECUTE PURCHASE ==========
    purchaseInProgressRef.current = true;
    setIsProcessing(true);

    try {
      const result = await purchaseSubscription(PRODUCT_IDS.MONTHLY);

      // Handle cancellation
      if (result.cancelled) {
        purchaseInProgressRef.current = false;
        setIsProcessing(false);
        return;
      }

      // Handle failure
      if (!result.success) {
        errorHaptic();
        Alert.alert(
          'Attenzione',
          result.error || 'Acquisto non completato. Riprova.',
          [{ text: 'OK' }]
        );
        purchaseInProgressRef.current = false;
        setIsProcessing(false);
        return;
      }

      // Success!
      successHaptic();
      Alert.alert(
        'Successo!',
        'Abbonamento attivato con successo!',
        [{ text: 'OK', onPress: () => fetchClub() }]
      );
      await fetchClub();

    } catch (error: any) {
      errorHaptic();
      Alert.alert(
        'Errore',
        'Si è verificato un problema. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    } finally {
      purchaseInProgressRef.current = false;
      setIsProcessing(false);
    }
  }, [
    isPurchasing,
    isProcessing,
    iapLoading,
    hasRealProduct,
    iapProducts,
    iapError,
    purchaseSubscription,
    refreshProducts,
    fetchClub,
  ]);

  // ========== STRIPE CHECKOUT (WEB) ==========

  const handleStripeCheckout = useCallback(async () => {
    setIsProcessing(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                         'https://padel-finder-app.preview.emergentagent.com';
      const originUrl = Platform.OS === 'web'
        ? window.location.origin
        : backendUrl;

      const result = await apiClient.createSubscriptionCheckout('monthly', originUrl);

      if (result.url) {
        if (Platform.OS === 'web') {
          window.location.href = result.url;
        } else {
          await Linking.openURL(result.url);
        }
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile avviare il pagamento');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ========== RESTORE PURCHASES ==========

  const handleRestorePurchases = useCallback(async () => {
    if (isRestoring) return;
    
    setIsRestoring(true);
    try {
      const result = await restorePurchases();

      if (result.success) {
        successHaptic();
        Alert.alert('Successo!', result.message || 'Abbonamento ripristinato!');
        await fetchClub();
      } else {
        Alert.alert('Info', result.message || 'Nessun abbonamento da ripristinare');
      }
    } catch (error) {
      Alert.alert('Info', 'Nessun abbonamento precedente trovato');
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases, fetchClub, isRestoring]);

  // ========== MAIN SUBSCRIBE HANDLER ==========

  const handleSubscribe = useCallback(async () => {
    // Handle trial promo
    if (promoApplied && promoType === 'trial_months') {
      setIsProcessing(true);
      try {
        const result = await apiClient.applyTrialPromo(promoCode.trim().toUpperCase());
        if (result.success) {
          Alert.alert('Successo', result.message);
          await fetchClub();
          removePromoCode();
        }
      } catch (error) {
        Alert.alert('Errore', 'Impossibile attivare la prova');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Native IAP or Stripe
    if (isNativeMode) {
      await handleIAPPurchase();
    } else {
      await handleStripeCheckout();
    }
  }, [
    promoApplied,
    promoType,
    promoCode,
    isNativeMode,
    handleIAPPurchase,
    handleStripeCheckout,
    fetchClub,
    removePromoCode,
  ]);

  // ========== LEGAL URL HANDLERS ==========

  const openPrivacyPolicy = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(LEGAL_URLS.PRIVACY_POLICY);
      if (canOpen) {
        await Linking.openURL(LEGAL_URLS.PRIVACY_POLICY);
      } else {
        Alert.alert('Privacy Policy', `Visita: ${LEGAL_URLS.PRIVACY_POLICY}`);
      }
    } catch (e) {
      Alert.alert('Privacy Policy', `Visita: ${LEGAL_URLS.PRIVACY_POLICY}`);
    }
  }, []);

  const openTermsOfUse = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(LEGAL_URLS.TERMS_OF_USE);
      if (canOpen) {
        await Linking.openURL(LEGAL_URLS.TERMS_OF_USE);
      } else {
        Alert.alert('Termini di Utilizzo', `Visita: ${LEGAL_URLS.TERMS_OF_USE}`);
      }
    } catch (e) {
      Alert.alert('Termini di Utilizzo', `Visita: ${LEGAL_URLS.TERMS_OF_USE}`);
    }
  }, []);

  // ========== HELPERS ==========

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'trial': return COLORS.warning;
      case 'expired': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo';
      case 'trial': return 'Prova';
      case 'expired': return 'Scaduto';
      default: return status;
    }
  };

  const getPaymentMethodLabel = () => {
    if (isNativeMode) {
      return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
    }
    return 'Stripe';
  };

  // Button states
  const isButtonLoading = isProcessing || isPurchasing || (isNativeMode && iapLoading);
  const buttonDisabled = isPurchaseDisabled();
  const displayPrice = getDisplayPrice();

  // ========== RENDER ==========

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Caricamento..." />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abbonamento</Text>
          <View style={styles.headerSpacer} />
        </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        {club && (
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Stato attuale</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(club.subscription_status) + '20' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(club.subscription_status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(club.subscription_status) },
                  ]}
                >
                  {getStatusLabel(club.subscription_status)}
                </Text>
              </View>
            </View>
            {club.subscription_expires_at && (
              <Text style={styles.expiresText}>
                {club.subscription_status === 'active' ? 'Scade il' : 'Scaduto il'}:{' '}
                {format(parseISO(club.subscription_expires_at), 'dd/MM/yyyy')}
              </Text>
            )}
          </Card>
        )}

        {/* Plan Selection */}
        <Text style={styles.sectionTitle}>Piano Premium</Text>

        {/* Product Loading or No Product State - Clean Production UI */}
        {isNativeMode && !hasRealProduct && !iapLoading && (
          <Card style={[styles.statusCard, { 
            backgroundColor: COLORS.warning + '15', 
            borderColor: COLORS.warning,
            borderWidth: 1,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="information-circle" size={24} color={COLORS.warning} />
              <Text style={[styles.statusLabel, { color: COLORS.warning, marginLeft: 8, marginBottom: 0, fontWeight: '600' }]}>
                Prodotto temporaneamente non disponibile
              </Text>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Stiamo configurando l'abbonamento. Riprova tra qualche istante.
            </Text>
            <TouchableOpacity 
              style={{ 
                marginTop: 12, 
                backgroundColor: COLORS.primary, 
                paddingVertical: 12, 
                paddingHorizontal: 20, 
                borderRadius: 10,
                alignSelf: 'flex-start',
              }}
              onPress={refreshProducts}
            >
              <Text style={{ color: COLORS.background, fontWeight: '600' }}>Riprova</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Plan Card - ONLY show when product is available OR on web */}
        {(!isNativeMode || hasRealProduct || iapLoading) && (
        <>
        <TouchableOpacity activeOpacity={0.7}>
          <Card style={[styles.planCard, styles.planCardSelected]}>
            <View style={styles.planHeader}>
              <View style={[styles.radioOuter, styles.radioOuterSelected]}>
                <View style={styles.radioInner} />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{STATIC_PRICING.NAME}</Text>
                <Text style={styles.planDescription}>
                  {STATIC_PRICING.DESCRIPTION}
                </Text>
              </View>
              <View style={styles.planPrice}>
                <Text style={styles.priceValue}>{displayPrice}</Text>
                <Text style={styles.pricePeriod}>{STATIC_PRICING.PERIOD}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* APPLE COMPLIANCE: Subscription Details */}
        <Card style={styles.subscriptionInfoCard}>
          <Text style={styles.subscriptionInfoTitle}>Dettagli Abbonamento</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{STATIC_PRICING.NAME}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durata:</Text>
            <Text style={styles.infoValue}>1 mese</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prezzo:</Text>
            <Text style={styles.infoValue}>{displayPrice}</Text>
          </View>

          <View style={styles.autoRenewContainer}>
            <Ionicons name="refresh-circle" size={20} color={COLORS.warning} />
            <Text style={styles.autoRenewText}>
              L'abbonamento si rinnova automaticamente ogni mese. Puoi annullarlo
              in qualsiasi momento dalle impostazioni del tuo account{' '}
              {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.
            </Text>
          </View>

          {/* Legal links in card */}
          <View style={styles.legalLinksInCard}>
            <TouchableOpacity onPress={openPrivacyPolicy} style={styles.legalLinkButton}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
              <Text style={styles.legalLinkButtonText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity onPress={openTermsOfUse} style={styles.legalLinkButton}>
              <Ionicons name="document-text" size={18} color={COLORS.accent} />
              <Text style={styles.legalLinkButtonText}>Termini di Utilizzo (EULA)</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </Card>
        </>
        )}

        {/* Promo Code (Web only) */}
        {!isNativeMode && (
          <Card style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.accent} />
              <Text style={styles.promoTitle}>Codice Promozionale</Text>
            </View>
            {promoApplied ? (
              <View style={styles.promoAppliedContainer}>
                <View style={styles.promoAppliedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.promoAppliedText}>
                    {promoType === 'trial_months'
                      ? `${promoValue} mesi di prova gratuita`
                      : `Sconto ${promoDiscount}% applicato`}
                  </Text>
                </View>
                <TouchableOpacity onPress={removePromoCode} style={styles.removePromoButton}>
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promoInputContainer}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Inserisci codice"
                  placeholderTextColor={COLORS.textMuted}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.promoButton}
                  onPress={validatePromoCode}
                  disabled={isValidatingPromo}
                >
                  {isValidatingPromo ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Text style={styles.promoButtonText}>Applica</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* Features List */}
        <Card style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Cosa include Premium:</Text>
          {[
            'Circolo in evidenza nella ricerca e nella mappa',
            'Messaggi broadcast ai giocatori che ti seguono',
            'Badge circolo verificato',
            'Supporto prioritario',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          <Text style={styles.featuresFootnote}>
            Profilo, gestione campi, partite illimitate e dashboard sono e restano gratuiti per tutti i circoli.
          </Text>
        </Card>

        {/* PROMINENT Legal Card - Apple compliance */}
        <Card style={styles.legalCard}>
          <Text style={styles.legalCardTitle}>Termini e Condizioni</Text>
          <Text style={styles.legalCardDescription}>
            Proseguendo con l'abbonamento accetti i seguenti termini:
          </Text>

          <TouchableOpacity
            onPress={openPrivacyPolicy}
            style={styles.prominentLegalLink}
            activeOpacity={0.7}
          >
            <View style={styles.prominentLegalLinkContent}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.accent} />
              <View style={styles.prominentLegalLinkText}>
                <Text style={styles.prominentLegalLinkTitle}>Privacy Policy</Text>
                <Text style={styles.prominentLegalLinkUrl}>matchsport24.com/privacy</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openTermsOfUse}
            style={styles.prominentLegalLink}
            activeOpacity={0.7}
          >
            <View style={styles.prominentLegalLinkContent}>
              <Ionicons name="document-text" size={24} color={COLORS.accent} />
              <View style={styles.prominentLegalLinkText}>
                <Text style={styles.prominentLegalLinkTitle}>Termini di Utilizzo (EULA)</Text>
                <Text style={styles.prominentLegalLinkUrl}>Apple Standard EULA</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </Card>

        {/* Subscribe Button - Hidden if already premium */}
        {shouldShowSubscribeButton() && (
          <Button
            title={getButtonLabel()}
            onPress={handleSubscribe}
            loading={isButtonLoading}
            disabled={buttonDisabled}
            fullWidth
            size="large"
            style={styles.subscribeButton}
          />
        )}

        {/* Premium Active Message - Shown when user is already subscribed */}
        {club?.subscription_status === 'active' && (
          <Card style={[styles.statusCard, { 
            backgroundColor: COLORS.success + '15', 
            borderColor: COLORS.success,
            borderWidth: 1,
            marginBottom: 16,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={[styles.statusLabel, { color: COLORS.success, marginLeft: 8, marginBottom: 0, fontWeight: '600' }]}>
                Abbonamento Attivo
              </Text>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Il tuo abbonamento è attivo. Per gestire o annullare l'abbonamento, vai nelle Impostazioni del tuo dispositivo {'>'} ID Apple {'>'} Abbonamenti.
            </Text>
          </Card>
        )}

        {/* Restore Purchases (Mobile only) */}
        {isNativeMode && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
          >
            <Text style={styles.restoreButtonText}>
              {isRestoring ? 'Ripristino in corso...' : 'Ripristina acquisti'}
            </Text>
          </TouchableOpacity>
        )}

        {/* APPLE COMPLIANCE: Legal Footer */}
        <View style={styles.legalSection}>
          <Text style={styles.legalDisclaimer}>
            Pagamento sicuro tramite {getPaymentMethodLabel()}.{'\n'}
            L'abbonamento si rinnova automaticamente ogni mese al prezzo di{' '}
            {displayPrice}.{'\n'}
            Puoi annullare il rinnovo in qualsiasi momento dalle impostazioni del
            tuo account.
          </Text>

          <View style={styles.legalFooterLinks}>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={styles.legalFooterLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>|</Text>
            <TouchableOpacity onPress={openTermsOfUse}>
              <Text style={styles.legalFooterLinkText}>Termini di Utilizzo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  // Status
  statusCard: {
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expiresText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  // Plan card
  planCard: {
    marginBottom: 12,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: COLORS.secondary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  pricePeriod: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Subscription info
  subscriptionInfoCard: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  subscriptionInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  autoRenewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.warning + '15',
    borderRadius: 8,
  },
  autoRenewText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
    lineHeight: 18,
  },
  legalLinksInCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  legalLinkButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.accent,
    marginLeft: 10,
    fontWeight: '500',
  },
  // Promo
  promoCard: {
    marginBottom: 16,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  promoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  promoButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 4,
    marginVertical: 4,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  promoAppliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promoAppliedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 8,
  },
  removePromoButton: {
    padding: 4,
  },
  // Features
  featuresCard: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  featuresFootnote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  // Legal card
  legalCard: {
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  legalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  legalCardDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  prominentLegalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginBottom: 10,
  },
  prominentLegalLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prominentLegalLinkText: {
    marginLeft: 12,
    flex: 1,
  },
  prominentLegalLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prominentLegalLinkUrl: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Buttons
  subscribeButton: {
    marginBottom: 12,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  // Legal section
  legalSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legalDisclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  legalFooterLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalFooterLinkText: {
    fontSize: 12,
    color: COLORS.accent,
    textDecorationLine: 'underline',
    paddingHorizontal: 8,
  },
  legalSeparator: {
    color: COLORS.textMuted,
  },
});
