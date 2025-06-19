// src/app/mock-drafts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { StructuredData, FAQSchema } from '../../components/seo/StructuredData';
import { TrackableLink } from '../../components/seo/TrackableLink';
import { ScrollTracker } from '../analytics/ScrollTracker';
import { getMockDraftsBySportAndYear } from '../../lib/mockDrafts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MockDraft, ActualPick } from '../../lib/types';
import Head from 'next/head';

// Extended MockDraft interface with scoring
interface MockDraftWithScore extends MockDraft {
  accuracy: {
    correctPicks: number;
    totalPicks: number;
    points: number;
    possiblePoints: number;
    percentage: number;
    hasResults: boolean;
  };
}

export default function MockDraftsPage() {
  const [mockDrafts, setMockDrafts] = useState<MockDraftWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'accuracy'>('accuracy');

  // Convert sportscaster name to URL slug
  const expertNameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  useEffect(() => {
    fetchMockDraftsWithScores();
  }, []);

  const fetchMockDraftsWithScores = async () => {
    try {
      setLoading(true);
      
      // Fetch mock drafts for both NFL and NBA
      const [nflDrafts, nbaDrafts] = await Promise.all([
        getMockDraftsBySportAndYear('NFL', 2025),
        getMockDraftsBySportAndYear('NBA', 2025)
      ]);
      
      const allDrafts = [...nflDrafts, ...nbaDrafts];
      
      // For each draft, calculate accuracy if results exist
      const draftsWithScores = await Promise.all(
        allDrafts.map(async (draft) => {
          const accuracy = await calculateMockDraftAccuracy(draft);
          return {
            ...draft,
            accuracy
          } as MockDraftWithScore;
        })
      );
      
      // Sort based on current sort preference
      const sortedDrafts = sortDrafts(draftsWithScores, sortBy);
      setMockDrafts(sortedDrafts);
      
    } catch (error) {
      console.error('Error fetching mock drafts:', error);
      setError('Failed to load mock drafts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMockDraftAccuracy = async (mockDraft: MockDraft) => {
    try {
      // Get actual draft results for this sport and year
      const resultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', mockDraft.sportType),
        where('draftYear', '==', mockDraft.draftYear)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      
      if (resultsSnapshot.empty) {
        // No results available yet
        return {
          correctPicks: 0,
          totalPicks: mockDraft.picks?.length || 0,
          points: 0,
          possiblePoints: 0,
          percentage: 0,
          hasResults: false
        };
      }
      
      // Create map of actual results
      const actualResults: { [position: number]: string } = {};
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data() as ActualPick;
        actualResults[data.position] = data.playerId;
      });
      
      // Calculate scores using confidence point system
      let correctPicks = 0;
      let points = 0;
      let possiblePoints = 0;
      const totalPicks = mockDraft.picks?.length || 0;
      
      if (mockDraft.picks) {
        mockDraft.picks.forEach(pick => {
          // Calculate confidence points (higher picks worth more)
          const confidence = totalPicks - pick.position + 1;
          possiblePoints += confidence;
          
          // Check if pick is correct
          const actualPlayerId = actualResults[pick.position];
          if (actualPlayerId && actualPlayerId === pick.playerId) {
            correctPicks++;
            points += confidence;
          }
        });
      }
      
      const percentage = possiblePoints > 0 ? (points / possiblePoints) * 100 : 0;
      
      return {
        correctPicks,
        totalPicks,
        points,
        possiblePoints,
        percentage,
        hasResults: true
      };
      
    } catch (error) {
      console.error('Error calculating accuracy for mock draft:', mockDraft.id, error);
      return {
        correctPicks: 0,
        totalPicks: mockDraft.picks?.length || 0,
        points: 0,
        possiblePoints: 0,
        percentage: 0,
        hasResults: false
      };
    }
  };

  const sortDrafts = (drafts: MockDraftWithScore[], sortBy: 'date' | 'accuracy') => {
    return [...drafts].sort((a, b) => {
      if (sortBy === 'accuracy') {
        // Sort by accuracy percentage (highest first), then by date if tied
        if (a.accuracy.percentage !== b.accuracy.percentage) {
          return b.accuracy.percentage - a.accuracy.percentage;
        }
      }
      
      // Default to date sorting (newest first)
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
  };



  const getAccuracyBadge = (accuracy: MockDraftWithScore['accuracy']) => {
    if (!accuracy.hasResults) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Pending Results
        </span>
      );
    }
    
    if (accuracy.percentage >= 70) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          God Mode ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else if (accuracy.percentage >= 60) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Amazing ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else if (accuracy.percentage >= 50) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Great ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else if (accuracy.percentage >= 30) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pretty Good ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else if (accuracy.percentage >= 20) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Decent ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else if (accuracy.percentage >= 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Poor ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Very Poor ({accuracy.percentage.toFixed(1)}%)
        </span>
      );
    }
  };

  const handleSortChange = (newSortBy: 'date' | 'accuracy') => {
    setSortBy(newSortBy);
    const sortedDrafts = sortDrafts(mockDrafts, newSortBy);
    setMockDrafts(sortedDrafts);
  };

  const faqs = [
    {
      question: "What is a mock draft?",
      answer: "A mock draft is an expert's prediction of how they think a real draft will unfold, including which players will be selected by each team in order."
    },
    {
      question: "How accurate are mock drafts?",
      answer: "Mock drafts typically predict 60-75% of first round picks correctly. Accuracy decreases in later rounds due to trades and unexpected team decisions. Our scoring system shows you exactly how each expert performed."
    },
    {
      question: "How do you score mock draft accuracy?", 
      answer: "We use a confidence point system where each correct pick earns points based on draft position. Earlier picks are worth more points (Pick #1 = 32 points for NFL, Pick #2 = 31 points, etc.), and we calculate overall accuracy percentage based on points earned vs. maximum possible points."
    },
    {
      question: "Can I create my own mock draft?",
      answer: "Yes! You can create prediction leagues based on any of these mock drafts or build your own custom predictions and compete with friends."
    },
    {
      question: "Which experts are most accurate?",
      answer: "Our accuracy scores are updated in real-time as draft results come in. Use the 'Sort by Accuracy' option to see which experts have the best track record for predicting draft outcomes."
    }
  ];

  // Schema for the mock drafts collection
  const mockDraftsSchema = {
    name: "2025 Sports Mock Drafts Hub with Expert Accuracy Scores",
    description: "Comprehensive collection of NFL and NBA mock drafts from top experts with real-time accuracy scoring and performance tracking",
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
  const completedDrafts = mockDrafts.filter(draft => draft.accuracy.hasResults);
  const avgAccuracy = completedDrafts.length > 0 
    ? completedDrafts.reduce((sum, draft) => sum + draft.accuracy.percentage, 0) / completedDrafts.length 
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mock drafts and calculating accuracy scores...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags for Client Component */}
      <Head>
        <title>2025 Mock Drafts with Expert Accuracy Scores: NFL, NBA Predictions | Draft Day Trades</title>
        <meta name="description" content="Latest 2025 NFL and NBA mock drafts from top experts with real-time accuracy scores. See which experts predicted the draft best and create your own prediction leagues." />
        <meta name="keywords" content="mock draft 2025, NFL mock draft accuracy, NBA mock draft scores, expert predictions, draft accuracy tracking, best mock draft experts" />
        <link rel="canonical" href="https://draftdaytrades.com/mock-drafts" />
        <meta property="og:title" content="2025 Mock Drafts with Expert Accuracy Scores: NFL, NBA Predictions" />
        <meta property="og:description" content="Latest 2025 NFL and NBA mock drafts from top experts with real-time accuracy scores. See which experts predicted the draft best and create your own prediction leagues." />
        <meta property="og:url" content="https://draftdaytrades.com/mock-drafts" />
        <meta property="og:type" content="article" />
      </Head>

      <ScrollTracker pageName="/mock-drafts" />
      
      <StructuredData type="WebPage" data={mockDraftsSchema} />
      <FAQSchema faqs={faqs} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">2025 Mock Drafts: Expert Predictions & Accuracy Scores</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare the latest mock drafts from top experts with real-time accuracy tracking. 
            See which experts predicted the draft best and create your own prediction leagues.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <div className="text-center bg-blue-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{mockDrafts.length}</div>
            <div className="text-gray-600">Total Mock Drafts</div>
          </div>
          <div className="text-center bg-green-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{completedDrafts.length}</div>
            <div className="text-gray-600">With Results</div>
          </div>
          <div className="text-center bg-purple-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{nflDrafts.length}</div>
            <div className="text-gray-600">NFL Mock Drafts</div>
          </div>
          <div className="text-center bg-orange-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{nbaDrafts.length}</div>
            <div className="text-gray-600">NBA Mock Drafts</div>
          </div>
          <div className="text-center bg-yellow-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {avgAccuracy > 0 ? `${avgAccuracy.toFixed(1)}%` : 'TBD'}
            </div>
            <div className="text-gray-600">Avg Accuracy</div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Expert Mock Drafts</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSortChange('accuracy')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortBy === 'accuracy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Accuracy
            </button>
            <button
              onClick={() => handleSortChange('date')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortBy === 'date'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Date
            </button>
          </div>
        </div>

        {/* Sport Sections */}
        <div className="space-y-12">
          {/* NFL Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">NFL Mock Drafts 2025</h2>
              {/* <TrackableLink
                href="/nfl/2025/mock-drafts"
                fromPage="/mock-drafts"
                linkText="View All NFL Mock Drafts"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All NFL Mock Drafts →
              </TrackableLink> */}
            </div>
            
            {nflDrafts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No NFL mock drafts available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Expert Rankings - {nflDrafts.length} Mock Drafts
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {nflDrafts.map((draft, index) => (
                    <div key={draft.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-8 text-center">
                            <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{draft.sportscaster}</h3>
                              <span className="text-sm text-gray-500">Version {draft.version}</span>
                              {getAccuracyBadge(draft.accuracy)}
                            </div>
                            {draft.accuracy.hasResults && (
                              <div className="text-sm text-gray-600">
                                {draft.accuracy.correctPicks}/{draft.accuracy.totalPicks} correct picks • {draft.accuracy.points}/{draft.accuracy.possiblePoints} points
                              </div>
                            )}
                            {!draft.accuracy.hasResults && (
                              <div className="text-sm text-gray-600">
                                {draft.picks?.length || 0} picks • Results pending
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <TrackableLink
                            href={`/mock-drafts/nfl/2025/${expertNameToSlug(draft.sportscaster)}`}
                            fromPage="/mock-drafts"
                            linkText={`View ${draft.sportscaster} Mock Draft`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View mock →
                          </TrackableLink>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* NBA Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">NBA Mock Drafts 2025</h2>
              {/* <TrackableLink
                href="/nba/2025/mock-drafts"
                fromPage="/mock-drafts"
                linkText="View All NBA Mock Drafts"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All NBA Mock Drafts →
              </TrackableLink> */}
            </div>
            
            {nbaDrafts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No NBA mock drafts available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Expert Rankings - {nbaDrafts.length} Mock Drafts
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {nbaDrafts.map((draft, index) => (
                    <div key={draft.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-8 text-center">
                            <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{draft.sportscaster}</h3>
                              <span className="text-sm text-gray-500">Version {draft.version}</span>
                              {getAccuracyBadge(draft.accuracy)}
                            </div>
                            {draft.accuracy.hasResults && (
                              <div className="text-sm text-gray-600">
                                {draft.accuracy.correctPicks}/{draft.accuracy.totalPicks} correct picks • {draft.accuracy.points}/{draft.accuracy.possiblePoints} points
                              </div>
                            )}
                            {!draft.accuracy.hasResults && (
                              <div className="text-sm text-gray-600">
                                {draft.picks?.length || 0} picks • Results pending
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <TrackableLink
                            href={`/mock-drafts/nba/2025/${expertNameToSlug(draft.sportscaster)}`}
                            fromPage="/mock-drafts"
                            linkText={`View ${draft.sportscaster} NBA Mock Draft`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View mock →
                          </TrackableLink>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* How Accuracy Works */}
        <section className="bg-gray-50 rounded-lg p-8 mt-12">
          <h2 className="text-2xl font-bold mb-4">How We Score Mock Draft Accuracy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Confidence Point System</h3>
              <p className="text-gray-600 mb-4">
                We use the same confidence point system that our prediction leagues use. Each correct pick earns points 
                based on draft position - earlier picks are worth significantly more points.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Pick #1 correct = 32 points (NFL) / 30 points (NBA)</li>
                <li>• Pick #2 correct = 31 points (NFL) / 29 points (NBA)</li>
                <li>• Pick #32 correct = 1 point (NFL) / Pick #30 = 1 point (NBA)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600 mb-4">
                Accuracy scores are calculated in real-time as official draft results are announced. 
                This gives you the most up-to-date view of which experts are performing best.
              </p>
              <div className="bg-white p-4 rounded border">
                <div className="font-mono text-sm">
                  Accuracy = (Points Earned / Max Points) × 100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Example: 400 earned / 528 possible = 75.8% accuracy
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
            Use any of these expert mock drafts as a starting point for your own prediction contest, 
            or compete against the experts with your own predictions
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