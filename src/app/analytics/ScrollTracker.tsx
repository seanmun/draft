'use client';
// src/components/analytics/ScrollTracker.tsx
import { useEffect } from 'react';

interface ScrollTrackerProps {
  pageName: string;
}

// Simple event tracking function
const trackScrollEvent = (percentage: number, page: string): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'scroll_depth', {
      event_category: 'Engagement',
      event_label: page,
      value: percentage,
    });
  }
  
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Scroll: ${percentage}% on ${page}`);
  }
};

export function ScrollTracker({ pageName }: ScrollTrackerProps) {
  useEffect(() => {
    let ticking = false;
    const milestones = [25, 50, 75, 90];
    const reached = new Set<number>();

    const trackScroll = (): void => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.floor((scrollTop / docHeight) * 100);

      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          trackScrollEvent(milestone, pageName);
        }
      });

      ticking = false;
    };

    const onScroll = (): void => {
      if (!ticking) {
        requestAnimationFrame(trackScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pageName]);

  return null;
}