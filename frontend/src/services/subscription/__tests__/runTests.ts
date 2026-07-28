// ============================================================================
// SUBSCRIPTION MODULE - STANDALONE TEST RUNNER
// ============================================================================
// Run tests without external dependencies
// Execute with: cd /app/frontend && npx ts-node src/services/subscription/__tests__/runTests.ts
// ============================================================================

// Mock Platform for Node.js environment
const MockPlatform = { OS: 'ios' };

// Create mock for react-native
const mockReactNative = {
  Platform: MockPlatform,
};

// Override require for react-native
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  if (id === 'react-native') {
    return mockReactNative;
  }
  return originalRequire.apply(this, arguments);
};

// ============================================================================
// TEST IMPLEMENTATION
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const TESTS_RESULTS: TestResult[] = [];

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
  };
}

// ============================================================================
// IMPORT MODULES
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
  SubscriptionState,
} from '../types';

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('============================================');
console.log('SUBSCRIPTION MODULE UNIT TESTS');
console.log('============================================\n');

// PARSER TESTS
console.log('--- PARSER TESTS ---\n');

test('extractNumericPrice: European format €49,99', () => {
  const result = __testExports.extractNumericPrice('€49,99');
  expect(result).toBe(49.99);
});

test('extractNumericPrice: US format $49.99', () => {
  const result = __testExports.extractNumericPrice('$49.99');
  expect(result).toBe(49.99);
});

test('extractNumericPrice: invalid string returns 0', () => {
  const result = __testExports.extractNumericPrice('invalid');
  expect(result).toBe(0);
});

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

test('parseiOSProduct: valid StoreKit 2 product', () => {
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
  expect(result!.isRealStoreProduct).toBe(true);
});

test('parseiOSProduct: fallback to localizedPrice', () => {
  const raw = {
    id: PRODUCT_IDS.MONTHLY,
    localizedPrice: '€49,99',
  };
  const result = parseiOSProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.price).toBe('€49,99');
});

test('parseAndroidProduct: null input returns null', () => {
  const result = parseAndroidProduct(null);
  expect(result).toBeNull();
});

test('parseAndroidProduct: valid product with offerToken', () => {
  const raw = {
    productId: PRODUCT_IDS.MONTHLY,
    name: 'Abbonamento Mensile',
    subscriptionOfferDetailsAndroid: [{
      offerToken: 'test-token',
      pricingPhases: {
        pricingPhaseList: [{
          formattedPrice: '€49,99',
          priceAmountMicros: '49990000',
        }],
      },
    }],
  };
  const result = parseAndroidProduct(raw);
  
  expect(result).toBeTruthy();
  expect(result!.offerToken).toBe('test-token');
});

test('parseProducts: filters invalid products', () => {
  const raw = [
    { id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' },
    null,
    { id: 'invalid' },
  ];
  const result = parseProducts(raw);
  expect(result.length).toBe(1);
});

// REDUCER TESTS
console.log('\n--- REDUCER TESTS ---\n');

test('reducer: initial state', () => {
  expect(initialSubscriptionState.uiState).toBe('initializing');
  expect(initialSubscriptionState.products.length).toBe(0);
  expect(initialSubscriptionState.hasRealProduct).toBe(false);
});

test('reducer: INIT_PLATFORM_CHECK web -> store_unavailable', () => {
  const state = subscriptionReducer(initialSubscriptionState, {
    type: 'INIT_PLATFORM_CHECK',
    payload: { isNative: false, isExpoGo: false },
  });
  expect(state.uiState).toBe('store_unavailable');
});

test('reducer: INIT_PLATFORM_CHECK native -> connecting_store', () => {
  const state = subscriptionReducer(initialSubscriptionState, {
    type: 'INIT_PLATFORM_CHECK',
    payload: { isNative: true, isExpoGo: false },
  });
  expect(state.uiState).toBe('connecting_store');
});

test('reducer: FETCH_SUCCESS with products -> products_ready', () => {
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
});

test('reducer: FETCH_EMPTY -> no_products', () => {
  const startState = { ...initialSubscriptionState, uiState: 'fetching_products' as const };
  const state = subscriptionReducer(startState, { type: 'FETCH_EMPTY' });
  
  expect(state.uiState).toBe('no_products');
  expect(state.hasRealProduct).toBe(false);
});

test('reducer: PURCHASE_ACK_FAILED -> error with ACK_FAILED code', () => {
  const startState: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'purchasing',
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

// STATE HELPER TESTS
console.log('\n--- STATE HELPER TESTS ---\n');

test('canPurchaseInState: false when not products_ready', () => {
  const state: SubscriptionState = { ...initialSubscriptionState, uiState: 'initializing' };
  expect(canPurchaseInState(state)).toBe(false);
});

test('canPurchaseInState: false when no products', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: false,
  };
  expect(canPurchaseInState(state)).toBe(false);
});

test('canPurchaseInState: true when ready with products', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: true,
    products: [{ productId: 'test', title: '', description: '', price: '€1', priceValue: 1, currency: 'EUR', isRealStoreProduct: true, rawProduct: {} }],
  };
  expect(canPurchaseInState(state)).toBe(true);
});

test('canRetryInState: true for error', () => {
  expect(canRetryInState({ ...initialSubscriptionState, uiState: 'error' })).toBe(true);
});

test('canRetryInState: true for no_products', () => {
  expect(canRetryInState({ ...initialSubscriptionState, uiState: 'no_products' })).toBe(true);
});

// UI BEHAVIOR TESTS
console.log('\n--- UI BEHAVIOR TESTS ---\n');

test('getUIBehavior: initializing -> loading, button disabled', () => {
  const behavior = getUIBehavior({ ...initialSubscriptionState, uiState: 'initializing' });
  expect(behavior.showLoading).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(false);
});

test('getUIBehavior: no_products -> error shown, button disabled', () => {
  const behavior = getUIBehavior({ ...initialSubscriptionState, uiState: 'no_products' });
  expect(behavior.showError).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(false);
  expect(behavior.showPrice).toBe(false);
});

test('getUIBehavior: products_ready -> price shown, button enabled', () => {
  const state: SubscriptionState = { 
    ...initialSubscriptionState, 
    uiState: 'products_ready',
    hasRealProduct: true,
    products: [{ productId: 'test', title: '', description: '', price: '€49,99', priceValue: 49.99, currency: 'EUR', isRealStoreProduct: true, rawProduct: {} }],
  };
  const behavior = getUIBehavior(state);
  expect(behavior.showPrice).toBe(true);
  expect(behavior.showRealPrice).toBe(true);
  expect(behavior.subscribeButtonEnabled).toBe(true);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n============================================');
console.log('TEST SUMMARY');
console.log('============================================\n');

const passed = TESTS_RESULTS.filter(t => t.passed).length;
const failed = TESTS_RESULTS.filter(t => !t.passed).length;
const total = TESTS_RESULTS.length;

console.log(`Total:  ${total}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
console.log(`Rate:   ${((passed / total) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\nFailed tests:');
  TESTS_RESULTS.filter(t => !t.passed).forEach(t => {
    console.log(`  ❌ ${t.name}`);
    console.log(`     ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
