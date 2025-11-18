/**
 * Analytics Tracker Component
 * Tracks page views on route changes
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/infrastructure/analytics/analytics';

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  return null;
}

