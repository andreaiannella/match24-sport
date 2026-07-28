// ============================================================================
// SUBSCRIPTION MODULE - TYPE DEFINITIONS
// ============================================================================
// Single source of truth for all subscription-related types
// ============================================================================

/**
 * Explicit UI States - NO AMBIGUITY
 * Each state has clear meaning and UI behavior
 */
export type SubscriptionUIState =
  | 'initializing'           // App just mounted, checking platform
  | 'connecting_store'       // Calling initConnection()
  | 'fetching_products'      // Calling fetchProducts()
  | 'store_unavailable'      // Web, Expo Go, or store not accessible
  | 'no_products'            // Store connected but no products found
  | 'products_ready'         // Products loaded, ready to purchase
  | 'purchasing'             // Purchase in progress
  | 'purchase_pending'       // iOS Ask-to-Buy or deferred
  | 'restoring'              // Restore in progress
  | 'error'                  // Recoverable error state
  | 'fatal_error';           // Unrecoverable error

/**
 * Product IDs - App Store Connect / Google Play Console
 */
export const PRODUCT_IDS = {
  MONTHLY: 'com.matchsport24.subscription.monthly.v2',
  YEARLY: 'com.matchsport24.subscription.yearly.v2',
} as const;

export const ACTIVE_SUBSCRIPTION_SKUS = [PRODUCT_IDS.MONTHLY] as const;

/**
 * Diagnostic State - For debugging raw vs parsed products
 */
export interface DiagnosticState {
  requestedSkus: string[];
  rawProductsCount: number;
  rawProductIds: string[];
  parsedProductsCount: number;
  parsedProductIds: string[];
  lastFetchError: string | null;
  parserRejections: { id: string; reason: string }[];
  fetchTimestamp: string | null;
  diagnosticCase: 'NOT_FETCHED' | 'CASE_A_STORE_EMPTY' | 'CASE_B_PARSER_REJECTED' | 'CASE_C_READY';
}

export const initialDiagnosticState: DiagnosticState = {
  requestedSkus: [...ACTIVE_SUBSCRIPTION_SKUS],
  rawProductsCount: 0,
  rawProductIds: [],
  parsedProductsCount: 0,
  parsedProductIds: [],
  lastFetchError: null,
  parserRejections: [],
  fetchTimestamp: null,
  diagnosticCase: 'NOT_FETCHED',
};

/**
 * Parsed product - normalized from both iOS and Android
 */
export interface ParsedProduct {
  productId: string;
  title: string;
  description: string;
  price: string;           // Formatted price string e.g. "€49,99"
  priceValue: number;      // Numeric value e.g. 49.99
  currency: string;        // e.g. "EUR"
  offerToken?: string;     // Android only - REQUIRED for purchase
  isRealStoreProduct: true; // Flag to distinguish from static fallback
  rawProduct: unknown;     // Original store response for debugging
}

/**
 * Static fallback - NEVER used as real product
 */
export interface StaticPriceInfo {
  price: string;
  priceValue: number;
  isRealStoreProduct: false;
}

export const STATIC_FALLBACK: StaticPriceInfo = {
  price: '€49,99',
  priceValue: 49.99,
  isRealStoreProduct: false,
};

/**
 * Purchase result
 */
export interface PurchaseResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  cancelled?: boolean;
  pending?: boolean;        // iOS Ask-to-Buy
  needsAcknowledge?: boolean; // Android ack failed
  alreadyOwned?: boolean;   // User already has an active subscription
}

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean;
  restored?: boolean;
  message?: string;
  error?: string;
}

/**
 * Main subscription state
 */
export interface SubscriptionState {
  // Core state
  uiState: SubscriptionUIState;
  
  // Products
  products: ParsedProduct[];
  hasRealProduct: boolean;
  
  // Purchase state
  isPurchasing: boolean;
  isRestoring: boolean;
  
  // Error tracking
  errorMessage: string | null;
  errorCode: string | null;
  
  // Debug info (dev only)
  debugInfo: string;
  lastAction: string;
}

/**
 * State machine actions
 */
export type SubscriptionAction =
  | { type: 'INIT_START' }
  | { type: 'INIT_PLATFORM_CHECK'; payload: { isNative: boolean; isExpoGo: boolean } }
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS' }
  | { type: 'CONNECT_FAILURE'; payload: { error: string; code?: string } }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { products: ParsedProduct[] } }
  | { type: 'FETCH_EMPTY' }
  | { type: 'FETCH_FAILURE'; payload: { error: string; code?: string } }
  | { type: 'PURCHASE_START' }
  | { type: 'PURCHASE_SUCCESS' }
  | { type: 'PURCHASE_PENDING' }
  | { type: 'PURCHASE_CANCELLED' }
  | { type: 'PURCHASE_FAILURE'; payload: { error: string; code?: string } }
  | { type: 'PURCHASE_ACK_FAILED'; payload: { error: string } }
  | { type: 'RESTORE_START' }
  | { type: 'RESTORE_SUCCESS'; payload: { message?: string } }
  | { type: 'RESTORE_FAILURE'; payload: { error: string } }
  | { type: 'RETRY' }
  | { type: 'RESET' };

/**
 * UI behavior for each state
 */
export interface UIBehavior {
  showLoading: boolean;
  showPrice: boolean;
  showRealPrice: boolean;      // vs static fallback
  showError: boolean;
  showRetryButton: boolean;
  showSubscribeButton: boolean;
  subscribeButtonEnabled: boolean;
  subscribeButtonLabel: string;
  statusMessage: string;
}

/**
 * Get UI behavior for a given state
 */
export function getUIBehavior(state: SubscriptionState): UIBehavior {
  const { uiState, hasRealProduct, products } = state;
  
  switch (uiState) {
    case 'initializing':
    case 'connecting_store':
    case 'fetching_products':
      return {
        showLoading: true,
        showPrice: false,
        showRealPrice: false,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Caricamento...',
        statusMessage: 'Connessione allo store in corso...',
      };
      
    case 'store_unavailable':
      return {
        showLoading: false,
        showPrice: false,
        showRealPrice: false,
        showError: true,
        showRetryButton: false,
        showSubscribeButton: false,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Non disponibile',
        statusMessage: 'Abbonamento non disponibile su questa piattaforma',
      };
      
    case 'no_products':
      return {
        showLoading: false,
        showPrice: false,
        showRealPrice: false,
        showError: true,
        showRetryButton: true,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Prodotto non disponibile',
        statusMessage: 'Il prodotto non è stato trovato nello store. Riprova più tardi.',
      };
      
    case 'products_ready':
      return {
        showLoading: false,
        showPrice: true,
        showRealPrice: hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: true,
        subscribeButtonLabel: 'Abbonati ora',
        statusMessage: products[0]?.price || '',
      };
      
    case 'purchasing':
      return {
        showLoading: true,
        showPrice: true,
        showRealPrice: hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Acquisto in corso...',
        statusMessage: 'Elaborazione acquisto...',
      };
      
    case 'purchase_pending':
      return {
        showLoading: false,
        showPrice: true,
        showRealPrice: hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'In attesa di approvazione',
        statusMessage: 'Acquisto in attesa di approvazione (Ask to Buy)',
      };
      
    case 'restoring':
      return {
        showLoading: true,
        showPrice: true,
        showRealPrice: hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Ripristino in corso...',
        statusMessage: 'Ripristino acquisti precedenti...',
      };
      
    case 'error':
      return {
        showLoading: false,
        showPrice: false,
        showRealPrice: false,
        showError: true,
        showRetryButton: true,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Errore',
        statusMessage: state.errorMessage || 'Si è verificato un errore',
      };
      
    case 'fatal_error':
      return {
        showLoading: false,
        showPrice: false,
        showRealPrice: false,
        showError: true,
        showRetryButton: false,
        showSubscribeButton: false,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Non disponibile',
        statusMessage: state.errorMessage || 'Errore critico. Riavvia l\'app.',
      };
      
    default:
      return {
        showLoading: false,
        showPrice: false,
        showRealPrice: false,
        showError: true,
        showRetryButton: true,
        showSubscribeButton: false,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Errore',
        statusMessage: 'Stato sconosciuto',
      };
  }
}
