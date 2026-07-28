// ============================================================================
// SUBSCRIPTION MODULE - MAIN EXPORTS
// ============================================================================

// Types
export {
  SubscriptionUIState,
  ParsedProduct,
  StaticPriceInfo,
  PurchaseResult,
  RestoreResult,
  SubscriptionState,
  SubscriptionAction,
  UIBehavior,
  PRODUCT_IDS,
  ACTIVE_SUBSCRIPTION_SKUS,
  STATIC_FALLBACK,
  getUIBehavior,
} from './types';

// State Reducer
export {
  subscriptionReducer,
  initialSubscriptionState,
  canPurchaseInState,
  canRetryInState,
  getStateDescription,
} from './reducer';

// Parser
export {
  parseiOSProduct,
  parseAndroidProduct,
  parseProduct,
  parseProducts,
} from './parser';

// IAP Service
export {
  isExpoGo,
  isNativeIAPAvailable,
  getIAPLoadError,
  initConnection,
  endConnection,
  isStoreConnected,
  fetchProducts,
  requestPurchase,
  restorePurchases,
} from './iapService';
