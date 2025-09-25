// src/app/mock-drafts/[sport]/[year]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getMockDraftsBySportAndYear } from '../../../../lib/mockDrafts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { MockDraft, ActualPick } from '../../../../lib/types';
import { StructuredData, FAQSchema } from '../../../../components/seo/StructuredData';
import { TrackableLink } from '../../../../components/seo/TrackableLink';
import { ScrollTracker } from '../../../analytics/ScrollTracker';
import Link from 'next/link';
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

export default function SportYearMockDraftsPage() {
  const params = useParams();
  const sport = (params.sport as string)?.toUpperCase();
  const year = parseInt(params.year as string);

  const [mockDrafts, setMockDrafts] = useState<MockDraftWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'accuracy'>('accuracy');

  // Validate params
  if (!sport || !year || isNaN(year)) {
    return notFound();
  }

  // Validate sport
  const validSports = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];
  if (!validSports.includes(sport)) {
    return notFound();
  }

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
  }, [sport, year]);

  const fetchMockDraftsWithScores = async () => {
    try {
      setLoading(true);

      // Fetch mock drafts for this sport and year
      const drafts = await getMockDraftsBySportAndYear(sport as any, year);

      // For each draft, calculate accuracy if results exist
      const draftsWithScores = await Promise.all(
        drafts.map(async (draft) => {
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

  const completedDrafts = mockDrafts.filter(draft => draft.accuracy.hasResults);
  const avgAccuracy = completedDrafts.length > 0
    ? completedDrafts.reduce((sum, draft) => sum + draft.accuracy.percentage, 0) / completedDrafts.length
    : 0;

  const pageTitle = `${year} ${sport} Mock Drafts - Expert Predictions & Accuracy Scores`;
  const pageDescription = `Compare ${year} ${sport} mock drafts from top experts with real-time accuracy tracking. See which experts predicted the draft best.`;

  const faqs = [
    {
      question: `How many ${sport} mock drafts are available for ${year}?`,
      answer: `We currently have ${mockDrafts.length} ${sport} mock drafts for ${year} from various experts and analysts.`
    },
    {
      question: `Which ${sport} mock draft expert is most accurate?`,
      answer: completedDrafts.length > 0
        ? `Based on completed ${sport} drafts, our accuracy scores show the most accurate experts. Use the 'Sort by Accuracy' option to see current rankings.`
        : `Accuracy rankings will be available once the ${year} ${sport} draft is completed and results are calculated.`
    },
    {
      question: `How often are ${sport} mock drafts updated?`,
      answer: `Mock drafts are updated regularly as experts release new versions leading up to the ${year} ${sport} draft. Check back frequently for the latest predictions.`
    }
  ];

  // Schema for the sport/year page
  const pageSchema = {
    name: `${year} ${sport} Mock Drafts Hub`,
    description: pageDescription,
    url: `https://draftdaytrades.com/mock-drafts/${sport.toLowerCase()}/${year}`,
    about: {
      '@type': 'SportsEvent',
      name: `${year} ${sport} Draft`,
      sport: sport
    },
    creator: {
      '@type': 'Organization',
      name: 'Draft Day Trades'
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading {sport} mock drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle} | Draft Day Trades</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`${year} ${sport} mock draft, ${sport} mock draft accuracy, ${sport} draft predictions, best ${sport} mock draft experts`} />
        <link rel="canonical" href={`https://draftdaytrades.com/mock-drafts/${sport.toLowerCase()}/${year}`} />
      </Head>

      <ScrollTracker pageName={`/mock-drafts/${sport.toLowerCase()}/${year}`} />

      <StructuredData type="WebPage" data={pageSchema} />
      <FAQSchema faqs={faqs} />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm breadcrumbs mb-6">
          <ol className="list-none p-0 inline-flex">
            <li className="flex items-center">
              <Link href="/" className="text-blue-600 hover:text-blue-800">Home</Link>
              <span className="mx-2">/</span>
            </li>
            <li className="flex items-center">
              <Link href="/mock-drafts" className="text-blue-600 hover:text-blue-800">Mock Drafts</Link>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-500">{year} {sport} Mock Drafts</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{year} {sport} Mock Drafts: Expert Predictions & Accuracy</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare the latest {year} {sport} mock drafts from top experts with real-time accuracy tracking.
            See which experts are predicting the draft best.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center bg-blue-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{mockDrafts.length}</div>
            <div className="text-gray-600">{sport} Mock Drafts</div>
          </div>
          <div className="text-center bg-green-50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{completedDrafts.length}</div>
            <div className="text-gray-600">With Results</div>
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
          <h2 className="text-2xl font-bold">{year} {sport} Expert Mock Drafts</h2>
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

        {/* Mock Drafts List */}
        {mockDrafts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No {sport} mock drafts available for {year} yet. Check back soon!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Expert Rankings - {mockDrafts.length} Mock Drafts
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {mockDrafts.map((draft, index) => (
                <div key={draft.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{draft.sportscaster}</h3>
                          <span className="text-sm text-gray-500">{draft.version}</span>
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
                        href={`/mock-drafts/${sport.toLowerCase()}/${year}/${expertNameToSlug(draft.sportscaster)}`}
                        fromPage={`/mock-drafts/${sport.toLowerCase()}/${year}`}
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
          <h2 className="text-2xl font-bold mb-4">Create Your Own {sport} Prediction League</h2>
          <p className="text-xl mb-6 opacity-90">
            Use any of these expert {sport} mock drafts as a starting point for your own prediction contest
          </p>
          <TrackableLink
            href="/leagues/create"
            fromPage={`/mock-drafts/${sport.toLowerCase()}/${year}`}
            linkText={`Create ${sport} Prediction League`}
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg inline-block"
          >
            Create Your League
          </TrackableLink>
        </section>
      </div>
    </>
  );
}