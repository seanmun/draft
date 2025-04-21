'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { Player, SportType, ActualPick } from '../../lib/types';
import { isAdmin } from '../../lib/admin';
import { Team } from '../../lib/types';


// Define an extended ActualPick type for UI state
interface ExtendedActualPick extends ActualPick {
  id?: string;
}

export default function GlobalDraftManager() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [actualPicks, setActualPicks] = useState<(ExtendedActualPick | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftIsLive, setDraftIsLive] = useState<boolean>(false);
  const [draftIsCompleted, setDraftIsCompleted] = useState<boolean>(false);
  const [updatingLiveStatus, setUpdatingLiveStatus] = useState<boolean>(false);
  const [updatingCompletedStatus, setUpdatingCompletedStatus] = useState<boolean>(false);
  const [adminNote, setAdminNote] = useState<string>('');

  // For the UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  
  // Global draft settings
  const [sportType, setSportType] = useState<SportType>('NFL');
  const [draftYear, setDraftYear] = useState<number>(2025);
  const [totalPicks, setTotalPicks] = useState<number>(32);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Check if user is admin
      if (!isAdmin(user.uid)) {
        router.push('/');
        return;
      }
      
      fetchData();
    }
  }, [user, authLoading, router, sportType, draftYear, totalPicks]);
  
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
    setLoading(true);
    try {
      // Get players for this sport and year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];
      
      setPlayers(playersData);
      
      // Get global draft results
      const resultsQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      const picksMap: { [position: number]: ExtendedActualPick } = {};
      
      // Create map of position -> pick
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        picksMap[data.position] = {
          id: doc.id,
          position: data.position,
          playerId: data.playerId,
          sportType: data.sportType,
          draftYear: data.draftYear,
          teamId: data.teamId
        };
      });

      // Also fetch teams
      const teamsQuery = query(
        collection(db, 'teams'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const teamsSnapshot = await getDocs(teamsQuery);
      const fetchedTeams = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      // Sort teams by pick order
      fetchedTeams.sort((a, b) => a.pick - b.pick);
      
      setTeams(fetchedTeams);
      
      // Create array of actual picks
      const picks = [];
      for (let i = 1; i <= totalPicks; i++) {
        picks.push(picksMap[i] || null);
      }
      
      setActualPicks(picks);
      
      // Get draft settings
      try {
        const settingsQuery = query(
          collection(db, 'draftSettings'),
          where('sportType', '==', sportType),
          where('draftYear', '==', draftYear)
        );
        
        const settingsSnapshot = await getDocs(settingsQuery);
        let isLive = false;
        let isCompleted = false;
        let note = '';
        
        if (!settingsSnapshot.empty) {
          const settingsData = settingsSnapshot.docs[0].data();
          isLive = settingsData.isLive === true;
          isCompleted = settingsData.isCompleted === true;
          note = settingsData.adminNote || '';
        }
        
        setDraftIsLive(isLive);
        setDraftIsCompleted(isCompleted);
        setAdminNote(note);
      } catch (settingsError) {
        console.error('Error fetching draft settings:', settingsError);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load player data');
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
      sportType,
      draftYear
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
    if (!user) return;
    
    try {
      setError('');
      setSuccess('');
      
      // Save each pick individually to the global draftResults collection
      const savePromises = actualPicks.map(async (pick, index) => {
        if (!pick) return null;
        
        const position = index + 1;
        const pickData = {
          position,
          playerId: pick.playerId,
          sportType,
          draftYear,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        };
        
        if (pick.id) {
          // Update existing pick
          await setDoc(doc(db, 'draftResults', pick.id), pickData);
          return pick.id;
        } else {
          // Create new pick
          const docRef = await addDoc(collection(db, 'draftResults'), pickData);
          return docRef.id;
        }
      });
      
      await Promise.all(savePromises.filter(p => p !== null));
      
      setSuccess('Draft picks have been saved successfully!');
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error saving draft picks:', error);
      setError('Failed to save draft picks. Please try again.');
    }
  };
  
  const toggleDraftLive = async () => {
    if (!user) return;
    
    try {
      setUpdatingLiveStatus(true);
      setError('');
      setSuccess('');
      
      // Query for existing draft settings
      const settingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const settingsSnapshot = await getDocs(settingsQuery);
      const newStatus = !draftIsLive;
      
      if (settingsSnapshot.empty) {
        // Create new settings if none exist
        await addDoc(collection(db, 'draftSettings'), {
          sportType,
          draftYear,
          isLive: newStatus,
          isCompleted: draftIsCompleted,
          adminNote: adminNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      } else {
        // Update existing settings
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(doc(db, 'draftSettings', settingsDoc.id), {
          isLive: newStatus,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      }
      
      setDraftIsLive(newStatus);
      setSuccess(`Draft is now ${newStatus ? 'LIVE' : 'hidden'}`);
    } catch (error) {
      console.error('Error toggling draft live status:', error);
      setError('Failed to update draft live status');
    } finally {
      setUpdatingLiveStatus(false);
    }
  };

  const toggleDraftCompleted = async () => {
    if (!user) return;
    
    try {
      setUpdatingCompletedStatus(true);
      setError('');
      setSuccess('');
      
      // Query for existing draft settings
      const settingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const settingsSnapshot = await getDocs(settingsQuery);
      const newStatus = !draftIsCompleted;
      
      if (settingsSnapshot.empty) {
        // Create new settings if none exist
        await addDoc(collection(db, 'draftSettings'), {
          sportType,
          draftYear,
          isLive: draftIsLive,
          isCompleted: newStatus,
          adminNote: adminNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      } else {
        // Update existing settings
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(doc(db, 'draftSettings', settingsDoc.id), {
          isCompleted: newStatus,
          adminNote: adminNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      }
      
      setDraftIsCompleted(newStatus);
      setSuccess(`Draft is now marked as ${newStatus ? 'COMPLETED' : 'IN PROGRESS'}`);
    } catch (error) {
      console.error('Error toggling draft completed status:', error);
      setError('Failed to update draft completed status');
    } finally {
      setUpdatingCompletedStatus(false);
    }
  };

  const saveAdminNote = async () => {
    if (!user) return;
    
    try {
      setError('');
      setSuccess('');
      
      // Query for existing draft settings
      const settingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (settingsSnapshot.empty) {
        // Create new settings if none exist
        await addDoc(collection(db, 'draftSettings'), {
          sportType,
          draftYear,
          isLive: draftIsLive,
          isCompleted: draftIsCompleted,
          adminNote: adminNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      } else {
        // Update existing settings
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(doc(db, 'draftSettings', settingsDoc.id), {
          adminNote: adminNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      }
      
      setSuccess('Admin note has been saved successfully!');
    } catch (error) {
      console.error('Error saving admin note:', error);
      setError('Failed to save admin note');
    }
  };
  
  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; // Redirect handled in useEffect
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
      
      {/* Sport, Year, and Total Picks Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="sportType">
              Sport
            </label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value as SportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="32">32</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
      </div>

      {/* Draft Status Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Draft Status Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <span className="mr-2">Draft Visibility:</span>
            <button
              onClick={toggleDraftLive}
              className={`px-4 py-2 rounded ${
                draftIsLive 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
              disabled={updatingLiveStatus}
            >
              {draftIsLive ? 'LIVE' : 'HIDDEN'}
            </button>
            {draftIsLive && (
              <span className="ml-3 text-xs text-green-600">
                Predictions are now visible to all users and locked for editing
              </span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="mr-2">Draft Status:</span>
            <button
              onClick={toggleDraftCompleted}
              className={`px-4 py-2 rounded ${
                draftIsCompleted 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
              disabled={updatingCompletedStatus}
            >
              {draftIsCompleted ? 'COMPLETED' : 'IN PROGRESS'}
            </button>
            {draftIsCompleted && (
              <span className="ml-3 text-xs text-purple-600">
                Leaderboards will now show final winners and payment info
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Admin Note for Winners */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Admin Notes (For Winners & Payment Info)</h2>
        <p className="text-gray-600 mb-3">
          Enter notes that will be displayed to league members on the leaderboard when draft is completed. 
          Include payment instructions for winners.
        </p>
        
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Enter payment details and any additional information for league members... (e.g., 'Please pay 1st place winner @venmo-username')"
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button
          onClick={saveAdminNote}
          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Save Note
        </button>
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
      
      {players.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <p className="text-gray-600 mb-4">
            No players found for {sportType} {draftYear}. Please import players first.
          </p>
          <Link 
            href="/manage-players" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            Manage Players
          </Link>
        </div>
      ) : (
        <>
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
                    const team = teams.find(t => t.pick === position);
                    
                    return (
                      <tr key={position} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-3">
                          {position}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-900 md:px-3">
                          {team ? (
                            <div className="flex items-center">
                              {team.logoUrl && (
                                <img src={team.logoUrl} alt={team.name} className="h-5 w-5 mr-2" />
                              )}
                              <span>{team.name}</span>
                            </div>
                          ) : (
                            `Team ${position}`
                          )}
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
        </>
      )}
      
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