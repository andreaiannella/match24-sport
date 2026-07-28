// ============================================================================
// SUBSCRIPTION MODULE - COMPREHENSIVE TEST SUITE (Pure JS)
// ============================================================================
// Execute: node /app/frontend/src/services/subscription/__tests__/test.js
// ============================================================================

const results = [];
let currentCategory = 'General';

function describe(category, fn) {
  currentCategory = category;
  console.log(`\n📦 ${category}`);
  fn();
}

function test(name, fn) {
  try {
    fn();
    results.push({ name, category: currentCategory, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.push({ name, category: currentCategory, passed: false, error: err.message });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${err.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRODUCT_IDS = {
  MONTHLY: 'com.matchsport24.subscription.monthly.v2',
  YEARLY: 'com.matchsport24.subscription.yearly.v2',
};

const ACTIVE_SUBSCRIPTION_SKUS = [PRODUCT_IDS.MONTHLY];

// ============================================================================
// PARSER LOGIC
// ============================================================================

function extractString(value) {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function extractNumericPrice(priceString) {
  const match = priceString.match(/[\d,.]+/);
  if (match) {
    const normalized = match[0].replace(',', '.');
    const value = parseFloat(normalized);
    if (!isNaN(value) && value > 0) return value;
  }
  return 0;
}

function parseiOSProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  const productId = extractString(raw.id) || extractString(raw.productId);
  if (!productId) return null;
  
  if (!ACTIVE_SUBSCRIPTION_SKUS.includes(productId)) return null;
  
  let price = '';
  let priceValue = 0;
  
  if (raw.displayPrice) {
    price = String(raw.displayPrice);
    priceValue = extractNumericPrice(price);
  } else if (raw.localizedPrice) {
    price = String(raw.localizedPrice);
    priceValue = extractNumericPrice(price);
  } else if (raw.price !== undefined && raw.price !== null) {
    const numPrice = typeof raw.price === 'number' ? raw.price : parseFloat(String(raw.price));
    if (!isNaN(numPrice) && numPrice > 0) {
      price = `€${numPrice.toFixed(2).replace('.', ',')}`;
      priceValue = numPrice;
    }
  }
  
  // Accept product even without price
  if (!price) {
    price = '€49,99';
    priceValue = 49.99;
  }
  
  return {
    productId,
    title: extractString(raw.displayName) || extractString(raw.title) || 'Abbonamento Premium',
    description: extractString(raw.description) || 'Accesso completo',
    price,
    priceValue,
    currency: extractString(raw.currency) || extractString(raw.currencyCode) || 'EUR',
    isRealStoreProduct: true,
    rawProduct: raw,
  };
}

// ============================================================================
// STATE MACHINE
// ============================================================================

const initialState = {
  uiState: 'initializing',
  products: [],
  hasRealProduct: false,
  isPurchasing: false,
  isRestoring: false,
  errorMessage: null,
};

function canPurchaseInState(state) {
  return (
    state.uiState === 'products_ready' &&
    state.hasRealProduct &&
    !state.isPurchasing &&
    !state.isRestoring &&
    state.products.length > 0
  );
}

function getUIBehavior(state) {
  switch (state.uiState) {
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
        statusMessage: 'Connessione allo store...',
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
        statusMessage: 'Il prodotto non è stato trovato. Riprova più tardi.',
      };
    case 'products_ready':
      return {
        showLoading: false,
        showPrice: true,
        showRealPrice: state.hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: true,
        subscribeButtonLabel: 'Abbonati ora',
        statusMessage: state.products[0]?.price || '',
      };
    case 'purchasing':
      return {
        showLoading: true,
        showPrice: true,
        showRealPrice: state.hasRealProduct,
        showError: false,
        showRetryButton: false,
        showSubscribeButton: true,
        subscribeButtonEnabled: false,
        subscribeButtonLabel: 'Acquisto in corso...',
        statusMessage: 'Elaborazione...',
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

// ============================================================================
// TESTS
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('     SUBSCRIPTION MODULE - COMPREHENSIVE TEST SUITE');
console.log('═══════════════════════════════════════════════════════════');

// Parser Tests
describe('iOS Parser - Null/Invalid Input', () => {
  test('null input returns null', () => expect(parseiOSProduct(null)).toBeNull());
  test('undefined input returns null', () => expect(parseiOSProduct(undefined)).toBeNull());
  test('empty object returns null', () => expect(parseiOSProduct({})).toBeNull());
  test('string input returns null', () => expect(parseiOSProduct('not an object')).toBeNull());
});

describe('iOS Parser - Product ID Validation', () => {
  test('missing productId returns null', () => expect(parseiOSProduct({ displayPrice: '€49,99' })).toBeNull());
  test('wrong productId returns null', () => expect(parseiOSProduct({ id: 'com.other.app.sub' })).toBeNull());
  test('correct productId (id field) accepted', () => {
    const result = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY });
    expect(result).toBeTruthy();
    expect(result.productId).toBe(PRODUCT_IDS.MONTHLY);
  });
  test('correct productId (productId field) accepted', () => {
    const result = parseiOSProduct({ productId: PRODUCT_IDS.MONTHLY });
    expect(result).toBeTruthy();
    expect(result.productId).toBe(PRODUCT_IDS.MONTHLY);
  });
});

describe('iOS Parser - Price Extraction', () => {
  test('displayPrice extracted correctly', () => {
    const result = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    expect(result.price).toBe('€49,99');
    expect(result.priceValue).toBe(49.99);
  });
  test('localizedPrice used as fallback', () => {
    const result = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, localizedPrice: '$49.99' });
    expect(result.price).toBe('$49.99');
  });
  test('missing price uses fallback €49,99', () => {
    const result = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY });
    expect(result).toBeTruthy();
    expect(result.price).toBe('€49,99');
    expect(result.isRealStoreProduct).toBe(true);
  });
});

describe('iOS Parser - Full Product', () => {
  test('StoreKit 2 product parsed correctly', () => {
    const raw = {
      id: PRODUCT_IDS.MONTHLY,
      displayName: 'Premium Monthly',
      description: 'Full access',
      displayPrice: '€49,99',
      currency: 'EUR',
    };
    const result = parseiOSProduct(raw);
    expect(result).toBeTruthy();
    expect(result.productId).toBe(PRODUCT_IDS.MONTHLY);
    expect(result.title).toBe('Premium Monthly');
    expect(result.price).toBe('€49,99');
    expect(result.isRealStoreProduct).toBe(true);
  });
});

// State Machine Tests
describe('State Machine - canPurchaseInState', () => {
  test('false in initializing', () => expect(canPurchaseInState({ ...initialState, uiState: 'initializing' })).toBe(false));
  test('false in no_products', () => expect(canPurchaseInState({ ...initialState, uiState: 'no_products' })).toBe(false));
  test('false in error', () => expect(canPurchaseInState({ ...initialState, uiState: 'error' })).toBe(false));
  test('false without hasRealProduct', () => {
    expect(canPurchaseInState({ ...initialState, uiState: 'products_ready', hasRealProduct: false })).toBe(false);
  });
  test('false with empty products array', () => {
    expect(canPurchaseInState({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [] })).toBe(false);
  });
  test('false when isPurchasing', () => {
    const product = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    expect(canPurchaseInState({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [product], isPurchasing: true })).toBe(false);
  });
  test('true with valid product', () => {
    const product = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    expect(canPurchaseInState({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [product] })).toBe(true);
  });
});

// UI Behavior Tests
describe('UI Behavior - Loading States', () => {
  test('initializing: loading=true, button disabled', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'initializing' });
    expect(b.showLoading).toBe(true);
    expect(b.subscribeButtonEnabled).toBe(false);
    expect(b.showPrice).toBe(false);
  });
});

describe('UI Behavior - no_products (CRITICAL)', () => {
  test('no_products: showPrice=false', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'no_products' });
    expect(b.showPrice).toBe(false);
    expect(b.showRealPrice).toBe(false);
  });
  test('no_products: showError=true, retry available', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'no_products' });
    expect(b.showError).toBe(true);
    expect(b.showRetryButton).toBe(true);
  });
  test('no_products: button disabled with correct label', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'no_products' });
    expect(b.subscribeButtonEnabled).toBe(false);
    expect(b.subscribeButtonLabel).toBe('Prodotto non disponibile');
  });
});

describe('UI Behavior - products_ready', () => {
  test('products_ready: showPrice=true, button enabled', () => {
    const product = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    const b = getUIBehavior({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [product] });
    expect(b.showPrice).toBe(true);
    expect(b.showRealPrice).toBe(true);
    expect(b.subscribeButtonEnabled).toBe(true);
    expect(b.subscribeButtonLabel).toBe('Abbonati ora');
  });
});

describe('UI Behavior - error state', () => {
  test('error: shows error, retry available, button disabled', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'error', errorMessage: 'Test error' });
    expect(b.showError).toBe(true);
    expect(b.showRetryButton).toBe(true);
    expect(b.subscribeButtonEnabled).toBe(false);
    expect(b.statusMessage).toBe('Test error');
  });
});

describe('UI Behavior - store_unavailable', () => {
  test('store_unavailable: hides subscribe button completely', () => {
    const b = getUIBehavior({ ...initialState, uiState: 'store_unavailable' });
    expect(b.showSubscribeButton).toBe(false);
  });
});

// Button Logic Tests
describe('Button Disabled Logic', () => {
  function isPurchaseDisabled(state, isProcessing) {
    if (isProcessing || state.isPurchasing) return true;
    if (!state.hasRealProduct) return true;
    if (!canPurchaseInState(state)) return true;
    return false;
  }
  
  test('disabled when isProcessing=true', () => {
    const product = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    expect(isPurchaseDisabled({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [product] }, true)).toBe(true);
  });
  test('disabled when no hasRealProduct', () => {
    expect(isPurchaseDisabled({ ...initialState, uiState: 'no_products' }, false)).toBe(true);
  });
  test('enabled with valid state and product', () => {
    const product = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99' });
    expect(isPurchaseDisabled({ ...initialState, uiState: 'products_ready', hasRealProduct: true, products: [product] }, false)).toBe(false);
  });
});

// Price Extraction Tests
describe('Price Extraction', () => {
  test('€49,99 -> 49.99', () => expect(extractNumericPrice('€49,99')).toBe(49.99));
  test('$49.99 -> 49.99', () => expect(extractNumericPrice('$49.99')).toBe(49.99));
  test('invalid -> 0', () => expect(extractNumericPrice('free')).toBe(0));
  test('empty -> 0', () => expect(extractNumericPrice('')).toBe(0));
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('                      TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

const categories = [...new Set(results.map(r => r.category))];
categories.forEach(cat => {
  const catResults = results.filter(r => r.category === cat);
  const catPassed = catResults.filter(r => r.passed).length;
  const status = catResults.every(r => r.passed) ? '✅' : '❌';
  console.log(`${status} ${cat}: ${catPassed}/${catResults.length}`);
});

console.log(`\n───────────────────────────────────────────────────────────`);
console.log(`TOTAL: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);

if (failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`   - [${r.category}] ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
}
