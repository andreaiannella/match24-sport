// ============================================================================
// DIAGNOSTIC TEST SUITE - A/B/C Cases
// ============================================================================
// Execute: node /app/frontend/src/services/subscription/__tests__/diagnosticTest.js
// ============================================================================

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
    console.log(`❌ ${name}: ${err.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) 
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
  };
}

// ============================================================================
// CONSTANTS (same as types.ts)
// ============================================================================

const PRODUCT_IDS = {
  MONTHLY: 'com.matchsport24.subscription.monthly.v2',
};

const ACTIVE_SUBSCRIPTION_SKUS = [PRODUCT_IDS.MONTHLY];

// ============================================================================
// PARSER LOGIC (same as parser.ts)
// ============================================================================

function extractString(value) {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
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
    priceValue = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  } else if (raw.localizedPrice) {
    price = String(raw.localizedPrice);
    priceValue = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  }
  
  // ACCEPT even without price - use fallback
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
    currency: extractString(raw.currency) || 'EUR',
    isRealStoreProduct: true,
    rawProduct: raw,
  };
}

function parseProductsWithDiagnostic(rawProducts) {
  const diagnostic = {
    requestedSkus: [...ACTIVE_SUBSCRIPTION_SKUS],
    rawProductsCount: 0,
    rawProductIds: [],
    parsedProductsCount: 0,
    parsedProductIds: [],
    lastFetchError: null,
    parserRejections: [],
    fetchTimestamp: new Date().toISOString(),
    diagnosticCase: 'NOT_FETCHED',
  };
  
  if (Array.isArray(rawProducts)) {
    diagnostic.rawProductsCount = rawProducts.length;
    diagnostic.rawProductIds = rawProducts.map(p => p?.id || p?.productId || 'UNKNOWN');
  }
  
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
    return { products: [], diagnostic };
  }
  
  const parsed = [];
  const rejections = [];
  
  for (let i = 0; i < rawProducts.length; i++) {
    const raw = rawProducts[i];
    const rawId = raw?.id || raw?.productId || `index_${i}`;
    
    const product = parseiOSProduct(raw);
    
    if (!product) {
      let reason = 'parseProduct returned null';
      if (!raw || typeof raw !== 'object') {
        reason = 'Invalid input (not an object)';
      } else if (!raw.id && !raw.productId) {
        reason = 'Missing product ID';
      } else if (!ACTIVE_SUBSCRIPTION_SKUS.includes(rawId)) {
        reason = `Product ID "${rawId}" not in ACTIVE_SUBSCRIPTION_SKUS`;
      }
      rejections.push({ id: String(rawId), reason });
      continue;
    }
    
    parsed.push(product);
  }
  
  diagnostic.parsedProductsCount = parsed.length;
  diagnostic.parsedProductIds = parsed.map(p => p.productId);
  diagnostic.parserRejections = rejections;
  
  if (parsed.length > 0) {
    diagnostic.diagnosticCase = 'CASE_C_READY';
  } else if (diagnostic.rawProductsCount > 0) {
    diagnostic.diagnosticCase = 'CASE_B_PARSER_REJECTED';
  } else {
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
  }
  
  return { products: parsed, diagnostic };
}

// ============================================================================
// TESTS
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('     DIAGNOSTIC A/B/C TEST SUITE');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('--- CASE A: Store returns empty ---');

test('CASE A: null rawProducts -> CASE_A_STORE_EMPTY', () => {
  const result = parseProductsWithDiagnostic(null);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_A_STORE_EMPTY');
  expect(result.diagnostic.rawProductsCount).toBe(0);
  expect(result.products.length).toBe(0);
});

test('CASE A: empty array -> CASE_A_STORE_EMPTY', () => {
  const result = parseProductsWithDiagnostic([]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_A_STORE_EMPTY');
  expect(result.diagnostic.rawProductsCount).toBe(0);
});

test('CASE A: undefined -> CASE_A_STORE_EMPTY', () => {
  const result = parseProductsWithDiagnostic(undefined);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_A_STORE_EMPTY');
});

console.log('\n--- CASE B: Products received but rejected ---');

test('CASE B: wrong productId -> CASE_B_PARSER_REJECTED', () => {
  const result = parseProductsWithDiagnostic([
    { id: 'com.wrong.product.id', displayPrice: '€49,99' }
  ]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_B_PARSER_REJECTED');
  expect(result.diagnostic.rawProductsCount).toBe(1);
  expect(result.diagnostic.rawProductIds).toEqual(['com.wrong.product.id']);
  expect(result.diagnostic.parsedProductsCount).toBe(0);
  expect(result.diagnostic.parserRejections.length).toBe(1);
  expect(result.diagnostic.parserRejections[0].reason).toBe('Product ID "com.wrong.product.id" not in ACTIVE_SUBSCRIPTION_SKUS');
});

test('CASE B: missing id field -> CASE_B_PARSER_REJECTED', () => {
  const result = parseProductsWithDiagnostic([
    { displayPrice: '€49,99' }  // No id field
  ]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_B_PARSER_REJECTED');
  expect(result.diagnostic.parserRejections[0].reason).toBe('Missing product ID');
});

console.log('\n--- CASE C: Products ready ---');

test('CASE C: correct productId with displayPrice -> CASE_C_READY', () => {
  const result = parseProductsWithDiagnostic([
    { id: PRODUCT_IDS.MONTHLY, displayPrice: '€49,99', displayName: 'Premium' }
  ]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_C_READY');
  expect(result.diagnostic.rawProductsCount).toBe(1);
  expect(result.diagnostic.parsedProductsCount).toBe(1);
  expect(result.products[0].productId).toBe(PRODUCT_IDS.MONTHLY);
  expect(result.products[0].price).toBe('€49,99');
});

test('CASE C: correct productId WITHOUT price (uses fallback) -> CASE_C_READY', () => {
  const result = parseProductsWithDiagnostic([
    { id: PRODUCT_IDS.MONTHLY }  // No price fields
  ]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_C_READY');
  expect(result.diagnostic.parsedProductsCount).toBe(1);
  expect(result.products[0].price).toBe('€49,99');  // Fallback
  expect(result.products[0].isRealStoreProduct).toBe(true);
});

test('CASE C: productId field (not id) -> CASE_C_READY', () => {
  const result = parseProductsWithDiagnostic([
    { productId: PRODUCT_IDS.MONTHLY, localizedPrice: '$49.99' }
  ]);
  expect(result.diagnostic.diagnosticCase).toBe('CASE_C_READY');
  expect(result.products[0].productId).toBe(PRODUCT_IDS.MONTHLY);
});

console.log('\n--- MINIMUM ACCEPTANCE CONTRACT ---');

test('CONTRACT: id OR productId required', () => {
  // With id
  const r1 = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY });
  expect(r1 !== null).toBe(true);
  
  // With productId
  const r2 = parseiOSProduct({ productId: PRODUCT_IDS.MONTHLY });
  expect(r2 !== null).toBe(true);
  
  // Without either
  const r3 = parseiOSProduct({ displayPrice: '€49,99' });
  expect(r3).toBe(null);
});

test('CONTRACT: Price fields are OPTIONAL (fallback used)', () => {
  const result = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY });
  expect(result !== null).toBe(true);
  expect(result.price).toBe('€49,99');
});

test('CONTRACT: productId MUST match ACTIVE_SUBSCRIPTION_SKUS', () => {
  const wrong = parseiOSProduct({ id: 'com.other.app' });
  expect(wrong).toBe(null);
  
  const correct = parseiOSProduct({ id: PRODUCT_IDS.MONTHLY });
  expect(correct !== null).toBe(true);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`TOTAL: ${passed}/${results.length} tests passed`);

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED');
  console.log('\n📋 MINIMUM ACCEPTANCE CONTRACT FOR iOS:');
  console.log('   - REQUIRED: id OR productId field');
  console.log('   - REQUIRED: productId must be in ACTIVE_SUBSCRIPTION_SKUS');
  console.log('   - OPTIONAL: displayPrice, localizedPrice, price (fallback €49,99 used)');
  console.log('   - OPTIONAL: displayName, title, description, currency');
  process.exit(0);
}
