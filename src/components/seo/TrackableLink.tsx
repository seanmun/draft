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

const trackInternalLink = (fromPage: string, toPage: string, linkText: string): void => {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'internal_link_click', {
      event_category: 'SEO',
      event_label: `${fromPage} -> ${toPage}`,
      custom_parameter_linktext: linkText
    });
  }
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