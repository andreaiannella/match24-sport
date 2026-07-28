// ============================================================================
// useSubscription Hook - LEGACY COMPATIBILITY WRAPPER
// ============================================================================
// This file provides backward compatibility with existing code
// while using the new subscription module internally
// ============================================================================

// Re-export everything from the new hook
export { 
  useSubscription, 
  PRODUCT_IDS, 
  STATIC_FALLBACK,
} from './useSubscriptionV2';

export type { 
  ParsedProduct, 
  SubscriptionUIState,
  UseSubscriptionReturn,
} from './useSubscriptionV2';

// Additional legacy exports for backward compatibility
export { ACTIVE_SUBSCRIPTION_SKUS, DiagnosticState } from '../services/subscription/types';
