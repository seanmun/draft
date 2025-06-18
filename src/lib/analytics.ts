// src/lib/analytics.ts
// Simple analytics without external dependencies

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

// Google Analytics 4 tracking ID
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Page view tracking
export const pageview = (url: string): void => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Generic event tracking
export const trackEvent = (
  action: string, 
  category: string, 
  label?: string, 
  value?: number
): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// SEO-specific event tracking functions
export const trackSEOEvents = {
  // Track internal link clicks for SEO insights
  internalLinkClick: (fromPage: string, toPage: string, linkText: string): void => {
    trackEvent('internal_link_click', 'SEO', `${fromPage} -> ${toPage}: ${linkText}`, 1);
  },

  // Track search behavior
  siteSearch: (searchTerm: string, resultsCount: number): void => {
    trackEvent('site_search', 'Search', searchTerm, resultsCount);
  },

  // Track league creation for conversion insights
  leagueCreated: (sport: string, totalPicks: number): void => {
    trackEvent('league_created', 'Conversion', sport, totalPicks);
  },

  // Track prediction completion
  predictionCompleted: (sport: string, leagueSize: number): void => {
    trackEvent('prediction_completed', 'Engagement', sport, leagueSize);
  },

  // Track page depth for engagement
  scrollDepth: (percentage: number, page: string): void => {
    trackEvent('scroll_depth', 'Engagement', page, percentage);
  }
};

// Simple console logging for development (you can remove this in production)
export const logEvent = (eventName: string, data?: Record<string, unknown>): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Analytics Event: ${eventName}`, data);
  }
};