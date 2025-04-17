// src/app/leagues/[leagueId]/manage-draft/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import type { League, Player, ActualPick } from '../../../../lib/types';

// Admin user ID
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';

export default function ManageDraftPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actualPicks, setActualPicks] = useState<(ActualPick | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // For the UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && leagueId) {
      fetchLeagueAndData();
    }
  }, [leagueId, user, authLoading, router]);
  
  useEffect(() => {
    // Filter players based on search term
    if (searchTerm.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredPlayers(
        players.filter(player => 
          player.name.toLowerCase().includes(term) || 
          player.position.toLowerCase().includes(term) ||
          (player.school && player.school.toLowerCase().includes(term))
        )
      );
    }
  }, [searchTerm, players]);

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
      
      // Check if user is the league creator or an admin
      if (user!.uid !== leagueData.createdBy && user!.uid !== ADMIN_USER_ID) {
        setError('You are not authorized to manage this draft');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
      
      // Get players for this sport and year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];
      
      setPlayers(playersData);
      
      // Get actual picks for this league
      try {
        const actualPicksDoc = await getDoc(doc(db, 'actualPicks', leagueId));
        
        if (actualPicksDoc.exists()) {
          const picksData = actualPicksDoc.data();
          const picks = [];
          
          // Initialize array with nulls for all picks
          for (let i = 1; i <= leagueData.settings.totalPicks; i++) {
            picks.push(null);
          }
          
          // Fill in the actual picks
          for (const position in picksData.picks) {
            const pos = parseInt(position);
            picks[pos - 1] = {
              position: pos,
              playerId: picksData.picks[position].playerId,
              sportType: leagueData.sportType,
              draftYear: leagueData.draftYear
            };
          }
          
          setActualPicks(picks);
        } else {
          // Initialize with empty picks
          const emptyPicks = Array(leagueData.settings.totalPicks).fill(null);
          setActualPicks(emptyPicks);
        }
      } catch (error) {
        console.error('Error loading actual picks:', error);
        const emptyPicks = Array(leagueData.settings.totalPicks).fill(null);
        setActualPicks(emptyPicks);
      }
    } catch (error) {
      console.error('Error fetching league or players:', error);
      setError('Failed to load league or player data');
    } finally {
      setLoading(false);
    }
  };
  
  const getPlayerById = (playerId: string | null) => {
    if (!playerId) return null;
    return players.find(p => p.id === playerId) || null;
  };
  
  const handlePlayerSelect = (playerId: string) => {
    if (!editingPosition) return;
    
    // Update the pick
    const updatedPicks = [...actualPicks];
    updatedPicks[editingPosition - 1] = {
      position: editingPosition,
      playerId,
      sportType: league!.sportType,
      draftYear: league!.draftYear
    };
    
    setActualPicks(updatedPicks);
    
    // Close the selection modal
    setEditingPosition(null);
    setSearchTerm('');
  };
  
  const handleClearPick = (position: number) => {
    const updatedPicks = [...actualPicks];
    updatedPicks[position - 1] = null;
    setActualPicks(updatedPicks);
  };
  
  const handleSaveActualPicks = async () => {
    if (!user || !league) return;
    
    try {
      setError('');
      setSuccess('');
      
      // Format picks for Firestore
      const picksObject: {[key: string]: {playerId: string}} = {};
      
      actualPicks.forEach((pick, index) => {
        if (pick) {
          picksObject[(index + 1).toString()] = {
            playerId: pick.playerId
          };
        }
      });
      
      // Save to Firestore
      await setDoc(
        doc(db, 'actualPicks', leagueId), 
        {
          picks: picksObject,
          sportType: league.sportType,
          draftYear: league.draftYear,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        }
      );
      
      setSuccess('Draft picks have been saved successfully!');
      
      // Refresh data
      fetchLeagueAndData();
    } catch (error) {
      console.error('Error saving actual picks:', error);
      setError('Failed to save draft picks. Please try again.');
    }
  };
  
  // Mock team data - can be replaced with actual team data from database later
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
        <h1 className="text-2xl font-bold">Manage Draft Picks</h1>
        <Link href={`/leagues/${leagueId}`} className="text-blue-600 hover:underline">
          Back to League
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Draft Administrator</h2>
        <p className="text-blue-700">
          Enter the actual draft picks as they happen. These will be used to calculate scores for all participants.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
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
                  Player
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 md:w-20 md:px-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actualPicks.map((pick, index) => {
                const position = index + 1;
                const player = pick ? getPlayerById(pick.playerId) : null;
                const teamInfo = mockTeamPicks[position] || { team: 'TBD' };
                
                return (
                  <tr key={position} className="hover:bg-gray-50">
                    <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-3">
                      {position}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-900 md:px-3">
                      {teamInfo.team}
                    </td>
                    <td className="px-2 py-3 text-xs md:text-sm text-gray-500 md:px-3">
                      {player ? (
                        <div>
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.position} • {player.school || 'Unknown School'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingPosition(position)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 md:py-2 md:px-3 rounded text-xs md:text-sm"
                        >
                          Select Player
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center text-xs md:text-sm font-medium md:px-3">
                      {player && (
                        <button
                          onClick={() => handleClearPick(position)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Clear
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveActualPicks}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline text-lg"
        >
          Save Draft Picks
        </button>
      </div>
      
      {/* Player Selection Modal */}
      {editingPosition && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold">
                Select Player for Pick #{editingPosition}
              </h2>
              <button
                onClick={() => {
                  setEditingPosition(null);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players by name, position, or school"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24">
                      Position
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 md:px-6 md:py-4 text-center text-gray-500">
                        No players found. Please try a different search term.
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((player) => {
                      const isSelected = actualPicks.some(p => p?.playerId === player.id);
                      return (
                        <tr 
                          key={player.id}
                          onClick={() => handlePlayerSelect(player.id)}
                          className={`cursor-pointer hover:bg-blue-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                            {player.name}
                            {isSelected && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Selected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-500">
                            {player.position}
                          </td>
                          <td className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-500">
                            {player.school || '–'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setEditingPosition(null);
                  setSearchTerm('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}