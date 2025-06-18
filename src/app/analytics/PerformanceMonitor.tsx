'use client';
// src/components/analytics/PerformanceMonitor.tsx
import { useEffect } from 'react';

// Define Web Vitals interfaces since they're not in standard DOM types
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

// Simple Google Analytics setup component
export function GoogleAnalytics() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Core Web Vitals tracking
    const trackWebVitals = (): void => {
      // Only run if PerformanceObserver is supported
      if (typeof PerformanceObserver === 'undefined') {
        return;
      }

      try {
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = lastEntry.startTime;
          
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'LCP', {
              event_category: 'Web Vitals',
              event_label: 'LCP',
              value: Math.round(lcp),
              non_interaction: true,
            });
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const eventEntry = entry as FirstInputEntry;
            const fid = eventEntry.processingStart - eventEntry.startTime;
            
            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('event', 'FID', {
                event_category: 'Web Vitals',
                event_label: 'FID',
                value: Math.round(fid),
                non_interaction: true,
              });
            }
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutEntry = entry as LayoutShiftEntry;
            if (!layoutEntry.hadRecentInput) {
              clsValue += layoutEntry.value;
            }
          }
          
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'CLS', {
              event_category: 'Web Vitals',
              event_label: 'CLS',
              value: Math.round(clsValue * 1000),
              non_interaction: true,
            });
          }
        }).observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance monitoring not supported:', error);
      }
    };

    // Track after page load
    if (document.readyState === 'complete') {
      trackWebVitals();
    } else {
      window.addEventListener('load', trackWebVitals);
    }
  }, []);

  return null;
}