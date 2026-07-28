// ============================================================================
// useSubscription Hook - Main subscription hook with state machine
// ============================================================================

import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  SubscriptionState,
  SubscriptionAction,
  ParsedProduct,
  PurchaseResult,
  RestoreResult,
  UIBehavior,
  PRODUCT_IDS,
  getUIBehavior,
  DiagnosticState,
  initialDiagnosticState,
} from '../services/subscription/types';
import {
  subscriptionReducer,
  initialSubscriptionState,
  canPurchaseInState,
} from '../services/subscription/reducer';
import {
  isExpoGo,
  isNativeIAPAvailable,
  getIAPLoadError,
  initConnection,
  endConnection,
  fetchProductsWithDiagnostic,
  requestPurchase,
  restorePurchases as iapRestorePurchases,
} from '../services/subscription/iapService';

// ============================================================================
// HOOK INTERFACE - Compatible with existing UI
// ============================================================================

export interface UseSubscriptionReturn {
  // State - matches existing interface
  status: string;
  isLoading: boolean;
  isReady: boolean;
  isPurchasing: boolean;
  canPurchase: boolean;
  hasRealProduct: boolean;
  products: ParsedProduct[];
  debugInfo: string;
  errorMessage: string | null;
  
  // DIAGNOSTIC - For A/B/C case debugging
  diagnostic: DiagnosticState;
  
  // Actions
  purchaseSubscription: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<RestoreResult>;
  refreshProducts: () => void;
  
  // New state machine access
  state: SubscriptionState;
  uiBehavior: UIBehavior;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const [state, dispatch] = useReducer(subscriptionReducer, initialSubscriptionState);
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>(initialDiagnosticState);
  const mountedRef = useRef(true);
  const initStartedRef = useRef(false);
  
  // Safe dispatch that checks mounted state
  const safeDispatch = useCallback((action: SubscriptionAction) => {
    if (mountedRef.current) {
      dispatch(action);
    }
  }, []);
  
  // ========== INITIALIZATION ==========
  useEffect(() => {
    mountedRef.current = true;
    
    // Prevent double initialization
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    
    const initialize = async () => {
      console.log('[useSubscription] Starting initialization');
      safeDispatch({ type: 'INIT_START' });
      
      // Platform check
      const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
      const inExpoGo = isExpoGo();
      
      console.log('[useSubscription] Platform check:', { isNative, inExpoGo, platform: Platform.OS });
      
      safeDispatch({ 
        type: 'INIT_PLATFORM_CHECK', 
        payload: { isNative, isExpoGo: inExpoGo } 
      });
      
      // Stop if not native platform
      if (!isNative || inExpoGo) {
        console.log('[useSubscription] Stopping: not native or in Expo Go');
        return;
      }
      
      // Check if IAP module is available
      if (!isNativeIAPAvailable()) {
        const loadError = getIAPLoadError();
        console.log('[useSubscription] IAP module not available:', loadError);
        safeDispatch({ 
          type: 'CONNECT_FAILURE', 
          payload: { error: loadError || 'IAP module not available', code: 'MODULE_LOAD_FAILED' } 
        });
        return;
      }
      
      // Connect to store
      console.log('[useSubscription] Connecting to store...');
      safeDispatch({ type: 'CONNECT_START' });
      
      try {
        await initConnection();
        
        if (!mountedRef.current) return;
        
        console.log('[useSubscription] Store connected successfully');
        safeDispatch({ type: 'CONNECT_SUCCESS' });
        
        // Fetch products WITH DIAGNOSTIC
        console.log('[useSubscription] Fetching products...');
        safeDispatch({ type: 'FETCH_START' });
        
        try {
          const result = await fetchProductsWithDiagnostic();
          
          if (!mountedRef.current) return;
          
          // Update diagnostic state
          setDiagnostic(result.diagnostic);
          
          console.log('[useSubscription] Diagnostic:', JSON.stringify(result.diagnostic, null, 2));
          
          if (result.products.length > 0) {
            console.log('[useSubscription] Dispatching FETCH_SUCCESS');
            safeDispatch({ type: 'FETCH_SUCCESS', payload: { products: result.products } });
          } else {
            console.log('[useSubscription] Dispatching FETCH_EMPTY (no products)');
            safeDispatch({ type: 'FETCH_EMPTY' });
          }
        } catch (fetchErr: any) {
          if (!mountedRef.current) return;
          console.log('[useSubscription] Fetch error:', fetchErr?.message);
          setDiagnostic(prev => ({
            ...prev,
            lastFetchError: fetchErr?.message || 'Unknown error',
            diagnosticCase: 'CASE_A_STORE_EMPTY',
          }));
          safeDispatch({ 
            type: 'FETCH_FAILURE', 
            payload: { error: fetchErr?.message || 'Failed to fetch products' } 
          });
        }
        
      } catch (connErr: any) {
        if (!mountedRef.current) return;
        console.log('[useSubscription] Connection error:', connErr?.message);
        safeDispatch({ 
          type: 'CONNECT_FAILURE', 
          payload: { error: connErr?.message || 'Failed to connect to store' } 
        });
      }
    };
    
    initialize();
    
    // Cleanup
    return () => {
      mountedRef.current = false;
      endConnection().catch(() => {});
    };
  }, [safeDispatch]);
  
  // ========== PURCHASE ==========
  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    if (!canPurchaseInState(state)) {
      return { 
        success: false, 
        error: 'Acquisto non disponibile in questo momento',
        errorCode: 'INVALID_STATE',
      };
    }
    
    // Find the monthly product
    const product = state.products.find(p => p.productId === PRODUCT_IDS.MONTHLY);
    
    if (!product) {
      return {
        success: false,
        error: 'Prodotto non trovato',
        errorCode: 'PRODUCT_NOT_FOUND',
      };
    }
    
    safeDispatch({ type: 'PURCHASE_START' });
    
    try {
      const result = await requestPurchase(product);
      
      if (!mountedRef.current) {
        return result;
      }
      
      if (result.cancelled) {
        safeDispatch({ type: 'PURCHASE_CANCELLED' });
      } else if (result.pending) {
        safeDispatch({ type: 'PURCHASE_PENDING' });
      } else if (result.alreadyOwned) {
        // User already has the subscription - treat as success and refresh
        safeDispatch({ type: 'PURCHASE_SUCCESS' });
      } else if (result.needsAcknowledge) {
        // Android acknowledge failed - CRITICAL ERROR
        safeDispatch({ 
          type: 'PURCHASE_ACK_FAILED', 
          payload: { error: result.error || 'Acknowledge failed' } 
        });
      } else if (result.success) {
        safeDispatch({ type: 'PURCHASE_SUCCESS' });
      } else {
        safeDispatch({ 
          type: 'PURCHASE_FAILURE', 
          payload: { error: result.error || 'Purchase failed', code: result.errorCode } 
        });
      }
      
      return result;
      
    } catch (err: any) {
      if (mountedRef.current) {
        safeDispatch({ 
          type: 'PURCHASE_FAILURE', 
          payload: { error: err?.message || 'Unexpected error' } 
        });
      }
      return { success: false, error: err?.message || 'Unexpected error' };
    }
  }, [state, safeDispatch]);
  
  // ========== RESTORE ==========
  const restore = useCallback(async (): Promise<RestoreResult> => {
    safeDispatch({ type: 'RESTORE_START' });
    
    try {
      const result = await iapRestorePurchases();
      
      if (!mountedRef.current) {
        return result;
      }
      
      if (result.success) {
        safeDispatch({ type: 'RESTORE_SUCCESS', payload: { message: result.message } });
      } else {
        safeDispatch({ type: 'RESTORE_FAILURE', payload: { error: result.error || result.message || 'Restore failed' } });
      }
      
      return result;
      
    } catch (err: any) {
      if (mountedRef.current) {
        safeDispatch({ type: 'RESTORE_FAILURE', payload: { error: err?.message || 'Unexpected error' } });
      }
      return { success: false, error: err?.message || 'Unexpected error' };
    }
  }, [safeDispatch]);
  
  // ========== RETRY ==========
  const retry = useCallback(() => {
    initStartedRef.current = false;
    safeDispatch({ type: 'RETRY' });
    
    // Re-trigger initialization
    const reinitialize = async () => {
      initStartedRef.current = true;
      
      if (!isNativeIAPAvailable()) {
        safeDispatch({ 
          type: 'CONNECT_FAILURE', 
          payload: { error: 'IAP non disponibile' } 
        });
        return;
      }
      
      safeDispatch({ type: 'CONNECT_START' });
      
      try {
        await initConnection();
        if (!mountedRef.current) return;
        
        safeDispatch({ type: 'CONNECT_SUCCESS' });
        safeDispatch({ type: 'FETCH_START' });
        
        const result = await fetchProductsWithDiagnostic();
        if (!mountedRef.current) return;
        
        setDiagnostic(result.diagnostic);
        
        if (result.products.length > 0) {
          safeDispatch({ type: 'FETCH_SUCCESS', payload: { products: result.products } });
        } else {
          safeDispatch({ type: 'FETCH_EMPTY' });
        }
      } catch (err: any) {
        if (mountedRef.current) {
          safeDispatch({ 
            type: 'CONNECT_FAILURE', 
            payload: { error: err?.message || 'Retry failed' } 
          });
        }
      }
    };
    
    reinitialize();
  }, [safeDispatch]);
  
  // ========== COMPUTED VALUES ==========
  const uiBehavior = getUIBehavior(state);
  const isLoading = state.uiState === 'initializing' || 
                    state.uiState === 'connecting_store' || 
                    state.uiState === 'fetching_products';
  const isReady = state.uiState === 'products_ready';
  const canPurchase = canPurchaseInState(state);
  
  // Purchase wrapper to match old interface (takes productId)
  const purchaseSubscription = useCallback(async (productId: string): Promise<PurchaseResult> => {
    return await purchase();
  }, [purchase]);
  
  // Refresh products wrapper
  const refreshProducts = useCallback(() => {
    retry();
  }, [retry]);
  
  return {
    // Legacy interface
    status: state.uiState,
    isLoading,
    isReady,
    isPurchasing: state.isPurchasing,
    canPurchase,
    hasRealProduct: state.hasRealProduct,
    products: state.products,
    debugInfo: state.debugInfo,
    errorMessage: state.errorMessage,
    // DIAGNOSTIC
    diagnostic,
    purchaseSubscription,
    restorePurchases: restore,
    refreshProducts,
    // New state machine
    state,
    uiBehavior,
  };
}

// Re-export types and constants for convenience
export { PRODUCT_IDS, STATIC_FALLBACK } from '../services/subscription/types';
export type { ParsedProduct, SubscriptionUIState } from '../services/subscription/types';
