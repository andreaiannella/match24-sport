// ============================================================================
// SUBSCRIPTION MODULE - IAP SERVICE
// ============================================================================
// Service layer for expo-iap interactions
// Handles all native store communication
// ============================================================================

import { Platform } from 'react-native';
import { apiClient } from '../../api/client';
import { 
  ParsedProduct, 
  PurchaseResult, 
  RestoreResult, 
  ACTIVE_SUBSCRIPTION_SKUS,
  PRODUCT_IDS,
  DiagnosticState,
  initialDiagnosticState,
} from './types';
import { parseProducts, parseProductsWithDiagnostic } from './parser';

// ============================================================================
// STATIC IMPORT - CRITICAL FOR CRASH PREVENTION
// ============================================================================

let ExpoIAP: any = null;
let iapLoadError: string | null = null;

// Load expo-iap at module initialization time (NOT inside hooks/effects)
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    ExpoIAP = require('expo-iap');
  }
} catch (err: any) {
  iapLoadError = err?.message || 'Failed to load expo-iap';
  ExpoIAP = null;
}

// ============================================================================
// ENVIRONMENT CHECKS
// ============================================================================

/**
 * Check if running in Expo Go
 */
export function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
}

/**
 * Check if native IAP is available
 */
export function isNativeIAPAvailable(): boolean {
  return (
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    !isExpoGo() &&
    ExpoIAP !== null
  );
}

/**
 * Get IAP load error if any
 */
export function getIAPLoadError(): string | null {
  if (iapLoadError) return iapLoadError;
  if (!ExpoIAP && (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo()) {
    return 'expo-iap module not loaded';
  }
  return null;
}

// ============================================================================
// STORE CONNECTION
// ============================================================================

let isConnected = false;

/**
 * Initialize store connection
 * @returns true if successful
 */
export async function initConnection(): Promise<boolean> {
  if (!ExpoIAP) {
    throw new Error('expo-iap not available');
  }
  
  const { initConnection: iapInitConnection } = ExpoIAP;
  
  if (typeof iapInitConnection !== 'function') {
    throw new Error('initConnection function not available');
  }
  
  try {
    const result = await iapInitConnection();
    // iOS returns undefined, Android returns boolean
    isConnected = true;
    return true;
  } catch (err: any) {
    isConnected = false;
    throw new Error(`Store connection failed: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * End store connection (cleanup)
 */
export async function endConnection(): Promise<void> {
  if (!ExpoIAP) return;
  
  try {
    const { endConnection: iapEndConnection } = ExpoIAP;
    if (typeof iapEndConnection === 'function') {
      await iapEndConnection();
    }
  } catch {
    // Ignore cleanup errors
  }
  isConnected = false;
}

/**
 * Check if store is connected
 */
export function isStoreConnected(): boolean {
  return isConnected;
}

// ============================================================================
// PRODUCT FETCHING
// ============================================================================

/**
 * Fetch products from store
 * @returns Array of parsed products
 */
export async function fetchProducts(): Promise<ParsedProduct[]> {
  console.log('[IAP-SERVICE] fetchProducts called');
  
  if (!ExpoIAP) {
    console.log('[IAP-SERVICE] ExpoIAP is null');
    throw new Error('expo-iap not available');
  }
  
  const { fetchProducts: iapFetchProducts } = ExpoIAP;
  
  if (typeof iapFetchProducts !== 'function') {
    console.log('[IAP-SERVICE] fetchProducts is not a function');
    throw new Error('fetchProducts function not available');
  }
  
  try {
    console.log('[IAP-SERVICE] Calling fetchProducts with SKUs:', [...ACTIVE_SUBSCRIPTION_SKUS]);
    
    const rawProducts = await iapFetchProducts({
      skus: [...ACTIVE_SUBSCRIPTION_SKUS],
      type: 'subs',
    });
    
    console.log('[IAP-SERVICE] Raw products received:', JSON.stringify(rawProducts, null, 2));
    
    if (!rawProducts) {
      console.log('[IAP-SERVICE] rawProducts is null/undefined');
      return [];
    }
    
    if (!Array.isArray(rawProducts)) {
      console.log('[IAP-SERVICE] rawProducts is not an array:', typeof rawProducts);
      return [];
    }
    
    console.log('[IAP-SERVICE] rawProducts count:', rawProducts.length);
    
    // Log each raw product
    rawProducts.forEach((p, i) => {
      console.log(`[IAP-SERVICE] Raw product ${i}:`, JSON.stringify(p, null, 2));
    });
    
    const parsed = parseProducts(rawProducts);
    console.log('[IAP-SERVICE] Parsed products count:', parsed.length);
    
    // Log each parsed product
    parsed.forEach((p, i) => {
      console.log(`[IAP-SERVICE] Parsed product ${i}: id=${p.productId}, price=${p.price}, isReal=${p.isRealStoreProduct}`);
    });
    
    return parsed;
  } catch (err: any) {
    console.log('[IAP-SERVICE] fetchProducts error:', err?.message || err);
    throw new Error(`Failed to fetch products: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Fetch products WITH DIAGNOSTIC - For debugging raw vs parsed
 */
export async function fetchProductsWithDiagnostic(): Promise<{
  products: ParsedProduct[];
  diagnostic: DiagnosticState;
}> {
  const diagnostic: DiagnosticState = {
    ...initialDiagnosticState,
    fetchTimestamp: new Date().toISOString(),
  };
  
  if (!ExpoIAP) {
    diagnostic.lastFetchError = 'expo-iap not available';
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
    return { products: [], diagnostic };
  }
  
  const { fetchProducts: iapFetchProducts } = ExpoIAP;
  
  if (typeof iapFetchProducts !== 'function') {
    diagnostic.lastFetchError = 'fetchProducts function not available';
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
    return { products: [], diagnostic };
  }
  
  try {
    const rawProducts = await iapFetchProducts({
      skus: [...ACTIVE_SUBSCRIPTION_SKUS],
      type: 'subs',
    });
    
    // Parse with diagnostic
    const result = parseProductsWithDiagnostic(rawProducts);
    
    return {
      products: result.products,
      diagnostic: {
        ...result.diagnostic,
        requestedSkus: [...ACTIVE_SUBSCRIPTION_SKUS],
      },
    };
    
  } catch (err: any) {
    diagnostic.lastFetchError = err?.message || 'Unknown fetch error';
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
    return { products: [], diagnostic };
  }
}

// ============================================================================
// PURCHASE
// ============================================================================

/**
 * Request subscription purchase
 * @param product - The product to purchase
 * @returns PurchaseResult
 */
export async function requestPurchase(product: ParsedProduct): Promise<PurchaseResult> {
  if (!ExpoIAP) {
    return { success: false, error: 'Store non disponibile' };
  }
  
  // expo-iap v3.4+ uses requestPurchase with specific format
  const { requestPurchase: iapRequestPurchase, finishTransaction, acknowledgePurchaseAndroid } = ExpoIAP;
  
  if (typeof iapRequestPurchase !== 'function') {
    console.error('[IAP] requestPurchase is not a function. ExpoIAP keys:', Object.keys(ExpoIAP));
    return { success: false, error: 'Funzione acquisto non disponibile' };
  }
  
  try {
    let purchaseResult: any;
    
    // Platform-specific purchase request
    // expo-iap v3.4 requires { type: 'subs', request: { apple/google: { sku, ... } } }
    if (Platform.OS === 'android') {
      // Android REQUIRES offerToken for subscriptions
      if (!product.offerToken) {
        return { 
          success: false, 
          error: 'Configurazione prodotto incompleta (offerToken mancante)',
          errorCode: 'MISSING_OFFER_TOKEN',
        };
      }
      
      // Android subscription purchase - new format
      purchaseResult = await iapRequestPurchase({
        type: 'subs',
        request: {
          google: {
            sku: product.productId,
            offerToken: product.offerToken,
          },
        },
      });
    } else {
      // iOS subscription purchase - new format with apple wrapper
      console.log('[IAP] Requesting iOS purchase for SKU:', product.productId);
      purchaseResult = await iapRequestPurchase({
        type: 'subs',
        request: {
          apple: {
            sku: product.productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      });
    }
    
    // Handle null/undefined result (user cancelled)
    if (!purchaseResult) {
      return { success: false, cancelled: true };
    }
    
    // Handle array result
    const purchase = Array.isArray(purchaseResult) ? purchaseResult[0] : purchaseResult;
    
    if (!purchase) {
      return { success: false, cancelled: true };
    }
    
    // Check for pending/deferred state
    const purchaseState = purchase?.purchaseStateAndroid || purchase?.transactionState;
    if (purchaseState === 'pending' || purchaseState === 'deferred' || purchaseState === 0) {
      return { success: true, pending: true };
    }
    
    // ANDROID: Acknowledge purchase - CRITICAL
    // If acknowledge fails, DO NOT activate entitlement
    if (Platform.OS === 'android') {
      const purchaseToken = purchase.purchaseToken;
      
      if (!purchaseToken) {
        return {
          success: false,
          error: 'Token acquisto mancante',
          errorCode: 'MISSING_PURCHASE_TOKEN',
        };
      }
      
      if (typeof acknowledgePurchaseAndroid === 'function') {
        try {
          await acknowledgePurchaseAndroid({ token: purchaseToken });
        } catch (ackErr: any) {
          // CRITICAL: Acknowledge failed - DO NOT PROCEED
          return {
            success: false,
            error: 'Errore nella conferma dell\'acquisto. L\'importo non sarà addebitato. Riprova.',
            errorCode: 'ACK_FAILED',
            needsAcknowledge: true,
          };
        }
      }
    }
    
    // Finish transaction
    if (typeof finishTransaction === 'function') {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch (finishErr: any) {
        // Non-critical, continue
        console.warn('[IAP] finishTransaction warning:', finishErr?.message);
      }
    }
    
    // Validate with backend
    const validationResult = await validatePurchaseWithBackend(
      product.productId,
      purchase
    );
    
    return validationResult;
    
  } catch (err: any) {
    const errorCode = err?.code || '';
    const errorMessage = String(err?.message || '').toLowerCase();
    
    // User cancellation
    if (
      errorCode === 'E_USER_CANCELLED' ||
      errorCode === 'E_USER_CANCELED' ||
      errorMessage.includes('cancel') ||
      errorMessage.includes('user cancelled')
    ) {
      return { success: false, cancelled: true };
    }
    
    // Item already owned - user already has an active subscription
    if (
      errorCode === 'E_ALREADY_OWNED' ||
      errorCode === 'E_ITEM_ALREADY_OWNED' ||
      errorMessage.includes('already owned') ||
      errorMessage.includes('already purchased') ||
      errorMessage.includes('item already owned')
    ) {
      return { 
        success: true, // Consider it a success - user has the subscription
        alreadyOwned: true,
        error: 'Hai già un abbonamento attivo. Vai nelle Impostazioni del tuo dispositivo per gestirlo.',
      };
    }
    
    // Deferred purchase
    if (errorMessage.includes('deferred') || errorMessage.includes('pending')) {
      return { success: true, pending: true };
    }
    
    return {
      success: false,
      error: err?.message || 'Errore durante l\'acquisto',
      errorCode,
    };
  }
}

/**
 * Validate purchase with backend
 */
async function validatePurchaseWithBackend(
  productId: string,
  purchase: any
): Promise<PurchaseResult> {
  try {
    const receipt = Platform.OS === 'ios'
      ? purchase.transactionReceipt
      : purchase.purchaseToken;
    
    const transactionId = purchase.transactionId ||
      purchase.orderId ||
      purchase.purchaseToken ||
      '';
    
    const validation = await apiClient.validateIAPPurchase({
      platform: Platform.OS as 'ios' | 'android',
      product_id: productId,
      transaction_id: transactionId,
      receipt: receipt || '',
      plan_id: 'monthly',
    });
    
    if (validation?.success) {
      return { success: true };
    } else {
      // Backend validation failed but purchase succeeded
      // User should try restore later
      return { 
        success: true,
        error: 'Acquisto completato. Se non vedi l\'abbonamento attivo, usa "Ripristina acquisti".',
      };
    }
  } catch (valErr: any) {
    // Backend error but purchase succeeded
    return {
      success: true,
      error: 'Acquisto completato. Se non vedi l\'abbonamento attivo, usa "Ripristina acquisti".',
    };
  }
}

// ============================================================================
// RESTORE PURCHASES
// ============================================================================

/**
 * Restore previous purchases
 * @returns RestoreResult
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!ExpoIAP) {
    // Fallback to backend restore
    return await restoreFromBackend();
  }
  
  const { getAvailablePurchases } = ExpoIAP;
  
  if (typeof getAvailablePurchases !== 'function') {
    return await restoreFromBackend();
  }
  
  try {
    const purchases = await getAvailablePurchases();
    
    if (!Array.isArray(purchases) || purchases.length === 0) {
      // Try backend restore
      return await restoreFromBackend();
    }
    
    // Find subscription purchase
    const subPurchase = purchases.find((p: any) => {
      const id = p?.productId || p?.id;
      return ACTIVE_SUBSCRIPTION_SKUS.includes(id as any);
    });
    
    if (subPurchase) {
      // Validate with backend
      const receipt = Platform.OS === 'ios'
        ? subPurchase.transactionReceipt
        : subPurchase.purchaseToken;
      
      const transactionId = subPurchase.transactionId ||
        subPurchase.orderId ||
        subPurchase.purchaseToken ||
        '';
      
      const validation = await apiClient.validateIAPPurchase({
        platform: Platform.OS as 'ios' | 'android',
        product_id: subPurchase.productId || subPurchase.id,
        transaction_id: transactionId,
        receipt: receipt || '',
        plan_id: 'monthly',
      });
      
      if (validation?.success) {
        return { 
          success: true, 
          restored: true, 
          message: 'Abbonamento ripristinato con successo!' 
        };
      }
    }
    
    // No valid subscription found, try backend
    return await restoreFromBackend();
    
  } catch (err: any) {
    // Try backend as last resort
    const backendResult = await restoreFromBackend();
    if (backendResult.success) {
      return backendResult;
    }
    
    return {
      success: false,
      error: 'Nessun abbonamento precedente trovato',
    };
  }
}

/**
 * Restore from backend
 */
async function restoreFromBackend(): Promise<RestoreResult> {
  try {
    const result = await apiClient.restoreIAPPurchases();
    if (result?.success) {
      return {
        success: true,
        restored: true,
        message: result.message || 'Abbonamento ripristinato!',
      };
    }
    return {
      success: false,
      message: 'Nessun abbonamento da ripristinare',
    };
  } catch {
    return {
      success: false,
      message: 'Nessun abbonamento precedente trovato',
    };
  }
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const __testExports = {
  get ExpoIAP() { return ExpoIAP; },
  get isConnected() { return isConnected; },
  setConnected: (value: boolean) => { isConnected = value; },
  resetForTesting: () => {
    isConnected = false;
  },
};
