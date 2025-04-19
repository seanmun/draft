// src/app/leagues/[leagueId]/leaderboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import type { League, Player, Prediction, ActualPick } from '../../../../lib/types';
import UserAvatar from '../../../../components/common/UserAvatar';

// Import the isAdmin utility
import { isAdmin } from '../../../../lib/admin';

interface UserScore {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalPoints: number;
  possiblePoints: number;
  correctPicks: number;
  totalPicks: number;
}

// Define an extended ActualPick type that includes an id and timestamp
interface ActualPickWithId extends ActualPick {
  id: string;
  timestamp?: Date;
}

export default function LeaderboardPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<{[key: string]: Player}>({});
  const [actualPicks, setActualPicks] = useState<{[key: number]: ActualPickWithId | null}>({});
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Define ADMIN_USER_ID through the isAdmin function
  const checkIsAdmin = (userId: string) => isAdmin(userId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && leagueId) {
      fetchLeagueAndData();
    }
  }, [leagueId, user, authLoading, router]);
  
  const fetchLeagueAndData = async () => {
    setLoading(true);
    try {
      // Get league data
      const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
      
      if (!leagueDoc.exists()) {
        setError('League not found');
        setLoading(false);
        return;
      }
      
      const leagueData = { id: leagueDoc.id, ...leagueDoc.data() } as League;
      
      // Check if user is a member
      if (!leagueData.members.includes(user!.uid)) {
        setError('You are not a member of this league');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
      
      // Get all players for this sport and year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      const playersMap: {[key: string]: Player} = {};
      
      playersSnapshot.docs.forEach(doc => {
        playersMap[doc.id] = {
          id: doc.id,
          ...doc.data()
        } as Player;
      });
      
      setPlayers(playersMap);
      
      // Get global draft results from draftResults collection
      const draftResultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      const draftResultsSnapshot = await getDocs(draftResultsQuery);
      const actualPicksMap: {[key: number]: ActualPickWithId | null} = {};
      
      // Initialize with empty picks
      for (let i = 1; i <= leagueData.settings.totalPicks; i++) {
        actualPicksMap[i] = null;
      }
      
      // Fill with actual results
      draftResultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const pickData: ActualPickWithId = {
          id: doc.id,
          position: data.position,
          playerId: data.playerId,
          sportType: data.sportType,
          draftYear: data.draftYear,
          teamId: data.teamId
        };
        
        // Only add timestamp if it exists in the data
        if (data.timestamp) {
          pickData.timestamp = data.timestamp.toDate();
        }
        
        actualPicksMap[pickData.position] = pickData;
      });
      
      setActualPicks(actualPicksMap);
      
      // Get all predictions for this league
      const predictionsQuery = query(
        collection(db, 'predictions'),
        where('leagueId', '==', leagueId)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      const predictionsData = predictionsSnapshot.docs.map(doc => doc.data() as Prediction);
      
      setPredictions(predictionsData);
      
      // Calculate scores
      const userScores: UserScore[] = [];
      const userMap: {[key: string]: string} = {};
      
      // Add the current user to the map
      userMap[user!.uid] = user!.displayName || 'Anonymous';
      
      // Try to fetch user profiles for all members
      for (const memberId of leagueData.members) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userMap[memberId] = userData.displayName || `User ${memberId.substring(0, 5)}`;
          }
        } catch (e) {
          console.error(`Error fetching user ${memberId}:`, e);
        }
      }
      
      // Create initial scores for all league members
      leagueData.members.forEach(memberId => {
        userScores.push({
          userId: memberId,
          displayName: userMap[memberId] || `User ${memberId.substring(0, 5)}`,
          photoURL: memberId === user!.uid ? user!.photoURL || undefined : undefined,
          totalPoints: 0,
          possiblePoints: 0,
          correctPicks: 0,
          totalPicks: 0
        });
      });
      
      // Calculate scores based on predictions and actual picks
      predictionsData.forEach(prediction => {
        const userScore = userScores.find(s => s.userId === prediction.userId);
        if (!userScore) return;
        
        let totalPoints = 0;
        let possiblePoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;
        
        prediction.picks.forEach(pick => {
          const actualPick = actualPicksMap[pick.position];
          
          // Add to possible points
          possiblePoints += pick.confidence;
          totalPicks++;
          
          // If there's a match, add points
          if (actualPick && actualPick.playerId === pick.playerId) {
            totalPoints += pick.confidence;
            correctPicks++;
          }
        });
        
        userScore.totalPoints = totalPoints;
        userScore.possiblePoints = possiblePoints;
        userScore.correctPicks = correctPicks;
        userScore.totalPicks = totalPicks;
      });
      
      // Sort by total points (highest first)
      userScores.sort((a, b) => b.totalPoints - a.totalPoints);
      
      setScores(userScores);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const getPlayerById = (playerId: string) => {
    return players[playerId] || null;
  };
  
  const getUserPrediction = (userId: string) => {
    return predictions.find(p => p.userId === userId) || null;
  };
  
  // Mock team data
  const mockTeamPicks: {[key: number]: {team: string}} = {
    1: { team: 'Bears' },
    2: { team: 'Commanders' },
    3: { team: 'Patriots' },
    4: { team: 'Cardinals' },
    5: { team: 'Chargers' },
    6: { team: 'Giants' },
    7: { team: 'Titans' },
    8: { team: 'Falcons' },
    9: { team: 'Bears' },
    10: { team: 'Jets' },
    // Add more teams for the remaining picks
  };
  
  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; // Redirect handled in useEffect
  }
  
  if (error && !league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={() => router.push('/leagues')}
          className="text-blue-600 hover:underline"
        >
          Back to leagues
        </button>
      </div>
    );
  }
  
  if (!league) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <Link href={`/leagues/${leagueId}`} className="text-blue-600 hover:underline">
          Back to League
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">{league.name} - Leaderboard</h2>
        <p className="text-blue-700">
          View current standings based on draft picks and confidence points.
        </p>
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-1">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Standings
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Click on a user to view their picks
            </p>
          </div>
          <div className="bg-white overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {scores.map((score, index) => (
                <li 
                  key={score.userId} 
                  className={`px-4 py-4 hover:bg-gray-50 cursor-pointer ${
                    selectedUser === score.userId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedUser(score.userId)}
                >
                  <div className="flex items-center">
                    <div className="min-w-6 mr-4 text-gray-700 font-medium">
                      {index + 1}.
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <UserAvatar 
                          userId={score.userId}
                          size="sm"
                          className="mr-3"
                        />
                        <span className="font-medium text-gray-900">{score.displayName}</span>
                        {score.userId === user.uid && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{score.totalPoints}</div>
                      <div className="text-xs text-gray-500">{score.correctPicks}/{score.totalPicks} correct</div>
                    </div>
                  </div>
                </li>
              ))}
              
              {scores.length === 0 && (
                <li className="px-4 py-6 text-center text-gray-500">
                  No predictions have been made yet
                </li>
              )}
            </ul>
          </div>
        </div>
        
        {/* User's Picks Detail */}
        <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-2">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {selectedUser ? 
                `${scores.find(s => s.userId === selectedUser)?.displayName}'s Picks` : 
                'Select a user to view picks'
              }
            </h3>
            {selectedUser && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Points: {scores.find(s => s.userId === selectedUser)?.totalPoints} / 
                {scores.find(s => s.userId === selectedUser)?.possiblePoints}
              </p>
            )}
          </div>
          
          {selectedUser ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 md:px-3">
                      Pick
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 md:w-28 md:px-3">
                      Team
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3">
                      Prediction
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3">
                      Actual Pick
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 md:px-3">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const userPrediction = getUserPrediction(selectedUser);
                    if (!userPrediction) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                            No predictions found for this user
                          </td>
                        </tr>
                      );
                    }
                    
                    return userPrediction.picks
                      .sort((a, b) => a.position - b.position)
                      .map(pick => {
                        const predictedPlayer = getPlayerById(pick.playerId);
                        const actualPick = actualPicks[pick.position];
                        const actualPlayer = actualPick ? getPlayerById(actualPick.playerId) : null;
                        const teamInfo = mockTeamPicks[pick.position] || { team: 'TBD' };
                        const isCorrect = actualPick && actualPick.playerId === pick.playerId;
                        
                        return (
                          <tr key={pick.position} className={isCorrect ? 'bg-green-50' : ''}>
                            <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-3">
                              {pick.position}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-900 md:px-3">
                              {teamInfo.team}
                            </td>
                            <td className="px-2 py-3 text-xs md:text-sm text-gray-500 md:px-3">
                              {predictedPlayer ? (
                                <div>
                                  <div className="font-medium text-gray-900">{predictedPlayer.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {predictedPlayer.position} • {predictedPlayer.school || 'Unknown School'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-xs md:text-sm text-gray-500 md:px-3">
                              {actualPlayer ? (
                                <div>
                                  <div className="font-medium text-gray-900">{actualPlayer.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {actualPlayer.position} • {actualPlayer.school || 'Unknown School'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not yet selected</span>
                              )}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm md:px-3">
                              <div className="flex items-center">
                                <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                                  {isCorrect ? pick.confidence : '0'}
                                </span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-500">{pick.confidence}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Select a user from the leaderboard to view their picks
            </div>
          )}
        </div>
      </div>
      
      {/* Admin action: Global Oracle Link */}
      {(checkIsAdmin(user.uid)) && (
        <div className="mt-6 flex justify-end">
          <Link
            href="/manage-draft"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Global Draft Oracle
          </Link>
        </div>
      )}
    </div>
  );
}