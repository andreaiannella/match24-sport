// ============================================================================
// SUBSCRIPTION MODULE - STATE REDUCER
// ============================================================================
// Pure reducer function for predictable state transitions
// ============================================================================

import {
  SubscriptionState,
  SubscriptionAction,
  SubscriptionUIState,
  ParsedProduct,
} from './types';

/**
 * Initial state
 */
export const initialSubscriptionState: SubscriptionState = {
  uiState: 'initializing',
  products: [],
  hasRealProduct: false,
  isPurchasing: false,
  isRestoring: false,
  errorMessage: null,
  errorCode: null,
  debugInfo: 'Not initialized',
  lastAction: 'NONE',
};

/**
 * State reducer - pure function for predictable state transitions
 */
export function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction
): SubscriptionState {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const debugPrefix = `[${timestamp}] ${action.type}`;
  
  switch (action.type) {
    case 'INIT_START':
      return {
        ...state,
        uiState: 'initializing',
        debugInfo: `${debugPrefix}: Starting initialization`,
        lastAction: action.type,
      };
      
    case 'INIT_PLATFORM_CHECK':
      const { isNative, isExpoGo } = action.payload;
      if (!isNative || isExpoGo) {
        return {
          ...state,
          uiState: 'store_unavailable',
          errorMessage: isExpoGo 
            ? 'IAP non disponibile in Expo Go' 
            : 'IAP disponibile solo su iOS/Android',
          debugInfo: `${debugPrefix}: Platform not supported (native=${isNative}, expoGo=${isExpoGo})`,
          lastAction: action.type,
        };
      }
      return {
        ...state,
        uiState: 'connecting_store',
        debugInfo: `${debugPrefix}: Platform OK, connecting to store`,
        lastAction: action.type,
      };
      
    case 'CONNECT_START':
      return {
        ...state,
        uiState: 'connecting_store',
        debugInfo: `${debugPrefix}: Connecting to store`,
        lastAction: action.type,
      };
      
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        uiState: 'fetching_products',
        debugInfo: `${debugPrefix}: Store connected, fetching products`,
        lastAction: action.type,
      };
      
    case 'CONNECT_FAILURE':
      return {
        ...state,
        uiState: 'error',
        errorMessage: action.payload.error,
        errorCode: action.payload.code || null,
        debugInfo: `${debugPrefix}: Connection failed - ${action.payload.error}`,
        lastAction: action.type,
      };
      
    case 'FETCH_START':
      return {
        ...state,
        uiState: 'fetching_products',
        debugInfo: `${debugPrefix}: Fetching products`,
        lastAction: action.type,
      };
      
    case 'FETCH_SUCCESS':
      const products = action.payload.products;
      const hasRealProduct = products.length > 0 && products.some(p => p.isRealStoreProduct);
      return {
        ...state,
        uiState: hasRealProduct ? 'products_ready' : 'no_products',
        products,
        hasRealProduct,
        errorMessage: hasRealProduct ? null : 'Nessun prodotto trovato nello store',
        debugInfo: `${debugPrefix}: Fetched ${products.length} products, hasReal=${hasRealProduct}`,
        lastAction: action.type,
      };
      
    case 'FETCH_EMPTY':
      return {
        ...state,
        uiState: 'no_products',
        products: [],
        hasRealProduct: false,
        errorMessage: 'Il prodotto non è disponibile nello store',
        debugInfo: `${debugPrefix}: Store returned empty products`,
        lastAction: action.type,
      };
      
    case 'FETCH_FAILURE':
      return {
        ...state,
        uiState: 'error',
        errorMessage: action.payload.error,
        errorCode: action.payload.code || null,
        debugInfo: `${debugPrefix}: Fetch failed - ${action.payload.error}`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_START':
      return {
        ...state,
        uiState: 'purchasing',
        isPurchasing: true,
        errorMessage: null,
        debugInfo: `${debugPrefix}: Purchase started`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_SUCCESS':
      return {
        ...state,
        uiState: 'products_ready',
        isPurchasing: false,
        debugInfo: `${debugPrefix}: Purchase successful`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_PENDING':
      return {
        ...state,
        uiState: 'purchase_pending',
        isPurchasing: false,
        debugInfo: `${debugPrefix}: Purchase pending (Ask to Buy)`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_CANCELLED':
      return {
        ...state,
        uiState: state.hasRealProduct ? 'products_ready' : 'no_products',
        isPurchasing: false,
        debugInfo: `${debugPrefix}: Purchase cancelled by user`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_FAILURE':
      return {
        ...state,
        uiState: 'error',
        isPurchasing: false,
        errorMessage: action.payload.error,
        errorCode: action.payload.code || null,
        debugInfo: `${debugPrefix}: Purchase failed - ${action.payload.error}`,
        lastAction: action.type,
      };
      
    case 'PURCHASE_ACK_FAILED':
      // CRITICAL: Android acknowledge failed - DO NOT activate entitlement
      return {
        ...state,
        uiState: 'error',
        isPurchasing: false,
        errorMessage: 'Errore nella finalizzazione dell\'acquisto. Contatta il supporto o riprova.',
        errorCode: 'ACK_FAILED',
        debugInfo: `${debugPrefix}: CRITICAL - Android acknowledge failed - ${action.payload.error}`,
        lastAction: action.type,
      };
      
    case 'RESTORE_START':
      return {
        ...state,
        uiState: 'restoring',
        isRestoring: true,
        errorMessage: null,
        debugInfo: `${debugPrefix}: Restore started`,
        lastAction: action.type,
      };
      
    case 'RESTORE_SUCCESS':
      return {
        ...state,
        uiState: state.hasRealProduct ? 'products_ready' : 'no_products',
        isRestoring: false,
        debugInfo: `${debugPrefix}: Restore successful - ${action.payload.message || ''}`,
        lastAction: action.type,
      };
      
    case 'RESTORE_FAILURE':
      return {
        ...state,
        uiState: state.hasRealProduct ? 'products_ready' : 'error',
        isRestoring: false,
        errorMessage: action.payload.error,
        debugInfo: `${debugPrefix}: Restore failed - ${action.payload.error}`,
        lastAction: action.type,
      };
      
    case 'RETRY':
      return {
        ...state,
        uiState: 'connecting_store',
        errorMessage: null,
        errorCode: null,
        debugInfo: `${debugPrefix}: Retry requested`,
        lastAction: action.type,
      };
      
    case 'RESET':
      return {
        ...initialSubscriptionState,
        debugInfo: `${debugPrefix}: State reset`,
        lastAction: action.type,
      };
      
    default:
      return state;
  }
}

/**
 * Helper to check if state allows purchase
 */
export function canPurchaseInState(state: SubscriptionState): boolean {
  return (
    state.uiState === 'products_ready' &&
    state.hasRealProduct &&
    !state.isPurchasing &&
    !state.isRestoring &&
    state.products.length > 0
  );
}

/**
 * Helper to check if retry is allowed
 */
export function canRetryInState(state: SubscriptionState): boolean {
  return state.uiState === 'error' || state.uiState === 'no_products';
}

/**
 * Get state description for debugging
 */
export function getStateDescription(state: SubscriptionState): string {
  return `[${state.uiState}] products=${state.products.length} hasReal=${state.hasRealProduct} purchasing=${state.isPurchasing} restoring=${state.isRestoring}`;
}
