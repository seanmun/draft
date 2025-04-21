'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import type { League, Player, Prediction, ActualPick, Team, UserProfile } from '../../../../lib/types';
import UserAvatar from '../../../../components/common/UserAvatar';

// Import the isAdmin utility
import { isAdmin } from '../../../../lib/admin';

interface UserScore {
  userId: string;
  displayName: string;
  photoURL?: string;
  paymentInfo?: string;
  totalPoints: number;
  possiblePoints: number;
  potentialPoints: number;
  correctPicks: number;
  totalPicks: number;
  remainingPicks: number;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [actualPicks, setActualPicks] = useState<{[key: number]: ActualPickWithId | null}>({});
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [draftIsLive, setDraftIsLive] = useState<boolean>(false);
  const [draftIsCompleted, setDraftIsCompleted] = useState<boolean>(false);
  const [adminNote, setAdminNote] = useState<string>('');
  
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
    if (!user) return; // Early return if user is null
    
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
      if (!leagueData.members.includes(user.uid)) {
        setError('You are not a member of this league');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
      
      // Get teams for this sport and year
      const teamsQuery = query(
        collection(db, 'teams'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Get all players for this sport and year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Get global draft results from draftResults collection
      const draftResultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Get draft settings
      const draftSettingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Fetch data in parallel
      const [teamsSnapshot, playersSnapshot, draftResultsSnapshot, draftSettingsSnapshot] = await Promise.all([
        getDocs(teamsQuery),
        getDocs(playersQuery),
        getDocs(draftResultsQuery),
        getDocs(draftSettingsQuery)
      ]);
      
      // Process teams data
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      setTeams(teamsData);
      
      const playersMap: {[key: string]: Player} = {};
      
      playersSnapshot.docs.forEach(doc => {
        playersMap[doc.id] = {
          id: doc.id,
          ...doc.data()
        } as Player;
      });
      
      setPlayers(playersMap);
      
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
      
      // Get league-specific note if available
      const leagueSettingsQuery = query(
        collection(db, 'leagueSettings'),
        where('leagueId', '==', leagueId)
      );
      
      const leagueSettingsSnapshot = await getDocs(leagueSettingsQuery);
      let leagueNote = '';
      
      if (!leagueSettingsSnapshot.empty) {
        const settingsData = leagueSettingsSnapshot.docs[0].data();
        leagueNote = settingsData.note || '';
      }
      
      // Get all predictions for this league
      const predictionsQuery = query(
        collection(db, 'predictions'),
        where('leagueId', '==', leagueId)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      const predictionsData = predictionsSnapshot.docs.map(doc => doc.data() as Prediction);
      
      setPredictions(predictionsData);
      
      // Get all user profiles to gather payment information
      const userProfilesMap: Record<string, UserProfile> = {};
      
      // Fetch user profiles for all league members
      for (const memberId of leagueData.members) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfilesMap[memberId] = {
              id: memberId,
              email: userData.email || '',
              displayName: userData.displayName || `User ${memberId.substring(0, 5)}`,
              photoURL: userData.photoURL,
              paymentInfo: userData.paymentInfo || ''
            };
          }
        } catch (e) {
          console.error(`Error fetching user ${memberId}:`, e);
        }
      }
      
      // Calculate scores
      const userScores: UserScore[] = [];
      
      // Create initial scores for all league members
      leagueData.members.forEach(memberId => {
        const userProfile = userProfilesMap[memberId] || {
          id: memberId,
          displayName: memberId === user.uid ? user.displayName || 'Anonymous' : `User ${memberId.substring(0, 5)}`,
          email: memberId === user.uid ? user.email || '' : '',
          photoURL: memberId === user.uid ? user.photoURL || undefined : undefined
        };
        
        userScores.push({
          userId: memberId,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          paymentInfo: userProfile.paymentInfo,
          totalPoints: 0,
          possiblePoints: 0,
          potentialPoints: 0,
          correctPicks: 0,
          totalPicks: 0,
          remainingPicks: 0
        });
      });
      
      // Calculate scores based on predictions and actual picks
      predictionsData.forEach(prediction => {
        const userScore = userScores.find(s => s.userId === prediction.userId);
        if (!userScore) return;
        
        let totalPoints = 0;
        let possiblePoints = 0;
        let potentialPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;
        let remainingPicks = 0;
        
        prediction.picks.forEach(pick => {
          const actualPick = actualPicksMap[pick.position];
          
          // Add to possible points
          possiblePoints += pick.confidence;
          totalPicks++;
          
          if (actualPick) {
            // If there's an actual pick (draft has happened for this position)
            if (actualPick.playerId === pick.playerId) {
              // Correct pick
              totalPoints += pick.confidence;
              potentialPoints += pick.confidence;
              correctPicks++;
            }
          } else {
            // Draft hasn't happened for this position yet
            potentialPoints += pick.confidence; // Add potential points
            remainingPicks++;
          }
        });
        
        userScore.totalPoints = totalPoints;
        userScore.possiblePoints = possiblePoints;
        userScore.potentialPoints = potentialPoints;
        userScore.correctPicks = correctPicks;
        userScore.totalPicks = totalPicks;
        userScore.remainingPicks = remainingPicks;
      });
      
      // Sort by total points (highest first)
      userScores.sort((a, b) => b.totalPoints - a.totalPoints);
      
      setScores(userScores);
      
      // Process draft settings
      let isLive = false;
      let isCompleted = false;
      let globalNote = '';
      
      if (!draftSettingsSnapshot.empty) {
        const settingsData = draftSettingsSnapshot.docs[0].data();
        isLive = settingsData.isLive === true;
        isCompleted = settingsData.isCompleted === true;
        globalNote = settingsData.adminNote || '';
      }
      
      setDraftIsLive(isLive);
      setDraftIsCompleted(isCompleted);
      setAdminNote(leagueNote || globalNote);
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
  
  const getTeamByPick = (position: number) => {
    return teams.find(t => t.pick === position) || null;
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
      
      {/* Winners Showcase (Only show when draft is completed) */}
      {draftIsCompleted && scores.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-6 rounded-lg">
          <h2 className="text-xl font-bold text-purple-800 mb-4">🏆 Draft Complete - Winners 🏆</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* First Place */}
            {scores.length > 0 && (
              <div className="bg-yellow-100 rounded-lg p-4 border border-yellow-300 text-center">
                <div className="text-yellow-600 text-4xl mb-1">🥇</div>
                <div className="text-lg font-bold text-gray-900">1st Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={scores[0]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{scores[0]?.displayName}</div>
                <div className="text-2xl font-bold text-yellow-700 mt-1">{scores[0]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {scores[0]?.correctPicks}/{scores[0]?.totalPicks} correct picks
                </div>
                {scores[0]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-yellow-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{scores[0]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Second Place (if exists) */}
            {scores.length > 1 && (
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 text-center">
                <div className="text-gray-600 text-4xl mb-1">🥈</div>
                <div className="text-lg font-bold text-gray-900">2nd Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={scores[1]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{scores[1]?.displayName}</div>
                <div className="text-2xl font-bold text-gray-700 mt-1">{scores[1]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {scores[1]?.correctPicks}/{scores[1]?.totalPicks} correct picks
                </div>
                {scores[1]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{scores[1]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Third Place (if exists) */}
            {scores.length > 2 && (
              <div className="bg-orange-100 rounded-lg p-4 border border-orange-300 text-center">
                <div className="text-orange-600 text-4xl mb-1">🥉</div>
                <div className="text-lg font-bold text-gray-900">3rd Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={scores[2]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{scores[2]?.displayName}</div>
                <div className="text-2xl font-bold text-orange-700 mt-1">{scores[2]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {scores[2]?.correctPicks}/{scores[2]?.totalPicks} correct picks
                </div>
                {scores[2]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-orange-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{scores[2]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Admin Note */}
          {adminNote && (
            <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
              <h3 className="font-bold text-purple-800 mb-2">League Notes</h3>
              <div className="text-gray-700 whitespace-pre-line">{adminNote}</div>
            </div>
          )}
        </div>
      )}
      
      {!draftIsLive && !draftIsCompleted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Draft Not Yet Live</h2>
          <p className="text-yellow-700">
            Predictions are hidden until the draft goes live. Check back 15 minutes before the draft begins.
          </p>
        </div>
      )}
      
      {/* Main content - conditionally render based on draft status */}
      {draftIsLive || draftIsCompleted ? (
        /* Original content when draft is live or completed */
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
                    } ${draftIsCompleted && index < 3 ? 'border-l-4 border-' + (
                      index === 0 ? 'yellow-400' : index === 1 ? 'gray-400' : 'orange-400'
                    ) : ''}`}
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
                          {draftIsCompleted && index === 0 && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              1st 🏆
                            </span>
                          )}
                          {draftIsCompleted && index === 1 && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              2nd 🥈
                            </span>
                          )}
                          {draftIsCompleted && index === 2 && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              3rd 🥉
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{score.totalPoints}</div>
                        <div className="text-xs text-gray-500">
                          {score.correctPicks}/{score.totalPicks} correct
                          {!draftIsCompleted && (
                            <span className="text-blue-600 ml-1" title="Potential points if all remaining picks are correct">
                              • {score.potentialPoints} potential
                            </span>
                          )}
                        </div>
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
                <div className="mt-1 max-w-2xl text-sm text-gray-500">
                  <p>
                    Current Points: {scores.find(s => s.userId === selectedUser)?.totalPoints} / 
                    {scores.find(s => s.userId === selectedUser)?.possiblePoints}
                  </p>
                  {!draftIsCompleted && (
                    <p className="text-blue-600">
                      Potential Points: {scores.find(s => s.userId === selectedUser)?.potentialPoints} / 
                      {scores.find(s => s.userId === selectedUser)?.possiblePoints}
                      <span className="text-xs ml-2 text-gray-500">
                        (if all remaining picks are correct)
                      </span>
                    </p>
                  )}
                  {draftIsCompleted && selectedUser && scores.find(s => s.userId === selectedUser)?.paymentInfo && (
                    <p className="text-purple-600 mt-1">
                      <span className="font-medium">Payment Info:</span> {scores.find(s => s.userId === selectedUser)?.paymentInfo}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {selectedUser ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8 md:px-2">
                        #
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 md:w-28 md:px-3">
                        Team
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3 w-40 md:w-64">
                        Prediction
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3 w-40 md:w-64">
                        Actual Pick
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 md:px-3">
                        Points
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 md:px-3">
                        Conf
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const userPrediction = getUserPrediction(selectedUser);
                      if (!userPrediction) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
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
                          const team = getTeamByPick(pick.position);
                          const isCorrect = actualPick && actualPick.playerId === pick.playerId;
                          
                          return (
                            <tr key={pick.position} className={isCorrect ? 'bg-green-50' : ''}>
                              <td className="px-1 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-2">
                                {pick.position}
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-900 md:px-3">
                                {team ? (
                                  <div className="flex items-center">
                                    {team.logoUrl && (
                                      <img src={team.logoUrl} alt={team.name} className="h-5 w-5 mr-2" />
                                    )}
                                    {/* Only show team name on desktop */}
                                    <span className="hidden md:inline">{team.name}</span>
                                  </div>
                                ) : (
                                  `Pick ${pick.position}`
                                )}
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
                                  <span className={`font-medium ${isCorrect ? 'text-green-600' : actualPick ? 'text-gray-400' : 'text-blue-600'}`}>
                                    {isCorrect ? pick.confidence : (actualPick ? '0' : '?')}
                                  </span>
                                  <span className="text-gray-400 mx-1">/</span>
                                  <span className="text-gray-500">{pick.confidence}</span>
                                </div>
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm md:px-3">
                                <span className="font-medium text-gray-900">{pick.confidence}</span>
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
      ) : (
        /* Alternate content when draft is not live */
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-4">
            Predictions are hidden until the draft goes live
          </h3>
          <p className="text-gray-600 mb-4">
            The leaderboard will be available approximately 15 minutes before the draft begins.
            All predictions will be locked at that time.
          </p>
          {checkIsAdmin(user.uid) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium text-blue-800">Admin Notice</p>
              <p className="text-blue-700">
                You can make the draft live from the Draft Oracle page.
              </p>
            </div>
          )}
        </div>
      )}
      
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