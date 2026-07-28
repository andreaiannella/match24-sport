// ============================================================================
// SUBSCRIPTION MODULE - UNIT TESTS
// ============================================================================
// Test file for parser, reducer, and state machine logic
// Run with: node --experimental-vm-modules src/services/subscription/__tests__/subscription.test.js
// ============================================================================

// Since this is a React Native project without Jest setup, 
// we implement a simple test runner

const TESTS_RESULTS: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    TESTS_RESULTS.push({ name, passed: true });
    console.log(`✅ PASS: ${name}`);
  } catch (err: any) {
    TESTS_RESULTS.push({ name, passed: false, error: err?.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err?.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain(expected: any) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

// ============================================================================
// IMPORT MODULES BEING TESTED
// ============================================================================

import { 
  subscriptionReducer, 
  initialSubscriptionState,
  canPurchaseInState,
  canRetryInState,
} from '../reducer';

import { 
  parseiOSProduct, 
  parseAndroidProduct,
  parseProducts,
  __testExports,
} from '../parser';

import {
  getUIBehavior,
  PRODUCT_IDS,
  ACTIVE_SUBSCRIPTION_SKUS,
  SubscriptionState,
} from '../types';

// ============================================================================
// PARSER TESTS
// ============================================================================

console.log('\n=== PARSER TESTS ===\n');

// Test extractNumericPrice
test('extractNumericPrice: European format €49,99', () => {
  const result = __testExports.extractNumericPrice('€49,99');
  expect(result).toBe(49.99);
});

test('extractNumericPrice: US format $49.99', () => {
  const result = __testExports.extractNumericPrice('$49.99');
  expect(result).toBe(49.99);
});

test('extractNumericPrice: with currency symbol at end 49.99€', () => {
  const result = __testExports.extractNumericPrice('49.99€');
  expect(result).toBe(49.99);
});

test('extractNumericPrice: invalid string returns 0', () => {
  const result = __testExports.extractNumericPrice('invalid');
  expect(result).toBe(0);
});

// Test iOS product parsing
test('parseiOSProduct: null input returns null', () => {
  const result = parseiOSProduct(null);
  expect(result).toBeNull();
});

test('parseiOSProduct: empty object returns null', () => {
  const result = parseiOSProduct({});
  expect(result).toBeNull();
});

test('parseiOSProduct: missing productId returns null', () => {
  const result = parseiOSProduct({ displayPrice: '€49,99' });
  expect(result).toBeNull();
});

test('parseiOSProduct: wrong productId returns null', () => {
  const result = parseiOSProduct({ 
    id: 'com.other.product',
    displayPrice: '€49,99' 
  });
  expect(result).toBeNull();
});

test('parseiOSProduct: valid StoreKit 2 product with id field', () => {
  const raw = {
    id: PRODUCT_IDS.MONTHLY,
    displayName: 'Abbonamento Mensile',
    description: 'Test description',
    displayPrice: '€49,99',
    currency: 'EUR',
  };
  const result = parseiOSProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.productId).toBe(PRODUCT_IDS.MONTHLY);
  expect(result!.price).toBe('€49,99');
  expect(result!.priceValue).toBe(49.99);
  expect(result!.isRealStoreProduct).toBe(true);
});

test('parseiOSProduct: fallback to localizedPrice when displayPrice missing', () => {
  const raw = {
    id: PRODUCT_IDS.MONTHLY,
    localizedPrice: '€49,99',
  };
  const result = parseiOSProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.price).toBe('€49,99');
});

test('parseiOSProduct: fallback to numeric price', () => {
  const raw = {
    id: PRODUCT_IDS.MONTHLY,
    price: 49.99,
    currency: 'EUR',
  };
  const result = parseiOSProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.priceValue).toBe(49.99);
});

// Test Android product parsing
test('parseAndroidProduct: null input returns null', () => {
  const result = parseAndroidProduct(null);
  expect(result).toBeNull();
});

test('parseAndroidProduct: valid product with subscriptionOfferDetails', () => {
  const raw = {
    productId: PRODUCT_IDS.MONTHLY,
    name: 'Abbonamento Mensile',
    description: 'Test description',
    subscriptionOfferDetailsAndroid: [{
      offerToken: 'test-offer-token-123',
      pricingPhases: {
        pricingPhaseList: [{
          formattedPrice: '€49,99',
          priceAmountMicros: '49990000',
          priceCurrencyCode: 'EUR',
        }],
      },
    }],
  };
  const result = parseAndroidProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.productId).toBe(PRODUCT_IDS.MONTHLY);
  expect(result!.price).toBe('€49,99');
  expect(result!.offerToken).toBe('test-offer-token-123');
  expect(result!.isRealStoreProduct).toBe(true);
});

test('parseAndroidProduct: missing offerToken logs warning but still parses', () => {
  const raw = {
    productId: PRODUCT_IDS.MONTHLY,
    localizedPrice: '€49,99',
  };
  const result = parseAndroidProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.offerToken).toBeFalsy();
});

// Test parseProducts array
test('parseProducts: empty array returns empty array', () => {
  const result = parseProducts([]);
  expect(result.length).toBe(0);
});

test('parseProducts: filters out invalid products', () => {
  const raw = [
    { id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' },
    { id: 'invalid.product' },
    null,
    { productId: PRODUCT_IDS.MONTHLY, localizedPrice: '€49,99' },
  ];
  const result = parseProducts(raw);
  
  // Should only include valid products with prices
  expect(result.length).toBeGreaterThan(0);
  result.forEach(p => {
    expect(p.isRealStoreProduct).toBe(true);
    expect(p.price.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// REDUCER TESTS
// ============================================================================

console.log('\n=== REDUCER TESTS ===\n');

test('reducer: initial state is initializing', () => {
  expect(initialSubscriptionState.uiState).toBe('initializing');
  expect(initialSubscriptionState.products.length).toBe(0);
  expect(initialSubscriptionState.hasRealProduct).toBe(false);
});

test('reducer: INIT_PLATFORM_CHECK with web sets store_unavailable', () => {
  const state = subscriptionReducer(initialSubscriptionState, {
    type: 'INIT_PLATFORM_CHECK',
    payload: { isNative: false, isExpoGo: false },
  });
  expect(state.uiState).toBe('store_unavailable');
});

test('reducer: INIT_PLATFORM_CHECK with Expo Go sets store_unavailable', () => {
  const state = subscriptionReducer(initialSubscriptionState, {
    type: 'INIT_PLATFORM_CHECK',
    payload: { isNative: true, isExpoGo: true },
  });
  expect(state.uiState).toBe('store_unavailable');
});

test('reducer: INIT_PLATFORM_CHECK with native sets connecting_store', () => {
  const state = subscriptionReducer(initialSubscriptionState, {
    type: 'INIT_PLATFORM_CHECK',
    payload: { isNative: true, isExpoGo: false },
  });
  expect(state.uiState).toBe('connecting_store');
});

test('reducer: CONNECT_SUCCESS sets fetching_products', () => {
  const startState = { ...initialSubscriptionState, uiState: 'connecting_store' as const };
  const state = subscriptionReducer(startState, { type: 'CONNECT_SUCCESS' });
  expect(state.uiState).toBe('fetching_products');
});

test('reducer: FETCH_SUCCESS with products sets products_ready', () => {
  const startState = { ...initialSubscriptionState, uiState: 'fetching_products' as const };
  const products = [{
    productId: PRODUCT_IDS.MONTHLY,
    title: 'Test',
    description: 'Test',
    price: '€49,99',
    priceValue: 49.99,
    currency: 'EUR',
    isRealStoreProduct: true as const,
    rawProduct: {},
  }];
  
  const state = subscriptionReducer(startState, {
    type: 'FETCH_SUCCESS',
    payload: { products },
  });
  
  expect(state.uiState).toBe('products_ready');
  expect(state.hasRealProduct).toBe(true);
  expect(state.products.length).toBe(1);
});

test('reducer: FETCH_EMPTY sets no_products', () => {
  const startState = { ...initialSubscriptionState, uiState: 'fetching_products' as const };
  const state = subscriptionReducer(startState, { type: 'FETCH_EMPTY' });
  
  expect(state.uiState).toBe('no_products');
  expect(state.hasRealProduct).toBe(false);
  expect(state.products.length).toBe(0);
});

test('reducer: PURCHASE_ACK_FAILED sets error with specific code', () => {
  const startState = { 
    ...initialSubscriptionState, 
    uiState: 'purchasing' as const,
    isPurchasing: true,
  };
  const state = subscriptionReducer(startState, {
    type: 'PURCHASE_ACK_FAILED',
    payload: { error: 'Acknowledge failed' },
  });
  
  expect(state.uiState).toBe('error');
  expect(state.errorCode).toBe('ACK_FAILED');
  expect(state.isPurchasing).toBe(false);
});

test('reducer: PURCHASE_CANCELLED returns to products_ready if hasRealProduct', () => {
  const startState: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'purchasing',
    isPurchasing: true,
    hasRealProduct: true,
    products: [{
      productId: PRODUCT_IDS.MONTHLY,
      title: 'Test',
      description: 'Test',
      price: '€49,99',
      priceValue: 49.99,
      currency: 'EUR',
      isRealStoreProduct: true,
      rawProduct: {},
    }],
  };
  const state = subscriptionReducer(startState, { type: 'PURCHASE_CANCELLED' });
  
  expect(state.uiState).toBe('products_ready');
  expect(state.isPurchasing).toBe(false);
});

// ============================================================================
// STATE HELPER TESTS
// ============================================================================

console.log('\n=== STATE HELPER TESTS ===\n');

test('canPurchaseInState: false when uiState is not products_ready', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'loading' as any };
  expect(canPurchaseInState(state)).toBe(false);
});

test('canPurchaseInState: false when hasRealProduct is false', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: false,
  };
  expect(canPurchaseInState(state)).toBe(false);
});

test('canPurchaseInState: false when isPurchasing is true', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: true,
    isPurchasing: true,
    products: [{ productId: 'test', title: '', description: '', price: '€1', priceValue: 1, currency: 'EUR', isRealStoreProduct: true, rawProduct: {} }],
  };
  expect(canPurchaseInState(state)).toBe(false);
});

test('canPurchaseInState: true when all conditions met', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: true,
    isPurchasing: false,
    isRestoring: false,
    products: [{ productId: 'test', title: '', description: '', price: '€1', priceValue: 1, currency: 'EUR', isRealStoreProduct: true, rawProduct: {} }],
  };
  expect(canPurchaseInState(state)).toBe(true);
});

test('canRetryInState: true for error state', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'error' };
  expect(canRetryInState(state)).toBe(true);
});

test('canRetryInState: true for no_products state', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'no_products' };
  expect(canRetryInState(state)).toBe(true);
});

test('canRetryInState: false for products_ready state', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'products_ready' };
  expect(canRetryInState(state)).toBe(false);
});

// ============================================================================
// UI BEHAVIOR TESTS
// ============================================================================

console.log('\n=== UI BEHAVIOR TESTS ===\n');

test('getUIBehavior: initializing shows loading, button disabled', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'initializing' };
  const behavior = getUIBehavior(state);
  
  expect(behavior.showLoading).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(false);
  expect(behavior.showPrice).toBe(false);
});

test('getUIBehavior: no_products shows error, button disabled, retry available', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'no_products' };
  const behavior = getUIBehavior(state);
  
  expect(behavior.showError).toBe(true);
  expect(behavior.showRetryButton).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(false);
  expect(behavior.showPrice).toBe(false);
  expect(behavior.showRealPrice).toBe(false);
});

test('getUIBehavior: products_ready shows price, button enabled', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: true,
    products: [{ productId: 'test', title: '', description: '', price: '€49,99', priceValue: 49.99, currency: 'EUR', isRealStoreProduct: true, rawProduct: {} }],
  };
  const behavior = getUIBehavior(state);
  
  expect(behavior.showLoading).toBe(false);
  expect(behavior.showPrice).toBe(true);
  expect(behavior.showRealPrice).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(true);
  expect(behavior.subscribeButtonLabel).toBe('Abbonati ora');
});

test('getUIBehavior: purchasing shows loading, button disabled', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'purchasing',
    hasRealProduct: true,
  };
  const behavior = getUIBehavior(state);
  
  expect(behavior.showLoading).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(false);
  expect(behavior.subscribeButtonLabel).toBe('Acquisto in corso...');
});

test('getUIBehavior: store_unavailable shows no subscribe button', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'store_unavailable' };
  const behavior = getUIBehavior(state);
  
  expect(behavior.showSubscribeButton).toBe(false);
  expect(behavior.showError).toBe(true);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== TEST SUMMARY ===\n');

const passed = TESTS_RESULTS.filter(t => t.passed).length;
const failed = TESTS_RESULTS.filter(t => !t.passed).length;
const total = TESTS_RESULTS.length;

console.log(`Total: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tests:');
  TESTS_RESULTS.filter(t => !t.passed).forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
}

// Export for programmatic access
export const testResults = {
  total,
  passed,
  failed,
  results: TESTS_RESULTS,
};
