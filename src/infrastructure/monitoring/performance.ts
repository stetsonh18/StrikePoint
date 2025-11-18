/**
 * Performance Monitoring
 * 
 * Tracks Core Web Vitals and other performance metrics
 * Sends metrics to Sentry for monitoring and alerting
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { env } from '@/shared/utils/envValidation';

// Performance thresholds (Google's recommended values)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
} as const;

/**
 * Get performance rating (good, needs-improvement, poor)
 */
function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (metric.value <= threshold.good) return 'good';
  if (metric.value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metric to Sentry
 */
function sendToSentry(metric: Metric) {
  const rating = getRating(metric);
  
  // Create transaction for performance monitoring
  Sentry.metrics.distribution(metric.name, metric.value, {
    unit: metric.name === 'CLS' ? 'ratio' : 'millisecond',
    tags: {
      rating,
      id: metric.id,
      navigationType: metric.navigationType,
    },
  });
  
  // Log poor performance metrics as breadcrumbs
  if (rating === 'poor') {
    Sentry.addBreadcrumb({
      category: 'performance',
      level: 'warning',
      message: `${metric.name} is ${rating}: ${metric.value}${metric.name === 'CLS' ? '' : 'ms'}`,
      data: {
        value: metric.value,
        rating,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    });
  }
  
  // Log in development
  if (env.isDevelopment) {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} ${metric.name}: ${metric.value}${metric.name === 'CLS' ? '' : 'ms'} (${rating})`
    );
  }
}

/**
 * Initialize Core Web Vitals monitoring
 * Should be called after Sentry is initialized
 */
export function initPerformanceMonitoring() {
  // Only track in production or when explicitly enabled
  if (!env.isProduction && !env.sentryDsn) {
    if (env.isDevelopment) {
      console.log('[Performance] Monitoring disabled (not in production)');
    }
    return;
  }
  
  try {
    // Largest Contentful Paint - measures loading performance
    onLCP((metric) => {
      sendToSentry(metric);
    });
    
    // Cumulative Layout Shift - measures visual stability
    onCLS((metric) => {
      sendToSentry(metric);
    });
    
    // First Contentful Paint - measures perceived loading speed
    onFCP((metric) => {
      sendToSentry(metric);
    });
    
    // Time to First Byte - measures server response time
    onTTFB((metric) => {
      sendToSentry(metric);
    });
    
    // Interaction to Next Paint - measures interactivity (new metric)
    onINP((metric) => {
      sendToSentry(metric);
    });
    
    if (env.isDevelopment) {
      console.log('[Performance] Core Web Vitals monitoring initialized');
    }
  } catch (error) {
    console.error('[Performance] Failed to initialize monitoring:', error);
  }
}

/**
 * Track custom performance metric
 */
export function trackCustomMetric(name: string, value: number, unit: 'millisecond' | 'byte' | 'ratio' = 'millisecond', tags?: Record<string, string>) {
  try {
    Sentry.metrics.distribution(name, value, {
      unit,
      tags: tags || {},
    });
  } catch (error) {
    if (env.isDevelopment) {
      console.warn('[Performance] Failed to track custom metric:', error);
    }
  }
}

/**
 * Measure and track function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      trackCustomMetric(name, duration, 'millisecond', tags);
    });
  }
  
  const duration = performance.now() - start;
  trackCustomMetric(name, duration, 'millisecond', tags);
  return result;
}

/**
 * Create a performance mark
 */
export function mark(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark: string) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        trackCustomMetric(name, measure.duration, 'millisecond');
      }
    } catch (error) {
      if (env.isDevelopment) {
        console.warn('[Performance] Failed to measure:', error);
      }
    }
  }
}

