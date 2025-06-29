// src/app/layout.tsx - Updated with analytics
import './globals.css';
import Layout from '../components/layout/Layout';
import { GoogleAnalytics, PerformanceMonitor } from '../app/analytics/PerformanceMonitor';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Draft Day Trades | Sports Draft Prediction Pools',
  description: 'Create and join sports draft confidence pools. Predict NFL, NBA, and MLB draft picks, assign confidence points, and compete with friends in real-time during draft night.',
  keywords: 'sports draft, prediction pools, fantasy sports, NFL draft, NBA draft, confidence pools, draft day',
  openGraph: {
    title: 'Draft Day Trades | Sports Draft Prediction Pools',
    description: 'Predict draft picks, assign confidence points, and compete with friends',
    url: 'https://draftdaytrades.com',
    siteName: 'Draft Day Trades',
    images: [
      {
        url: 'https://www.draftdaytrades.com/images/ddt_gettleman.png',
        width: 1200,
        height: 630,
        alt: 'Draft Day Trades',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draft Day Trades | Sports Draft Prediction Pools',
    description: 'Predict draft picks, assign confidence points, and compete with friends',
    creator: '@seanmun',
    images: ['https://www.draftdaytrades.com/images/ddt_gettleman.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
    other: [
      { rel: 'manifest', url: '/manifest.json' },
    ],
  },
  // Add additional SEO verification meta tags
  verification: {
    google: 'your-google-search-console-verification-code',
    // other: {
    //   'msvalidate.01': 'your-bing-verification-code',
    // },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics - only loads if GA_ID is set */}
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        <Layout>{children}</Layout>
        
        {/* Performance monitoring - tracks Core Web Vitals */}
        <PerformanceMonitor />
      </body>
    </html>
  );
}