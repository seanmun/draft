// src/app/oracle/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Link from 'next/link';
import { Player, SportType, ActualPick } from '../../../lib/types';
import { isAdmin } from '../../../lib/admin';

// Define an extended ActualPick type that includes an id
interface ActualPickWithId extends ActualPick {
  id: string;
  timestamp?: Date;
}

// Mock teams data - replace with real data from your database if available
const mockTeams: {[key: number]: {team: string, id: string}} = {
  1: { team: 'Bears', id: 'team1' },
  2: { team: 'Commanders', id: 'team2' },
  3: { team: 'Patriots', id: 'team3' },
  4: { team: 'Cardinals', id: 'team4' },
  5: { team: 'Chargers', id: 'team5' },
  6: { team: 'Giants', id: 'team6' },
  7: { team: 'Titans', id: 'team7' },
  8: { team: 'Falcons', id: 'team8' },
  9: { team: 'Bears', id: 'team9' },
  10: { team: 'Jets', id: 'team10' },
  // Add more teams as needed
};

export default function OraclePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftResults, setDraftResults] = useState<ActualPickWithId[]>([]);
  const [sportType, setSportType] = useState<SportType>('NFL');
  const [draftYear, setDraftYear] = useState<number>(2025);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [totalPicks, setTotalPicks] = useState<number>(32); // Default to 32 picks
  
  // Current pick being edited
  const [currentPick, setCurrentPick] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  
  // For player search
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin(user.uid)) {
        router.push('/');
      } else {
        setAuthorized(true);
        fetchData();
      }
    }
  }, [user, loading, router, sportType, draftYear]);

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

  const fetchData = async () => {
    if (!authorized) return;
    
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    
    try {
      // Get players
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      const fetchedPlayers = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];
      
      setPlayers(fetchedPlayers);
      
      // Get draft results
      const resultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      const fetchedResults: ActualPickWithId[] = [];
      
      resultsSnapshot.docs.forEach(doc => {
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
        
        fetchedResults.push(pickData);
      });
      
      // Sort by position
      fetchedResults.sort((a, b) => a.position - b.position);
      
      setDraftResults(fetchedResults);
      
      // Set the number of total picks based on sport
      if (sportType === 'NFL') {
        setTotalPicks(32);
      } else if (sportType === 'NBA') {
        setTotalPicks(30);
      } else {
        setTotalPicks(30); // Default for other sports
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setFeedback({
        message: 'Failed to load data. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickClick = (position: number) => {
    // Find existing pick data if available
    const existingPick = draftResults.find(pick => pick.position === position);
    
    setCurrentPick(position);
    setSelectedPlayer(existingPick?.playerId || '');
    setSelectedTeam(existingPick?.teamId || mockTeams[position]?.id || '');
    setSearchTerm('');
  };

  const handlePlayerSelect = (playerId: string) => {
    if (!currentPick) return;
    
    // Check if player is already selected in another pick
    const existingPick = draftResults.find(p => p.playerId === playerId);
    if (existingPick && existingPick.position !== currentPick) {
      if (!confirm(`This player is already selected at position ${existingPick.position}. Do you want to move them?`)) {
        return;
      }
      
      // We'll update this later when saving
    }
    
    setSelectedPlayer(playerId);
  };

  const handleSavePick = async () => {
    if (currentPick === null || !selectedPlayer) {
      setFeedback({
        message: 'Please select a player',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if pick already exists
      const existingPick = draftResults.find(p => p.position === currentPick);
      
      const pickData = {
        position: currentPick,
        playerId: selectedPlayer,
        teamId: selectedTeam || undefined,
        sportType,
        draftYear,
        updatedAt: serverTimestamp()
      };
      
      if (existingPick) {
        // Update existing pick
        await updateDoc(doc(db, 'draftResults', existingPick.id), pickData);
      } else {
        // Create new pick
        await addDoc(collection(db, 'draftResults'), {
          ...pickData,
          createdAt: serverTimestamp()
        });
      }
      
      // Update local state by refreshing data
      await fetchData();
      
      setFeedback({
        message: existingPick ? 'Pick updated successfully!' : 'Pick saved successfully!',
        type: 'success'
      });
      
      // Reset selection
      setCurrentPick(null);
      setSelectedPlayer('');
      setSelectedTeam('');
      
    } catch (error) {
      console.error('Error saving pick:', error);
      setFeedback({
        message: 'Failed to save pick. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setCurrentPick(null);
    setSelectedPlayer('');
    setSelectedTeam('');
    setSearchTerm('');
  };

  const getPlayerById = (playerId: string) => {
    return players.find(p => p.id === playerId) || null;
  };

  if (loading || !authorized) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Global Draft Oracle</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Global Draft Results</h2>
        <p className="text-blue-700">
          Enter actual draft picks as they happen. These results will be available to all leagues for the selected sport and year.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="sportType">
              Sport
            </label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value as SportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            >
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="WNBA">WNBA</option>
              <option value="NHL">NHL</option>
              <option value="MLB">MLB</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="draftYear">
              Draft Year
            </label>
            <select
              id="draftYear"
              value={draftYear}
              onChange={(e) => setDraftYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="totalPicks">
              Total Picks
            </label>
            <select
              id="totalPicks"
              value={totalPicks}
              onChange={(e) => setTotalPicks(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="32">32</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
        
        {feedback.message && (
          <div className={`p-4 mb-6 rounded-md ${feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {feedback.message}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-8">Loading data...</div>
        ) : players.length === 0 ? (
          <div className="text-center py-8">
            No players found for {sportType} {draftYear}. 
            <Link href="/import-players" className="text-blue-600 ml-2">
              Import players
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Draft board */}
            <div className="md:col-span-8 order-2 md:order-1">
              <h2 className="text-xl font-semibold mb-4">Draft Board</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pick
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        School
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: totalPicks }, (_, i) => i + 1).map((position) => {
                      // Find existing pick data if available
                      const pick = draftResults.find(result => result.position === position);
                      const player = pick ? getPlayerById(pick.playerId) : null;
                      const team = mockTeams[position] || { team: `Team ${position}`, id: `team${position}` };
                      
                      // Determine row styling based on state
                      const isEditing = currentPick === position;
                      const rowClass = isEditing ? 'bg-blue-50' : (pick ? '' : 'bg-gray-50');
                      
                      return (
                        <tr 
                          key={position} 
                          className={`cursor-pointer hover:bg-gray-100 ${rowClass}`}
                          onClick={() => handlePickClick(position)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {position}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {team.team}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player?.name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player?.position || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player?.school || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Edit panel */}
            <div className="md:col-span-4 order-1 md:order-2">
              <h2 className="text-xl font-semibold mb-4">
                {currentPick ? `Edit Pick #${currentPick}` : 'Select a Pick'}
              </h2>
              
              {currentPick && (
                <div className="bg-gray-50 p-4 rounded-md">
                  {/* Team selection */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="team">
                      Team
                    </label>
                    <select
                      id="team"
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Team</option>
                      {Object.values(mockTeams).map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.team}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Player search */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="playerSearch">
                      Search Players
                    </label>
                    <input
                      type="text"
                      id="playerSearch"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, position, or school"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                    />
                    
                    <div className="h-64 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredPlayers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No players found. Try a different search term.
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {filteredPlayers.map(player => {
                            // Check if this player is already selected
                            const isSelected = player.id === selectedPlayer;
                            const existingPick = draftResults.find(p => p.playerId === player.id);
                            
                            return (
                              <li 
                                key={player.id}
                                onClick={() => handlePlayerSelect(player.id)}
                                className={`p-2 hover:bg-blue-50 cursor-pointer ${isSelected ? 'bg-blue-100' : ''}`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{player.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {player.position} • {player.school || 'Unknown School'}
                                    {existingPick && existingPick.position !== currentPick && (
                                      <span className="ml-1 text-red-500">
                                        (Pick #{existingPick.position})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {/* Selected player display */}
                  {selectedPlayer && (
                    <div className="mb-4 p-2 bg-blue-100 rounded-md">
                      <h3 className="font-medium">Selected Player:</h3>
                      <div className="text-sm">
                        {getPlayerById(selectedPlayer)?.name || 'Unknown Player'}
                        {getPlayerById(selectedPlayer) && (
                          <span className="text-xs text-gray-500 ml-2">
                            {getPlayerById(selectedPlayer)?.position} • 
                            {getPlayerById(selectedPlayer)?.school || 'Unknown School'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Buttons */}
                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePick}
                      disabled={isSaving || !selectedPlayer}
                      className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                        isSaving || !selectedPlayer ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Save Pick'}
                    </button>
                  </div>
                </div>
              )}
              
              {!currentPick && (
                <div className="bg-gray-100 p-6 rounded-md text-center">
                  <p className="text-gray-600">
                    Select a pick from the draft board to edit
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}