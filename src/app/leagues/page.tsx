'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import type { League, Prediction, ActualPick, Player } from '../../lib/types';

// Define interface for league with user rank information
interface LeagueWithRank extends League {
  userRank: {
    rank: number;
    totalMembers: number;
    score?: number;
    possiblePoints?: number;
  };
}

export default function LeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  // Add this line to see your user ID
  useEffect(() => {
    if (user) {
      console.log("Current user ID:", user.uid);
    }
  }, [user]);
  
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueWithRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const fetchLeaguesWithRanks = async () => {
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
            userRank: { rank: 0, totalMembers: 0 } // Default rank
          })) as LeagueWithRank[];
          
          // 2. For each league, calculate user's rank
          const leaguesWithRanks = await Promise.all(
            leaguesData.map(async (league) => {
              // Fetch predictions for this league
              const predictionsQuery = query(
                collection(db, 'predictions'),
                where('leagueId', '==', league.id)
              );
              
              const predictionsSnapshot = await getDocs(predictionsQuery);
              const predictions: Prediction[] = [];
              
              predictionsSnapshot.forEach(doc => {
                const data = doc.data();
                predictions.push({
                  userId: data.userId,
                  leagueId: data.leagueId,
                  picks: data.picks,
                  createdAt: data.createdAt?.toDate(),
                  updatedAt: data.updatedAt?.toDate(),
                } as Prediction);
              });
              
              // If no predictions found, return league with default rank
              if (predictions.length === 0) {
                return {
                  ...league,
                  userRank: {
                    rank: 0, 
                    totalMembers: league.members.length,
                    score: 0,
                    possiblePoints: 0
                  }
                };
              }
              
              // Fetch players for this league
              const playersQuery = query(
                collection(db, 'players'),
                where('sportType', '==', league.sportType),
                where('draftYear', '==', league.draftYear)
              );
              
              const playersSnapshot = await getDocs(playersQuery);
              const players: Player[] = [];
              
              playersSnapshot.forEach(doc => {
                players.push({ id: doc.id, ...doc.data() } as Player);
              });
              
              // Fetch actual draft results
              const resultsQuery = query(
                collection(db, 'draftResults'),
                where('sportType', '==', league.sportType),
                where('draftYear', '==', league.draftYear)
              );
              
              const resultsSnapshot = await getDocs(resultsQuery);
              const results: ActualPick[] = [];
              
              resultsSnapshot.forEach(doc => {
                const data = doc.data();
                results.push({ 
                  position: data.position,
                  playerId: data.playerId,
                  sportType: data.sportType,
                  draftYear: data.draftYear,
                  teamId: data.teamId
                } as ActualPick);
              });
              
              // Calculate scores for all users
              const scores = predictions.map(prediction => {
                let score = 0;
                let possiblePoints = 0;
                
                prediction.picks.forEach(pick => {
                  const actualPick = results.find(result => result.position === pick.position);
                  
                  // Add to possible points
                  possiblePoints += pick.confidence;
                  
                  // If there's a match, add points
                  if (actualPick && actualPick.playerId === pick.playerId) {
                    score += pick.confidence;
                  }
                });
                
                return {
                  userId: prediction.userId,
                  score,
                  possiblePoints
                };
              });
              
              // Sort scores (highest first)
              scores.sort((a, b) => b.score - a.score);
              
              // Find user's score
              const userScore = scores.find(score => score.userId === user.uid);
              
              // Calculate user rank
              let userRank = { 
                rank: 0, 
                totalMembers: league.members.length,
                score: 0,
                possiblePoints: 0
              };
              
              if (userScore) {
                // Find position (accounting for ties)
                let rank = 1;
                for (const score of scores) {
                  if (score.score > userScore.score) {
                    rank++;
                  }
                }
                
                userRank = {
                  rank,
                  totalMembers: league.members.length,
                  score: userScore.score,
                  possiblePoints: userScore.possiblePoints
                };
              }
              
              return {
                ...league,
                userRank
              };
            })
          );
          
          setLeagues(leaguesWithRanks);
        } catch (error) {
          console.error('Error fetching leagues with ranks:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchLeaguesWithRanks();
    }
  }, [user, authLoading, router]);

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
          <h1 className="text-2xl font-bold">My Leagues</h1>
          <div className="bg-gray-200 h-10 w-32 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Leagues</h1>
        <Link href="/leagues/create" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Create League
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">You are not a member of any leagues yet. Create a new league or join an existing one.</p>
          
          <div className="mt-4">
            <Link href="/leagues/join" className="text-blue-600 hover:underline">
              Join a League
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map(league => (
            <Link href={`/leagues/${league.id}`} key={league.id}>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold">{league.name}</h2>
                  {renderRankBadge(league.userRank.rank, league.userRank.totalMembers)}
                </div>
                
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
          ))}
        </div>
      )}
    </div>
  );
}