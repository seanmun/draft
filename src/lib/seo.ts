// src/lib/seo.ts
import { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  sport?: string;
  year?: number;
}

export function generateMetadata({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  sport,
  year
}: SEOConfig): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://draftdaytrades.com';
  const fullTitle = `${title} | Draft Day Trades`;
  const imageUrl = ogImage || `${baseUrl}/og-default.jpg`;
  
  return {
    title: fullTitle,
    description: description,
    keywords: keywords || `draft predictions, ${sport || 'sports'} draft, fantasy sports, ${year || new Date().getFullYear()}`,
    
    openGraph: {
      title: fullTitle,
      description: description,
      url: canonicalUrl || baseUrl,
      siteName: 'Draft Day Trades',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: ogType,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime })
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: description,
      images: [imageUrl],
      site: '@draftdaytrades',
      creator: '@draftdaytrades'
    },
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
  };
}

// Types for sport metadata
type SportType = 'NFL' | 'NBA' | 'NHL' | 'MLB' | 'WNBA';
type PageType = 'predictions' | 'players' | 'teams' | 'mock-drafts';

interface SportMetadata {
  title: string;
  description: string;
  keywords: string;
}

// Helper function to generate sport/year specific metadata
export function generateSportMetadata(sport: SportType, year: number, pageType: PageType): SportMetadata {
  const sportNames: Record<SportType, string> = {
    'NFL': 'NFL',
    'NBA': 'NBA', 
    'NHL': 'NHL',
    'MLB': 'MLB',
    'WNBA': 'WNBA'
  };
  
  const sportName = sportNames[sport];
  
  const titles: Record<PageType, string> = {
    'predictions': `${year} ${sportName} Draft Predictions & Mock Draft Simulator`,
    'players': `${year} ${sportName} Draft Prospects & Player Rankings`,
    'teams': `${year} ${sportName} Draft Team Needs & Analysis`,
    'mock-drafts': `${year} ${sportName} Mock Drafts & Expert Predictions`
  };
  
  const descriptions: Record<PageType, string> = {
    'predictions': `Create and join ${year} ${sportName} draft prediction leagues. Expert analysis, player rankings, and mock draft simulator. Free to play with friends!`,
    'players': `Complete ${year} ${sportName} draft prospect profiles with college stats, NFL projections, and team fit analysis. Updated player rankings and scouting reports.`,
    'teams': `${year} ${sportName} draft team needs analysis. See which positions each team is targeting and best available prospects by team fit.`,
    'mock-drafts': `Latest ${year} ${sportName} mock drafts from top experts. Compare predictions and create your own draft simulation leagues.`
  };
  
  return {
    title: titles[pageType] || `${year} ${sportName} Draft`,
    description: descriptions[pageType] || `${year} ${sportName} draft information and predictions`,
    keywords: `${year} ${sportName} draft, ${sportName} draft predictions, ${sportName} mock draft, ${sportName} prospects, fantasy ${sportName}`
  };
}