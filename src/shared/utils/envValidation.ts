/**
 * Environment Variable Validation
 * 
 * Validates all required and optional environment variables at application startup.
 * Provides clear error messages for missing or invalid configuration.
 */

interface EnvConfig {
  // Required variables
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Optional variables
  sentryDsn?: string;
  sentryEnableDev?: boolean;
  appVersion?: string;
  stripePublishableKey?: string;
  stripeRegularPriceId?: string;
  stripeEarlyAdopterPriceId?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvConfig | null;
}

/**
 * Validates Supabase URL format
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') &&
      urlObj.hostname.includes('supabase') &&
      (urlObj.hostname.includes('.co') || urlObj.hostname.includes('.io'))
    );
  } catch {
    return false;
  }
}

/**
 * Validates Sentry DSN format
 */
function isValidSentryDsn(dsn: string): boolean {
  try {
    // Sentry DSN format: https://<key>@<host>/<project-id>
    const dsnPattern = /^https:\/\/[a-f0-9]+@[a-z0-9.-]+\.(sentry\.io|ingest\.sentry\.io)\/[0-9]+$/;
    return dsnPattern.test(dsn);
  } catch {
    return false;
  }
}

/**
 * Validates all environment variables
 * Should be called at application startup
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Optional variables
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const sentryEnableDev = import.meta.env.VITE_SENTRY_ENABLE_DEV;
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeRegularPriceId = import.meta.env.VITE_STRIPE_REGULAR_PRICE_ID;
  const stripeEarlyAdopterPriceId = import.meta.env.VITE_STRIPE_EARLY_ADOPTER_PRICE_ID;
  
  // Validate required variables
  if (!supabaseUrl) {
    errors.push(
      'VITE_SUPABASE_URL is required but not set. ' +
      'Get it from: https://app.supabase.com/project/_/settings/api'
    );
  } else if (!isValidSupabaseUrl(supabaseUrl)) {
    errors.push(
      `VITE_SUPABASE_URL has invalid format: "${supabaseUrl}". ` +
      'Expected format: https://your-project.supabase.co'
    );
  }
  
  if (!supabaseAnonKey) {
    errors.push(
      'VITE_SUPABASE_ANON_KEY is required but not set. ' +
      'Get it from: https://app.supabase.com/project/_/settings/api'
    );
  } else if (supabaseAnonKey.length < 100) {
    warnings.push(
      'VITE_SUPABASE_ANON_KEY seems too short. ' +
      'Please verify you copied the full key.'
    );
  }
  
  // Validate optional variables
  if (sentryDsn && !isValidSentryDsn(sentryDsn)) {
    warnings.push(
      `VITE_SENTRY_DSN has invalid format: "${sentryDsn}". ` +
      'Expected format: https://key@sentry.io/project-id'
    );
  }
  
  if (import.meta.env.PROD && !sentryDsn) {
    warnings.push(
      'VITE_SENTRY_DSN is not set. Error tracking is disabled in production. ' +
      'Consider setting it up for better error monitoring.'
    );
  }

  // Stripe configuration (optional - only needed for checkout/subscriptions)
  if (!stripePublishableKey) {
    warnings.push(
      'VITE_STRIPE_PUBLISHABLE_KEY is not set. Checkout and subscription features will be disabled. ' +
      'Create one in Stripe and add it to your environment variables if you need payment functionality.'
    );
  }

  if (!stripeRegularPriceId && !stripeEarlyAdopterPriceId) {
    warnings.push(
      'Neither VITE_STRIPE_REGULAR_PRICE_ID nor VITE_STRIPE_EARLY_ADOPTER_PRICE_ID is set. ' +
      'Subscription checkout will not be available without a configured price ID.'
    );
  }
  
  // Build config object if valid
  let config: EnvConfig | null = null;
  if (errors.length === 0) {
    config = {
      supabaseUrl: supabaseUrl!,
      supabaseAnonKey: supabaseAnonKey!,
      sentryDsn: sentryDsn || undefined,
      sentryEnableDev: sentryEnableDev === 'true',
      appVersion: appVersion || undefined,
      stripePublishableKey: stripePublishableKey || undefined,
      stripeRegularPriceId: stripeRegularPriceId || undefined,
      stripeEarlyAdopterPriceId: stripeEarlyAdopterPriceId || undefined,
    };
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Get validated environment configuration
 * Throws error if validation fails
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnvironmentVariables();
  
  if (!validation.valid) {
    const errorMessage = [
      'Environment variable validation failed:',
      ...validation.errors.map(err => `  - ${err}`),
      '',
      'Please check your .env file or hosting platform environment variables.',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  // Log warnings in development
  if (validation.warnings.length > 0 && import.meta.env.DEV) {
    console.warn('Environment variable warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`  ⚠️ ${warning}`);
    });
  }
  
  return validation.config!;
}

/**
 * Type-safe environment variable access
 */
export const env = {
  // Required
  get supabaseUrl() {
    return import.meta.env.VITE_SUPABASE_URL;
  },
  get supabaseAnonKey() {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  },
  
  // Optional
  get sentryDsn() {
    return import.meta.env.VITE_SENTRY_DSN;
  },
  get sentryEnableDev() {
    return import.meta.env.VITE_SENTRY_ENABLE_DEV === 'true';
  },
  get appVersion() {
    return import.meta.env.VITE_APP_VERSION;
  },
  get stripePublishableKey() {
    return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  },
  get stripeRegularPriceId() {
    return import.meta.env.VITE_STRIPE_REGULAR_PRICE_ID;
  },
  get stripeEarlyAdopterPriceId() {
    return import.meta.env.VITE_STRIPE_EARLY_ADOPTER_PRICE_ID;
  },
  
  // System
  get isDevelopment() {
    return import.meta.env.DEV;
  },
  get isProduction() {
    return import.meta.env.PROD;
  },
  get mode() {
    return import.meta.env.MODE;
  },
} as const;

