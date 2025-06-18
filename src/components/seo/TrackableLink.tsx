'use client';
// src/components/seo/TrackableLink.tsx
import Link from 'next/link';
import { ReactNode } from 'react';

interface TrackableLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  fromPage: string;
  linkText: string;
}

// Simple analytics tracking function (you can expand this later)
const trackInternalLink = (fromPage: string, toPage: string, linkText: string): void => {
  // For now, just console log - you can add Google Analytics later
  console.log('Internal link clicked:', { fromPage, toPage, linkText });
  
  // If you have Google Analytics setup, uncomment this:
  // if (typeof window !== 'undefined' && (window as any).gtag) {
  //   (window as any).gtag('event', 'internal_link_click', {
  //     event_category: 'SEO',
  //     event_label: `${fromPage} -> ${toPage}`,
  //     custom_parameter_linktext: linkText
  //   });
  // }
};

export function TrackableLink({ 
  href, 
  children, 
  className, 
  fromPage, 
  linkText 
}: TrackableLinkProps) {
  const handleClick = (): void => {
    trackInternalLink(fromPage, href, linkText);
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

// Simple version without tracking for when you just want a regular Link
interface SimpleLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function SimpleLink({ 
  href, 
  children, 
  className 
}: SimpleLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}