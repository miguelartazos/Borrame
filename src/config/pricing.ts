import Constants from 'expo-constants';
import { logger } from '../lib/logger';

interface PricingConfig {
  monthly: {
    price: string;
    period: string;
    productId: string;
  };
  annual: {
    price: string;
    period: string;
    productId: string;
    savings: number;
  };
}

const DEFAULT_PRICING: PricingConfig = {
  monthly: {
    price: '$4.99',
    period: 'month',
    productId: 'com.swipeclean.pro.monthly',
  },
  annual: {
    price: '$39.99',
    period: 'year',
    productId: 'com.swipeclean.pro.annual',
    savings: 0.33,
  },
};

function validatePrice(price: string, fallback: string): string {
  // Validate price format: $X.XX or X.XX
  const priceRegex = /^\$?\d+(\.\d{1,2})?$/;

  if (!price || !priceRegex.test(price)) {
    logger.warn(`Invalid price format: "${price}", using fallback: "${fallback}"`);
    return fallback;
  }

  // Ensure price starts with $
  return price.startsWith('$') ? price : `$${price}`;
}

function getPricingConfig(): PricingConfig {
  const extra = Constants.expoConfig?.extra || {};

  try {
    const config: PricingConfig = {
      monthly: {
        price: validatePrice(extra.monthlyPrice, DEFAULT_PRICING.monthly.price),
        period: 'month',
        productId: extra.monthlyProductId || DEFAULT_PRICING.monthly.productId,
      },
      annual: {
        price: validatePrice(extra.annualPrice, DEFAULT_PRICING.annual.price),
        period: 'year',
        productId: extra.annualProductId || DEFAULT_PRICING.annual.productId,
        savings:
          typeof extra.annualSavings === 'number'
            ? extra.annualSavings
            : DEFAULT_PRICING.annual.savings,
      },
    };

    if (__DEV__ && (!extra.monthlyPrice || !extra.annualPrice)) {
      logger.warn('Using default pricing config - set prices in app.json extra field');
    }

    return config;
  } catch (error) {
    logger.error('Failed to load pricing config', error);
    return DEFAULT_PRICING;
  }
}

export const PRICING_CONFIG = getPricingConfig();

export function formatPrice(amount: string): string {
  // Remove any non-numeric characters except decimal point
  const numericAmount = amount.replace(/[^0-9.]/g, '');
  const value = parseFloat(numericAmount);

  if (isNaN(value)) {
    return amount; // Return original if parsing fails
  }

  // Format with proper currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function calculateSavings(monthly: number, annual: number): number {
  const monthlyTotal = monthly * 12;
  const savings = (monthlyTotal - annual) / monthlyTotal;
  return Math.round(savings * 100) / 100; // Round to 2 decimal places
}
