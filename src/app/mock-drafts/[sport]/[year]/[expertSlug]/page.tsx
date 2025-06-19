// src/app/mock-drafts/[sport]/[year]/[expertSlug]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { MockDraft, ActualPick, Player } from '../../../../../lib/types';
import { StructuredData, FAQSchema } from '../../../../../components/seo/StructuredData';
import { TrackableLink } from '../../../../../components/seo/TrackableLink';
import Link from 'next/link';
import Head from 'next/head';

// Extended interfaces for this page
interface MockDraftWithAccuracy extends MockDraft {
  accuracy: {
    correctPicks: number;
    totalPicks: number;
    points: number;
    possiblePoints: number;
    percentage: number;
    hasResults: boolean;
  };
}

interface PickAnalysis {
  position: number;
  predictedPlayerId: string;
  predictedPlayer: Player | null;
  actualPlayerId: string | null;
  actualPlayer: Player | null;
  isCorrect: boolean;
  points: number;
  confidence: number;
}

export default function MockDraftDetailPage() {
  const params = useParams();
  const sport = (params.sport as string)?.toUpperCase();
  const year = parseInt(params.year as string);
  const expertSlug = params.expertSlug as string;

  const [mockDraft, setMockDraft] = useState<MockDraftWithAccuracy | null>(null);
  const [pickAnalysis, setPickAnalysis] = useState<PickAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sport && year && expertSlug) {
      fetchMockDraftData();
    }
  }, [sport, year, expertSlug]);

  // Convert sportscaster name to URL slug
  const sportscasterNameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const fetchMockDraftData = async () => {
    try {
      setLoading(true);
      // Find mock draft by sportscaster name (fuzzy match)
      const mockDraftsQuery = query(
        collection(db, 'mockDrafts'),
        where('sportType', '==', sport),
        where('draftYear', '==', year)
      );

      const mockDraftsSnapshot = await getDocs(mockDraftsQuery);
      let foundMockDraft: MockDraft | null = null;

      // Find matching sportscaster (case-insensitive, fuzzy match)
      mockDraftsSnapshot.docs.forEach(doc => {
        const data = doc.data() as MockDraft;
        const docSportscasterSlug = sportscasterNameToSlug(data.sportscaster);
        if (docSportscasterSlug === expertSlug) {
          foundMockDraft = {
            id: doc.id,
            sportscaster: data.sportscaster,
            version: data.version,
            sportType: data.sportType,
            draftYear: data.draftYear,
            picks: data.picks,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        }
      });

      if (!foundMockDraft) {
        setError('Mock draft not found');
        setLoading(false);
        return;
      }

      // Get all players for this sport/year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', sport),
        where('draftYear', '==', year)
      );

      const playersSnapshot = await getDocs(playersQuery);
      const playersMap: {[key: string]: Player} = {};
      
      playersSnapshot.docs.forEach(doc => {
        playersMap[doc.id] = { id: doc.id, ...doc.data() } as Player;
      });

      // Get actual draft results
      const resultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', sport),
        where('draftYear', '==', year)
      );

      const resultsSnapshot = await getDocs(resultsQuery);
      const actualResults: { [position: number]: string } = {};
      
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data() as ActualPick;
        actualResults[data.position] = data.playerId;
      });

      // Calculate accuracy
      const accuracy = calculateAccuracy(foundMockDraft, actualResults);
      const mockDraftWithAccuracy: MockDraftWithAccuracy = Object.assign({}, foundMockDraft, { accuracy });

      setMockDraft(mockDraftWithAccuracy);

      // Generate pick-by-pick analysis
      const analysis = generatePickAnalysis(foundMockDraft, actualResults, playersMap);
      setPickAnalysis(analysis);

    } catch (error) {
      console.error('Error fetching mock draft:', error);
      setError('Failed to load mock draft data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAccuracy = (mockDraft: MockDraft, actualResults: { [position: number]: string }) => {
    let correctPicks = 0;
    let points = 0;
    let possiblePoints = 0;
    const totalPicks = mockDraft.picks?.length || 0;
    const hasResults = Object.keys(actualResults).length > 0;

    if (mockDraft.picks) {
      mockDraft.picks.forEach(pick => {
        const confidence = totalPicks - pick.position + 1;
        possiblePoints += confidence;

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
      hasResults
    };
  };

  const generatePickAnalysis = (
    mockDraft: MockDraft, 
    actualResults: { [position: number]: string },
    playersMap: {[key: string]: Player}
  ): PickAnalysis[] => {
    if (!mockDraft.picks) return [];

    return mockDraft.picks
      .sort((a, b) => a.position - b.position)
      .map(pick => {
        const predictedPlayer = playersMap[pick.playerId] || null;
        const actualPlayerId = actualResults[pick.position] || null;
        const actualPlayer = actualPlayerId ? playersMap[actualPlayerId] || null : null;
        const isCorrect = actualPlayerId === pick.playerId;
        const totalPicks = mockDraft.picks?.length || 0;
        const confidence = totalPicks - pick.position + 1;
        const points = isCorrect ? confidence : 0;

        return {
          position: pick.position,
          predictedPlayerId: pick.playerId,
          predictedPlayer,
          actualPlayerId,
          actualPlayer,
          isCorrect,
          points,
          confidence
        };
      });
  };

  const getAccuracyGrade = (percentage: number): { grade: string; color: string; description: string } => {
    if (percentage >= 70) return { grade: 'S+', color: 'text-purple-600', description: 'God Mode' };
    if (percentage >= 60) return { grade: 'A+', color: 'text-green-600', description: 'Amazing' };
    if (percentage >= 50) return { grade: 'A', color: 'text-green-600', description: 'Great' };
    if (percentage >= 40) return { grade: 'B+', color: 'text-blue-600', description: 'Very Good' };
    if (percentage >= 30) return { grade: 'B', color: 'text-blue-600', description: 'Pretty Good' };
    if (percentage >= 20) return { grade: 'B-', color: 'text-yellow-600', description: 'Decent' };
    if (percentage >= 15) return { grade: 'C+', color: 'text-orange-600', description: 'Below Average' };
    if (percentage >= 10) return { grade: 'C', color: 'text-orange-600', description: 'Poor' };
    return { grade: 'D', color: 'text-red-600', description: 'Very Poor' };
  };

  const formatDate = (date: unknown): string => {
    if (!date) return 'Unknown';
    
    try {
      if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
        return (date as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (date instanceof Date) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mock draft analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !mockDraft) {
    return notFound();
  }

  const accuracyGrade = getAccuracyGrade(mockDraft.accuracy.percentage);
  const pageTitle = `${mockDraft.sportscaster} ${year} ${sport} Mock Draft ${mockDraft.version}`;
  const pageDescription = mockDraft.accuracy.hasResults 
    ? `${mockDraft.sportscaster}'s ${year} ${sport} mock draft analysis. ${mockDraft.accuracy.correctPicks}/${mockDraft.accuracy.totalPicks} picks correct (${mockDraft.accuracy.percentage.toFixed(1)}% accuracy). See which predictions were right and wrong.`
    : `${mockDraft.sportscaster}'s ${year} ${sport} mock draft predictions. Complete first round analysis with expert picks and team fits.`;

  const faqs = [
    {
      question: `How accurate was ${mockDraft.sportscaster}'s ${year} ${sport} mock draft?`,
      answer: mockDraft.accuracy.hasResults 
        ? `${mockDraft.sportscaster} correctly predicted ${mockDraft.accuracy.correctPicks} out of ${mockDraft.accuracy.totalPicks} picks (${mockDraft.accuracy.percentage.toFixed(1)}% accuracy) in their ${mockDraft.version} ${year} ${sport} mock draft.`
        : `Results are not yet available for the ${year} ${sport} draft. Accuracy will be calculated once the actual draft takes place.`
    },
    {
      question: `When was this mock draft published?`,
      answer: `This mock draft was published on ${formatDate(mockDraft.createdAt)} and last updated on ${formatDate(mockDraft.updatedAt)}.`
    },
    {
      question: `How is mock draft accuracy calculated?`,
      answer: `We use a confidence point system where each correct pick earns points based on draft position. Earlier picks are worth more points (Pick #1 = ${mockDraft.accuracy.totalPicks} points, Pick #2 = ${mockDraft.accuracy.totalPicks - 1} points, etc.). The accuracy percentage is calculated as points earned divided by maximum possible points.`
    }
  ];

  // Structured data for SEO
  const articleSchema = {
    headline: pageTitle,
    description: pageDescription,
    author: {
      '@type': 'Person',
      name: mockDraft.sportscaster
    },
    publisher: {
      '@type': 'Organization',
      name: 'Draft Day Trades'
    },
    datePublished: mockDraft.createdAt ? formatDate(mockDraft.createdAt) : undefined,
    dateModified: mockDraft.updatedAt ? formatDate(mockDraft.updatedAt) : undefined,
    about: {
      '@type': 'SportsEvent',
      name: `${year} ${sport} Draft`,
      sport: sport
    },
    mainEntity: {
      '@type': 'Game',
      name: `${mockDraft.sportscaster} ${year} ${sport} Mock Draft`,
      description: pageDescription
    }
  };

  return (
    <>
      <Head>
        <title>{pageTitle} - Accuracy Analysis | Draft Day Trades</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`${mockDraft.sportscaster}, ${year} ${sport} mock draft, ${sport} mock draft accuracy, ${mockDraft.sportscaster} predictions, ${sport} draft predictions`} />
        <link rel="canonical" href={`https://draftdaytrades.com/mock-drafts/${sport.toLowerCase()}/${year}/${expertSlug}`} />
      </Head>

      <StructuredData type="Article" data={articleSchema} />
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
            <li className="flex items-center">
              <Link href={`/mock-drafts/${sport.toLowerCase()}/${year}`} className="text-blue-600 hover:text-blue-800">
                {year} {sport} Mock Drafts
              </Link>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-500">{mockDraft.sportscaster}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {mockDraft.sportscaster} {year} {sport} Mock Draft
          </h1>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-lg text-gray-600">{mockDraft.version}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">Updated {formatDate(mockDraft.updatedAt)}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{mockDraft.picks?.length || 0} Picks</span>
          </div>

          {mockDraft.accuracy.hasResults && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${accuracyGrade.color}`}>{accuracyGrade.grade}</div>
                  <div className="text-sm text-gray-600">Overall Grade</div>
                  <div className="text-xs text-gray-500">{accuracyGrade.description}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{mockDraft.accuracy.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                  <div className="text-xs text-gray-500">{mockDraft.accuracy.points}/{mockDraft.accuracy.possiblePoints} points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{mockDraft.accuracy.correctPicks}</div>
                  <div className="text-sm text-gray-600">Correct Picks</div>
                  <div className="text-xs text-gray-500">out of {mockDraft.accuracy.totalPicks}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{mockDraft.accuracy.totalPicks - mockDraft.accuracy.correctPicks}</div>
                  <div className="text-sm text-gray-600">Incorrect Picks</div>
                  <div className="text-xs text-gray-500">missed predictions</div>
                </div>
              </div>
            </div>
          )}

          {!mockDraft.accuracy.hasResults && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-700">
                <strong>Draft Results Pending:</strong> Accuracy analysis will be available once the {year} {sport} draft takes place.
              </p>
            </div>
          )}
        </div>

        {/* Pick-by-Pick Analysis */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold">Pick-by-Pick Analysis</h2>
            <p className="text-gray-600 mt-1">
              Detailed breakdown of {mockDraft.sportscaster}&rsquo;s predictions vs. actual results
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 md:px-4">
                    Pick
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-4">
                    Predicted
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-4">
                    Actual Pick
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 md:px-4">
                    Result
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:px-4">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pickAnalysis.map((pick) => (
                  <tr key={pick.position} className={pick.isCorrect ? 'bg-green-50' : pick.actualPlayer ? 'bg-red-50' : ''}>
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 md:px-4">
                      #{pick.position}
                    </td>
                    <td className="px-2 py-4 text-sm md:px-4">
                      {pick.predictedPlayer ? (
                        <div>
                          <div className="font-medium text-gray-900">{pick.predictedPlayer.name}</div>
                          <div className="text-xs text-gray-500">
                            {pick.predictedPlayer.position} • {pick.predictedPlayer.school || 'Unknown School'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown Player</span>
                      )}
                    </td>
                    <td className="px-2 py-4 text-sm md:px-4">
                      {pick.actualPlayer ? (
                        <div>
                          <div className="font-medium text-gray-900">{pick.actualPlayer.name}</div>
                          <div className="text-xs text-gray-500">
                            {pick.actualPlayer.position} • {pick.actualPlayer.school || 'Unknown School'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not yet selected</span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center text-sm md:px-4">
                      {pick.actualPlayer ? (
                        pick.isCorrect ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Wrong
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-medium md:px-4">
                      <div className={pick.isCorrect ? 'text-green-600' : 'text-gray-400'}>
                        {pick.points}/{pick.confidence}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <TrackableLink
            href="/leagues/create"
            fromPage={`/mock-drafts/${sport.toLowerCase()}/${year}/${expertSlug}`}
            linkText={`Create League Based on ${mockDraft.sportscaster} Mock`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-center"
          >
            Create League Based on This Mock
          </TrackableLink>
          
          <TrackableLink
            href={`/mock-drafts/${sport.toLowerCase()}/${year}`}
            fromPage={`/mock-drafts/${sport.toLowerCase()}/${year}/${expertSlug}`}
            linkText="Back to All Mock Drafts"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg text-center"
          >
            View All {year} {sport} Mock Drafts
          </TrackableLink>
        </div>

        {/* FAQ Section */}
        <section className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
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
      </div>
    </>
  );
}