'use client';
// this file is src/app/leages/page.tsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import type { League, Prediction, ActualPick } from '../../lib/types';

// Define interface for league with user rank information
interface LeagueWithRank extends League {
  // True when the current user has submitted/completed their predictions for this league
  predictionComplete: boolean;
  // True when the draft is finished (all picks have results) — used to archive the league
  isCompleted: boolean;
  userRank: {
    rank: number;
    totalMembers: number;
    score?: number;
    possiblePoints?: number;
  };
}

export default function LeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueWithRank[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For join league modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningLeague, setJoiningLeague] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchLeaguesWithRanks();
    }
  }, [user, authLoading, router]);

  const fetchLeaguesWithRanks = async () => {
    if (!user) return;

    try {
      // 1. Fetch leagues the user is in
      const leaguesQuery = query(
        collection(db, 'leagues'),
        where('members', 'array-contains', user.uid)
      );

      const leaguesSnapshot = await getDocs(leaguesQuery);
      const leaguesData = leaguesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        userRank: { rank: 0, totalMembers: 0 }
      })) as LeagueWithRank[];

      // 2. Deduplicate: group leagues by (sportType, draftYear) to avoid redundant queries
      const sportYearKeys = new Set(
        leaguesData.map(l => `${l.sportType}|${l.draftYear}`)
      );

      // 3. Fetch draft results once per unique (sportType, draftYear)
      const resultsCache = new Map<string, ActualPick[]>();
      await Promise.all(
        Array.from(sportYearKeys).map(async (key) => {
          const [sportType, yearStr] = key.split('|');
          const resultsQuery = query(
            collection(db, 'draftResults'),
            where('sportType', '==', sportType),
            where('draftYear', '==', Number(yearStr))
          );
          const resultsSnapshot = await getDocs(resultsQuery);
          const results: ActualPick[] = resultsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              position: data.position,
              playerId: data.playerId,
              sportType: data.sportType,
              draftYear: data.draftYear,
              teamId: data.teamId
            } as ActualPick;
          });
          resultsCache.set(key, results);
        })
      );

      // 4. Fetch predictions for all leagues in parallel (one query per league — unavoidable)
      const predictionsMap = new Map<string, Prediction[]>();
      await Promise.all(
        leaguesData.map(async (league) => {
          const predictionsQuery = query(
            collection(db, 'predictions'),
            where('leagueId', '==', league.id)
          );
          const predictionsSnapshot = await getDocs(predictionsQuery);
          const predictions: Prediction[] = predictionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              userId: data.userId,
              leagueId: data.leagueId,
              picks: data.picks,
              isComplete: data.isComplete,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
            } as Prediction;
          });
          predictionsMap.set(league.id, predictions);
        })
      );

      // 5. Calculate ranks using cached data (pure computation, no more queries)
      const leaguesWithRanks = leaguesData.map((league) => {
        const predictions = predictionsMap.get(league.id) || [];
        const results = resultsCache.get(`${league.sportType}|${league.draftYear}`) || [];

        // A draft is "completed" (archive) once every pick has an actual result
        const totalPicks = league.settings?.totalPicks || 0;
        const isCompleted = totalPicks > 0 && results.length >= totalPicks;

        // Whether the current user has finished their predictions for this league
        const userPrediction = predictions.find(p => p.userId === user.uid);
        const predictionComplete = userPrediction?.isComplete === true;

        if (predictions.length === 0) {
          return {
            ...league,
            predictionComplete,
            isCompleted,
            userRank: { rank: 0, totalMembers: league.members.length, score: 0, possiblePoints: 0 }
          };
        }

        const scores = predictions.map(prediction => {
          let score = 0;
          let possiblePoints = 0;

          prediction.picks.forEach(pick => {
            const actualPick = results.find(result => result.position === pick.position);
            possiblePoints += pick.confidence;
            if (actualPick && actualPick.playerId === pick.playerId) {
              score += pick.confidence;
            }
          });

          return { userId: prediction.userId, score, possiblePoints };
        });

        scores.sort((a, b) => b.score - a.score);
        const userScore = scores.find(s => s.userId === user.uid);

        let userRank = { rank: 0, totalMembers: league.members.length, score: 0, possiblePoints: 0 };
        if (userScore) {
          let rank = 1;
          for (const s of scores) {
            if (s.score > userScore.score) rank++;
          }
          userRank = { rank, totalMembers: league.members.length, score: userScore.score, possiblePoints: userScore.possiblePoints };
        }

        return { ...league, predictionComplete, isCompleted, userRank };
      });

      setLeagues(leaguesWithRanks);
    } catch (error) {
      console.error('Error fetching leagues with ranks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeague = async () => {
    if (!user || !inviteCode.trim()) return;
    
    setJoiningLeague(true);
    setJoinError('');
    setJoinSuccess('');
    
    try {
      // Search for league with this invite code
      const q = query(
        collection(db, 'leagues'),
        where('settings.inviteCode', '==', inviteCode.trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setJoinError('Invalid invite code. Please check and try again.');
        setJoiningLeague(false);
        return;
      }
      
      const leagueDoc = querySnapshot.docs[0];
      const leagueData = leagueDoc.data() as League;
      
      // Check if user is already a member
      if (leagueData.members.includes(user.uid)) {
        setJoinError('You are already a member of this league.');
        setJoiningLeague(false);
        return;
      }
      
      // Add user to league members
      const updatedMembers = [...leagueData.members, user.uid];
      
      await updateDoc(doc(db, 'leagues', leagueDoc.id), {
        members: updatedMembers
      });
      
      setJoinSuccess(`Successfully joined ${leagueData.name}!`);
      
      // Refresh leagues
      fetchLeaguesWithRanks();
      
      // Close modal after a short delay
      setTimeout(() => {
        setShowJoinModal(false);
        setInviteCode('');
      }, 1500);
      
    } catch (error) {
      console.error('Error joining league:', error);
      setJoinError('Failed to join league. Please try again.');
    } finally {
      setJoiningLeague(false);
    }
  };

  // Helper function to render rank badge
  const renderRankBadge = (rank: number, totalMembers: number) => {
    if (rank === 0) {
      return (
        <div className="text-sm text-gray-500 ml-2 px-2 py-1 bg-gray-100 rounded-full">
          No rankings yet
        </div>
      );
    }
    
    // Medal badges for top 3
    if (rank === 1) {
      return (
        <div className="flex items-center font-medium text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span>1st Place</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center font-medium text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span>2nd Place</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center font-medium text-sm bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span>3rd Place</span>
        </div>
      );
    } else {
      // Standard rank for positions 4+
      return (
        <div className="text-sm text-gray-600 px-2 py-1 bg-gray-100 rounded-full">
          Rank: {rank}/{totalMembers}
        </div>
      );
    }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">My Leagues</h1>
          <div className="bg-gray-200 h-10 w-32 rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This will not render as the useEffect will redirect
  }

  // Split leagues into live (draft not finished) and archived (draft completed)
  const liveLeagues = leagues.filter(l => !l.isCompleted);
  const archivedLeagues = leagues.filter(l => l.isCompleted);

  const renderLeagueCard = (league: LeagueWithRank) => {
    const needsPredictions = !league.isCompleted && !league.predictionComplete;
    return (
      <Link href={`/leagues/${league.id}`} key={league.id}>
        <div className={`card-hover bg-white rounded-xl shadow-sm border p-6 transition-colors cursor-pointer h-full ${
          needsPredictions
            ? 'border-amber-400 ring-2 ring-amber-300 hover:border-amber-500'
            : `border-gray-200 hover:border-blue-400 ${league.isCompleted ? 'opacity-80' : ''}`
        }`}>
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-semibold">{league.name}</h2>
            {renderRankBadge(league.userRank.rank, league.userRank.totalMembers)}
          </div>

          {needsPredictions && (
            <div className="inline-flex items-center text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded-full mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Predictions not submitted
            </div>
          )}

          <div className="flex items-center text-sm text-gray-500 mb-2">
            <span className="mr-2">{league.sportType}</span>
            <span>Draft {league.draftYear}</span>
          </div>

          {league.description && (
            <p className="text-gray-600 mb-4 line-clamp-2">{league.description}</p>
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {league.members.length} {league.members.length === 1 ? 'member' : 'members'}
            </div>

            {league.userRank.rank > 0 && (
              <div className="text-sm text-gray-600">
                Score: {league.userRank.score}/{league.userRank.possiblePoints}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">My Leagues</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Join League
          </button>
          <Link href="/leagues/create" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Create League
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600 mb-6">You are not a member of any leagues yet. Create a new league or join an existing one.</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Join a League
            </button>
            <Link href="/leagues/create" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Create a League
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {liveLeagues.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                Live Leagues
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveLeagues.map(renderLeagueCard)}
              </div>
            </section>
          )}

          {archivedLeagues.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-500 mb-4">Archive</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedLeagues.map(renderLeagueCard)}
              </div>
            </section>
          )}
        </div>
      )}
      
      {/* Join League Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Join a League</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                  setJoinError('');
                  setJoinSuccess('');
                }}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                &times;
              </button>
            </div>
            
            {joinError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                <p className="text-red-700 text-sm">{joinError}</p>
              </div>
            )}
            
            {joinSuccess && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">
                <p className="text-green-700 text-sm">{joinSuccess}</p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="inviteCode">
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter league invite code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleJoinLeague}
                disabled={joiningLeague || !inviteCode.trim()}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors ${
                  (joiningLeague || !inviteCode.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {joiningLeague ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}