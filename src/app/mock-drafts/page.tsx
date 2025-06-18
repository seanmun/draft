// src/app/mock-drafts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { StructuredData, FAQSchema } from '../../components/seo/StructuredData';
import { TrackableLink } from '../../components/seo/TrackableLink';
import { ScrollTracker } from '../analytics/ScrollTracker';
import { getMockDraftsBySportAndYear } from '../../lib/mockDrafts';
import { MockDraft } from '../../lib/types';
import Head from 'next/head';

export default function MockDraftsPage() {
  const [mockDrafts, setMockDrafts] = useState<MockDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMockDrafts();
  }, []);

  const fetchMockDrafts = async () => {
    try {
      setLoading(true);
      
      // Fetch mock drafts for both NFL and NBA
      const [nflDrafts, nbaDrafts] = await Promise.all([
        getMockDraftsBySportAndYear('NFL', 2025),
        getMockDraftsBySportAndYear('NBA', 2025)
      ]);
      
      // Debug: Log the data structure
      console.log('NFL Drafts:', nflDrafts);
      console.log('NBA Drafts:', nbaDrafts);
      
      // Combine and sort by date (newest first)
      const allDrafts = [...nflDrafts, ...nbaDrafts].sort((a, b) => {
        const getDateFromTimestamp = (timestamp: unknown): Date => {
          if (!timestamp) return new Date(0);
          if (timestamp instanceof Date) return timestamp;
          if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
            return (timestamp as { toDate: () => Date }).toDate();
          }
          if (typeof timestamp === 'string') {
            const parsed = new Date(timestamp);
            return isNaN(parsed.getTime()) ? new Date(0) : parsed;
          }
          if (typeof timestamp === 'number') {
            return new Date(timestamp);
          }
          return new Date(0);
        };
            
        const dateA = getDateFromTimestamp(a.updatedAt);
        const dateB = getDateFromTimestamp(b.updatedAt);
            
        return dateB.getTime() - dateA.getTime();
      });
      
      setMockDrafts(allDrafts);
    } catch (error) {
      console.error('Error fetching mock drafts:', error);
      setError('Failed to load mock drafts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: unknown): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firebase Timestamp
      if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
        return (date as { toDate: () => Date }).toDate().toLocaleDateString();
      }
      
      // Handle Date object
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      
      // Handle string dates
      if (typeof date === 'string') {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
      }
      
      // Handle timestamp numbers
      if (typeof date === 'number') {
        return new Date(date).toLocaleDateString();
      }
      
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const faqs = [
    {
      question: "What is a mock draft?",
      answer: "A mock draft is an expert's prediction of how they think a real draft will unfold, including which players will be selected by each team in order."
    },
    {
      question: "How accurate are mock drafts?",
      answer: "Mock drafts typically predict 60-75% of first round picks correctly. Accuracy decreases in later rounds due to trades and unexpected team decisions."
    },
    {
      question: "How do you score mock draft accuracy?", 
      answer: "We use a chalk point system where each correct pick earns points based on draft position. Earlier picks are worth more points, and we calculate overall accuracy percentage."
    },
    {
      question: "Can I create my own mock draft?",
      answer: "Yes! You can create prediction leagues based on any of these mock drafts or build your own custom predictions and compete with friends."
    }
  ];

  // Schema for the mock drafts collection
  const mockDraftsSchema = {
    name: "2025 Sports Mock Drafts Hub",
    description: "Comprehensive collection of NFL and NBA mock drafts from top experts with accuracy scoring",
    url: "https://draftdaytrades.com/mock-drafts",
    about: [
      {
        "@type": "SportsEvent",
        name: "2025 NFL Draft",
        sport: "American Football"
      },
      {
        "@type": "SportsEvent", 
        name: "2025 NBA Draft",
        sport: "Basketball"
      }
    ],
    creator: {
      "@type": "Organization",
      name: "Draft Day Trades"
    }
  };

  const nflDrafts = mockDrafts.filter(draft => draft.sportType === 'NFL');
  const nbaDrafts = mockDrafts.filter(draft => draft.sportType === 'NBA');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mock drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags for Client Component */}
      <Head>
        <title>2025 Mock Drafts: NFL, NBA Expert Predictions & Analysis | Draft Day Trades</title>
        <meta name="description" content="Latest 2025 NFL and NBA mock drafts from top experts. Compare predictions, see accuracy scores, and create your own draft simulation leagues." />
        <meta name="keywords" content="mock draft 2025, NFL mock draft, NBA mock draft, draft predictions, expert mock draft, draft simulator" />
        <link rel="canonical" href="https://draftdaytrades.com/mock-drafts" />
        <meta property="og:title" content="2025 Mock Drafts: NFL, NBA Expert Predictions & Analysis" />
        <meta property="og:description" content="Latest 2025 NFL and NBA mock drafts from top experts. Compare predictions, see accuracy scores, and create your own draft simulation leagues." />
        <meta property="og:url" content="https://draftdaytrades.com/mock-drafts" />
        <meta property="og:type" content="article" />
      </Head>

      <ScrollTracker pageName="/mock-drafts" />
      
      <StructuredData type="WebPage" data={mockDraftsSchema} />
      <FAQSchema faqs={faqs} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">2025 Mock Drafts: NFL & NBA Expert Predictions</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare the latest mock drafts from top experts, see accuracy scores from previous years, 
            and create your own prediction leagues based on expert analysis.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center bg-blue-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{mockDrafts.length}</div>
            <div className="text-gray-600">Expert Mock Drafts</div>
          </div>
          <div className="text-center bg-green-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-green-600">2</div>
            <div className="text-gray-600">Sports Covered</div>
          </div>
          <div className="text-center bg-purple-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{nflDrafts.length}</div>
            <div className="text-gray-600">NFL Mock Drafts</div>
          </div>
          <div className="text-center bg-orange-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{nbaDrafts.length}</div>
            <div className="text-gray-600">NBA Mock Drafts</div>
          </div>
        </div>

        {/* Sport Sections */}
        <div className="space-y-12">
          {/* NFL Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">NFL Mock Drafts 2025</h2>
              <TrackableLink
                href="/nfl/2025/mock-drafts"
                fromPage="/mock-drafts"
                linkText="View All NFL Mock Drafts"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All NFL Mock Drafts →
              </TrackableLink>
            </div>
            
            {nflDrafts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No NFL mock drafts available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nflDrafts.map(draft => (
                  <div key={draft.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{draft.sportscaster}</h3>
                        <p className="text-gray-600">Version {draft.version}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{draft.picks?.length || 0}</div>
                        <div className="text-sm text-gray-500">Total Picks</div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {draft.picks?.length || 0} picks • Updated {formatDate(draft.updatedAt)}
                    </p>
                    
                    <TrackableLink
                      href={`/nfl/2025/mock-drafts/${draft.id}`}
                      fromPage="/mock-drafts"
                      linkText={`View ${draft.sportscaster} Mock Draft`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View mock &rarr;
                    </TrackableLink>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* NBA Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">NBA Mock Drafts 2025</h2>
              <TrackableLink
                href="/nba/2025/mock-drafts"
                fromPage="/mock-drafts"
                linkText="View All NBA Mock Drafts"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All NBA Mock Drafts →
              </TrackableLink>
            </div>
            
            {nbaDrafts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No NBA mock drafts available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nbaDrafts.map(draft => (
                  <div key={draft.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{draft.sportscaster}</h3>
                        <p className="text-gray-600">Version {draft.version}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{draft.picks?.length || 0}</div>
                        <div className="text-sm text-gray-500">Total Picks</div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {draft.picks?.length || 0} picks • Updated {formatDate(draft.updatedAt)}
                    </p>
                    
                    <TrackableLink
                      href={`/nba/2025/mock-drafts/${draft.id}`}
                      fromPage="/mock-drafts"
                      linkText={`View ${draft.sportscaster} NBA Mock Draft`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View mock &rarr;
                    </TrackableLink>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* How Accuracy Works */}
        <section className="bg-gray-50 rounded-lg p-8 mt-12">
          <h2 className="text-2xl font-bold mb-4">How We Score Mock Draft Accuracy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Chalk Point System</h3>
              <p className="text-gray-600 mb-4">
                We use the same confidence point system that users play with. Each correct pick earns points 
                based on draft position - earlier picks are worth more points.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Pick #1 correct = 32 points (NFL) / 30 points (NBA)</li>
                <li>• Pick #2 correct = 31 points (NFL) / 29 points (NBA)</li>
                <li>• Pick #32 correct = 1 point (NFL) / Pick #30 = 1 point (NBA)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Accuracy Calculation</h3>
              <p className="text-gray-600 mb-4">
                Total points earned divided by maximum possible points, giving a percentage that 
                rewards both correct picks and getting high-value picks right.
              </p>
              <div className="bg-white p-4 rounded border">
                <div className="font-mono text-sm">
                  Accuracy = (Points Earned / Max Points) × 100
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="border border-gray-200 rounded-lg">
                <summary className="p-4 cursor-pointer hover:bg-gray-50 font-medium">
                  {faq.question}
                </summary>
                <div className="px-4 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 text-white rounded-lg p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Create Your Own Draft Prediction League</h2>
          <p className="text-xl mb-6 opacity-90">
            Use any of these expert mock drafts as a starting point for your own prediction contest
          </p>
          <TrackableLink
            href="/leagues/create"
            fromPage="/mock-drafts"
            linkText="Create League from Mock Drafts"
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg inline-block"
          >
            Create Your League
          </TrackableLink>
        </section>
      </div>
    </>
  );
}