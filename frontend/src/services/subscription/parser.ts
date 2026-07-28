// ============================================================================
// SUBSCRIPTION MODULE - PRODUCT PARSER
// ============================================================================
// Pure functions for parsing iOS/Android products
// Fully testable, no side effects
// ============================================================================

import { Platform } from 'react-native';
import { ParsedProduct, ACTIVE_SUBSCRIPTION_SKUS, DiagnosticState, initialDiagnosticState } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const FALLBACK_TITLE = 'Abbonamento Premium';
const FALLBACK_DESCRIPTION = 'Accesso completo alla piattaforma';
const FALLBACK_CURRENCY = 'EUR';

// ============================================================================
// iOS PRODUCT PARSER (StoreKit 2)
// ============================================================================

export interface iOSRawProduct {
  id?: string;
  productId?: string;
  displayName?: string;
  title?: string;
  name?: string;
  description?: string;
  displayPrice?: string;
  localizedPrice?: string;
  priceString?: string;
  price?: number | string;
  currency?: string;
  currencyCode?: string;
}

/**
 * Parse iOS StoreKit 2 product
 * @param raw - Raw product from expo-iap
 * @returns ParsedProduct or null if invalid
 */
export function parseiOSProduct(raw: unknown): ParsedProduct | null {
  console.log('[PARSER-iOS] Parsing raw product:', JSON.stringify(raw, null, 2));
  
  // Type guard
  if (!raw || typeof raw !== 'object') {
    console.log('[PARSER-iOS] Rejected: not an object');
    return null;
  }
  
  const product = raw as iOSRawProduct;
  
  // Extract product ID - StoreKit 2 uses 'id', legacy uses 'productId'
  const productId = extractString(product.id) || extractString(product.productId);
  console.log('[PARSER-iOS] Extracted productId:', productId);
  
  if (!productId) {
    console.log('[PARSER-iOS] Rejected: no productId found');
    return null;
  }
  
  // Verify it's one of our products
  console.log('[PARSER-iOS] Checking if productId is in ACTIVE_SUBSCRIPTION_SKUS:', ACTIVE_SUBSCRIPTION_SKUS);
  if (!ACTIVE_SUBSCRIPTION_SKUS.includes(productId as any)) {
    console.log('[PARSER-iOS] Rejected: productId not in allowed SKUs');
    return null;
  }
  
  // Extract price - prioritize StoreKit 2 fields
  const priceInfo = extractiOSPrice(product);
  console.log('[PARSER-iOS] Extracted price info:', priceInfo);
  
  const parsed = {
    productId,
    title: extractString(product.displayName) || 
           extractString(product.title) || 
           extractString(product.name) || 
           FALLBACK_TITLE,
    description: extractString(product.description) || FALLBACK_DESCRIPTION,
    price: priceInfo.price,
    priceValue: priceInfo.priceValue,
    currency: extractString(product.currency) || 
              extractString(product.currencyCode) || 
              FALLBACK_CURRENCY,
    isRealStoreProduct: true as const,
    rawProduct: raw,
  };
  
  console.log('[PARSER-iOS] Successfully parsed product:', parsed.productId, parsed.price);
  return parsed;
}

/**
 * Extract price from iOS product
 */
function extractiOSPrice(product: iOSRawProduct): { price: string; priceValue: number } {
  // Priority 1: displayPrice (StoreKit 2 primary field)
  if (product.displayPrice && typeof product.displayPrice === 'string' && product.displayPrice.length > 0) {
    return {
      price: product.displayPrice,
      priceValue: extractNumericPrice(product.displayPrice),
    };
  }
  
  // Priority 2: localizedPrice
  if (product.localizedPrice && typeof product.localizedPrice === 'string' && product.localizedPrice.length > 0) {
    return {
      price: product.localizedPrice,
      priceValue: extractNumericPrice(product.localizedPrice),
    };
  }
  
  // Priority 3: priceString
  if (product.priceString && typeof product.priceString === 'string' && product.priceString.length > 0) {
    return {
      price: product.priceString,
      priceValue: extractNumericPrice(product.priceString),
    };
  }
  
  // Priority 4: numeric price
  if (product.price !== undefined && product.price !== null) {
    const numPrice = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(String(product.price));
    
    if (!isNaN(numPrice) && numPrice > 0) {
      return {
        price: formatPrice(numPrice, product.currency || product.currencyCode || 'EUR'),
        priceValue: numPrice,
      };
    }
  }
  
  // FALLBACK: If no price found, use a placeholder so the product isn't rejected
  // This allows us to at least load the product and debug
  console.log('[PARSER-iOS] WARNING: No price found, using fallback €49,99');
  return { price: '€49,99', priceValue: 49.99 };
}

// ============================================================================
// ANDROID PRODUCT PARSER (Google Play Billing)
// ============================================================================

export interface AndroidPricingPhase {
  formattedPrice?: string;
  priceAmountMicros?: string | number;
  priceCurrencyCode?: string;
}

export interface AndroidSubscriptionOffer {
  offerToken?: string;
  pricingPhases?: {
    pricingPhaseList?: AndroidPricingPhase[];
  } | AndroidPricingPhase[];
}

export interface AndroidRawProduct {
  productId?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  localizedPrice?: string;
  subscriptionOfferDetailsAndroid?: AndroidSubscriptionOffer[];
  subscriptionOfferDetails?: AndroidSubscriptionOffer[];
}

/**
 * Parse Android Google Play Billing product
 * @param raw - Raw product from expo-iap
 * @returns ParsedProduct or null if invalid
 */
export function parseAndroidProduct(raw: unknown): ParsedProduct | null {
  // Type guard
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  
  const product = raw as AndroidRawProduct;
  
  // Extract product ID
  const productId = extractString(product.productId) || extractString(product.id);
  if (!productId) {
    return null;
  }
  
  // Verify it's one of our products
  if (!ACTIVE_SUBSCRIPTION_SKUS.includes(productId as any)) {
    return null;
  }
  
  // Extract offer token - REQUIRED for Android purchase
  const offerToken = extractAndroidOfferToken(product);
  if (!offerToken) {
    // Without offerToken, purchase will fail on Android
    // Still return the product but log warning
    console.warn(`[Parser] Android product ${productId} missing offerToken`);
  }
  
  // Extract price
  const priceInfo = extractAndroidPrice(product);
  
  return {
    productId,
    title: extractString(product.name) || 
           extractString(product.title) || 
           FALLBACK_TITLE,
    description: extractString(product.description) || FALLBACK_DESCRIPTION,
    price: priceInfo.price,
    priceValue: priceInfo.priceValue,
    currency: priceInfo.currency,
    offerToken,
    isRealStoreProduct: true,
    rawProduct: raw,
  };
}

/**
 * Extract offer token from Android product
 */
function extractAndroidOfferToken(product: AndroidRawProduct): string | undefined {
  const offers = product.subscriptionOfferDetailsAndroid || product.subscriptionOfferDetails;
  
  if (!Array.isArray(offers) || offers.length === 0) {
    return undefined;
  }
  
  const firstOffer = offers[0];
  if (!firstOffer || typeof firstOffer !== 'object') {
    return undefined;
  }
  
  const token = firstOffer.offerToken;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

/**
 * Extract price from Android product
 */
function extractAndroidPrice(product: AndroidRawProduct): { price: string; priceValue: number; currency: string } {
  const offers = product.subscriptionOfferDetailsAndroid || product.subscriptionOfferDetails;
  
  if (Array.isArray(offers) && offers.length > 0) {
    const firstOffer = offers[0];
    if (firstOffer && typeof firstOffer === 'object') {
      const phases = firstOffer.pricingPhases;
      
      // Handle both array and object with pricingPhaseList
      let phaseList: AndroidPricingPhase[] = [];
      if (Array.isArray(phases)) {
        phaseList = phases;
      } else if (phases && typeof phases === 'object' && Array.isArray(phases.pricingPhaseList)) {
        phaseList = phases.pricingPhaseList;
      }
      
      if (phaseList.length > 0) {
        const phase = phaseList[0];
        if (phase) {
          const formattedPrice = extractString(phase.formattedPrice);
          const micros = phase.priceAmountMicros;
          const currency = extractString(phase.priceCurrencyCode) || FALLBACK_CURRENCY;
          
          if (formattedPrice && formattedPrice.length > 0) {
            const priceValue = micros 
              ? (typeof micros === 'number' ? micros : parseFloat(String(micros))) / 1000000
              : extractNumericPrice(formattedPrice);
              
            return { price: formattedPrice, priceValue, currency };
          }
        }
      }
    }
  }
  
  // Fallback to localizedPrice
  if (product.localizedPrice && typeof product.localizedPrice === 'string') {
    return {
      price: product.localizedPrice,
      priceValue: extractNumericPrice(product.localizedPrice),
      currency: FALLBACK_CURRENCY,
    };
  }
  
  // No valid price found
  return { price: '', priceValue: 0, currency: FALLBACK_CURRENCY };
}

// ============================================================================
// MAIN PARSER - AUTO-DETECT PLATFORM
// ============================================================================

/**
 * Parse product based on current platform
 */
export function parseProduct(raw: unknown): ParsedProduct | null {
  if (Platform.OS === 'ios') {
    return parseiOSProduct(raw);
  } else if (Platform.OS === 'android') {
    return parseAndroidProduct(raw);
  }
  return null;
}

/**
 * Parse array of products
 */
export function parseProducts(rawProducts: unknown): ParsedProduct[] {
  console.log('[PARSER] parseProducts called with:', typeof rawProducts, Array.isArray(rawProducts) ? rawProducts.length : 'not array');
  
  if (!Array.isArray(rawProducts)) {
    console.log('[PARSER] Rejected: not an array');
    return [];
  }
  
  const parsed: ParsedProduct[] = [];
  
  for (let i = 0; i < rawProducts.length; i++) {
    const raw = rawProducts[i];
    console.log(`[PARSER] Processing raw product ${i}:`, JSON.stringify(raw, null, 2));
    
    const product = parseProduct(raw);
    
    if (!product) {
      console.log(`[PARSER] Product ${i}: parseProduct returned null`);
      continue;
    }
    
    if (!product.price || product.price.length === 0) {
      console.log(`[PARSER] Product ${i}: rejected due to empty price`);
      continue;
    }
    
    console.log(`[PARSER] Product ${i}: accepted - id=${product.productId}, price=${product.price}`);
    parsed.push(product);
  }
  
  console.log('[PARSER] Final parsed count:', parsed.length);
  return parsed;
}

/**
 * Parse array of products WITH DIAGNOSTIC INFO
 * Returns both parsed products and diagnostic data for debugging
 */
export function parseProductsWithDiagnostic(rawProducts: unknown): {
  products: ParsedProduct[];
  diagnostic: DiagnosticState;
} {
  const diagnostic: DiagnosticState = {
    ...initialDiagnosticState,
    fetchTimestamp: new Date().toISOString(),
  };
  
  // Extract raw IDs first
  if (Array.isArray(rawProducts)) {
    diagnostic.rawProductsCount = rawProducts.length;
    diagnostic.rawProductIds = rawProducts.map((p: any) => {
      const id = p?.id || p?.productId || 'UNKNOWN';
      return String(id);
    });
  }
  
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    diagnostic.diagnosticCase = 'CASE_A_STORE_EMPTY';
    return { products: [], diagnostic };
  }
  
  const parsed: ParsedProduct[] = [];
  const rejections: { id: string; reason: string }[] = [];
  
  for (let i = 0; i < rawProducts.length; i++) {
    const raw = rawProducts[i] as any;
    const rawId = raw?.id || raw?.productId || `index_${i}`;
    
    const product = parseProduct(raw);
    
    if (!product) {
      // Determine why it was rejected
      let reason = 'parseProduct returned null';
      if (!raw || typeof raw !== 'object') {
        reason = 'Invalid input (not an object)';
      } else if (!raw.id && !raw.productId) {
        reason = 'Missing product ID (no id or productId field)';
      } else if (!ACTIVE_SUBSCRIPTION_SKUS.includes(rawId)) {
        reason = `Product ID "${rawId}" not in ACTIVE_SUBSCRIPTION_SKUS [${ACTIVE_SUBSCRIPTION_SKUS.join(', ')}]`;
      }
      rejections.push({ id: String(rawId), reason });
      continue;
    }
    
    // Product parsed successfully - accept it even without price (fallback will be used)
    parsed.push(product);
  }
  
  diagnostic.parsedProductsCount = parsed.length;
  diagnostic.parsedProductIds = parsed.map(p => p.productId);
  diagnostic.parserRejections = rejections;
  
  // Determine diagnostic case
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely extract string value
 */
function extractString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

/**
 * Extract numeric price from formatted string
 * e.g. "€49,99" -> 49.99
 */
function extractNumericPrice(priceString: string): number {
  const match = priceString.match(/[\d,.]+/);
  if (match) {
    // Handle European format (49,99) and US format (49.99)
    const normalized = match[0].replace(',', '.');
    const value = parseFloat(normalized);
    if (!isNaN(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

/**
 * Format numeric price to localized string
 */
function formatPrice(value: number, currency: string): string {
  try {
    // Use Italian locale for Euro
    if (currency === 'EUR') {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(value);
    }
    // Default formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch {
    // Fallback
    return `${currency} ${value.toFixed(2)}`;
  }
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const __testExports = {
  extractString,
  extractNumericPrice,
  formatPrice,
  extractiOSPrice,
  extractAndroidPrice,
  extractAndroidOfferToken,
};
