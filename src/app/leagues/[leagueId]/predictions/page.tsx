'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import type { League, Player, Prediction } from '../../../../lib/types';

// Mock data for team picks - in a real app, this would come from the database
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
  // Add more mock teams for the remaining picks
};

export default function PredictionsPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<{
    position: number;
    playerId: string | null;
    confidence: number | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // For the UI state
  const [availableConfidencePoints, setAvailableConfidencePoints] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && leagueId) {
      fetchLeagueAndPlayers();
    }
  }, [leagueId, user, authLoading, router]);
  
  useEffect(() => {
    // Filter players based on search term
    let filtered = [...players];
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(term) || 
        player.position.toLowerCase().includes(term) ||
        (player.school && player.school.toLowerCase().includes(term))
      );
    }
    
    // Sort by rank (ascending order - lower rank numbers first)
    filtered.sort((a, b) => {
      // If both have ranks, sort by rank
      if (a.rank !== undefined && b.rank !== undefined) {
        return a.rank - b.rank;
      }
      // If only a has rank, it comes first
      if (a.rank !== undefined) return -1;
      // If only b has rank, it comes first
      if (b.rank !== undefined) return 1;
      // If neither has rank, sort by name
      return a.name.localeCompare(b.name);
    });
    
    setFilteredPlayers(filtered);
  }, [searchTerm, players]);
  
  useEffect(() => {
    // Update available confidence points whenever predictions change
    if (league) {
      const totalPicks = league.settings.totalPicks;
      const allPoints = Array.from({ length: totalPicks }, (_, i) => totalPicks - i);
      const usedPoints = predictions
        .filter(p => p.confidence !== null)
        .map(p => p.confidence as number);
      
      setAvailableConfidencePoints(allPoints.filter(p => !usedPoints.includes(p)));
    }
  }, [predictions, league]);

  const fetchLeagueAndPlayers = async () => {
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
      
      // Check if user is a member of this league
      if (!leagueData.members.includes(user!.uid)) {
        setError('You are not a member of this league');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
      
      // Get players for this sport and year from global database
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
      
      // Initialize predictions array
      const initialPredictions = Array.from(
        { length: leagueData.settings.totalPicks }, 
        (_, index) => ({
          position: index + 1,
          playerId: null,
          confidence: null
        })
      );
      
      // Try to load existing predictions
      try {
        const predictionDoc = await getDoc(
          doc(db, 'predictions', `${leagueId}_${user!.uid}`)
        );
        
        if (predictionDoc.exists()) {
          const predictionData = predictionDoc.data() as Prediction;
          
          // Map existing predictions to our format
          const existingPredictions = predictionData.picks.map(pick => ({
            position: pick.position,
            playerId: pick.playerId,
            confidence: pick.confidence
          }));
          
          // Merge with initial predictions to ensure we have all positions
          const mergedPredictions = initialPredictions.map(initial => {
            const existing = existingPredictions.find(p => p.position === initial.position);
            return existing || initial;
          });
          
          setPredictions(mergedPredictions);
        } else {
          setPredictions(initialPredictions);
        }
      } catch (error) {
        console.error('Error loading predictions:', error);
        setPredictions(initialPredictions);
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
    
    // Check if player is already selected
    const existingPosition = predictions.find(p => p.playerId === playerId)?.position;
    if (existingPosition && existingPosition !== editingPosition) {
      if (!confirm(`This player is already selected at position ${existingPosition}. Do you want to move them?`)) {
        return;
      }
      
      // Remove player from the other position
      setPredictions(prev => 
        prev.map(p => 
          p.position === existingPosition 
            ? { ...p, playerId: null } 
            : p
        )
      );
    }
    
    // Update the prediction
    setPredictions(prev => 
      prev.map(p => 
        p.position === editingPosition 
          ? { ...p, playerId } 
          : p
      )
    );
    
    // Close the selection modal
    setEditingPosition(null);
    setSearchTerm('');
  };
  
  const handleConfidenceSelect = (position: number, confidence: number) => {
    // Check if confidence is already used
    const existingPosition = predictions.find(p => p.confidence === confidence)?.position;
    if (existingPosition && existingPosition !== position) {
      // Swap confidence values
      setPredictions(prev => 
        prev.map(p => {
          if (p.position === position) {
            return { ...p, confidence };
          }
          if (p.position === existingPosition) {
            return { ...p, confidence: null };
          }
          return p;
        })
      );
    } else {
      // Just set the new confidence
      setPredictions(prev => 
        prev.map(p => 
          p.position === position 
            ? { ...p, confidence } 
            : p
        )
      );
    }
  };
  
  const handleClearPick = (position: number) => {
    setPredictions(prev => 
      prev.map(p => 
        p.position === position 
          ? { position, playerId: null, confidence: null } 
          : p
      )
    );
  };
  
  const handleSavePredictions = async () => {
    if (!user || !league) return;
    
    // Validate predictions
    const missingPicks = predictions.some(p => p.playerId === null);
    const missingConfidence = predictions.some(p => p.confidence === null);
    
    if (missingPicks) {
      setError('Please select a player for each position');
      return;
    }
    
    if (missingConfidence) {
      setError('Please assign a confidence rating to each pick');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Format predictions for Firestore
      const predictionData: Prediction = {
        userId: user.uid,
        leagueId,
        picks: predictions.map(p => ({
          position: p.position,
          playerId: p.playerId as string,  // We've validated these are not null
          confidence: p.confidence as number
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      await setDoc(
        doc(db, 'predictions', `${leagueId}_${user.uid}`), 
        predictionData
      );
      
      setSuccess('Your predictions have been saved successfully!');
    } catch (error) {
      console.error('Error saving predictions:', error);
      setError('Failed to save predictions. Please try again.');
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-2xl font-bold">Make Your Predictions</h1>
        <Link href={`/leagues/${leagueId}`} className="text-blue-600 hover:underline">
          Back to League
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h2>
        <p className="text-blue-700">
          Select which players will be drafted at each position. Then, assign confidence points to each of your picks.
          The highest confidence rating ({league.settings.totalPicks}) should be given to the pick you&apos;re most confident about.
          The lowest confidence rating (1) should be given to the pick you&apos;re least confident about.
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
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3 w-40 md:w-64">
                  Player
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 md:w-36 md:px-3">
                  Points
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 md:w-20 md:px-3">
                  Clear
                </th>
                {/* Reserved space for future additions */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3">
                  {/* Future content */}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {predictions.map((prediction) => {
                const player = getPlayerById(prediction.playerId);
                const teamInfo = mockTeamPicks[prediction.position] || { team: 'TBD' };
                
                return (
                  <tr key={prediction.position} className="hover:bg-gray-50">
                    <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-3">
                      {prediction.position}
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
                          onClick={() => setEditingPosition(prediction.position)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 md:py-2 md:px-3 rounded text-xs md:text-sm"
                        >
                          Select Player
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-500 md:px-3">
                      {player ? (
                        <select
                          value={prediction.confidence || ''}
                          onChange={(e) => handleConfidenceSelect(prediction.position, Number(e.target.value))}
                          className="block w-full pl-2 pr-6 py-1 md:pl-3 md:pr-8 md:py-2 text-xs md:text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="">Select Points</option>
                          {availableConfidencePoints.map(point => (
                            <option key={point} value={point}>
                              {point}
                            </option>
                          ))}
                          {prediction.confidence && !availableConfidencePoints.includes(prediction.confidence) && (
                            <option value={prediction.confidence}>
                              {prediction.confidence}
                            </option>
                          )}
                        </select>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center text-xs md:text-sm font-medium md:px-3">
                      {player && (
                        <button
                          onClick={() => handleClearPick(prediction.position)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Clear
                        </button>
                      )}
                    </td>
                    {/* Reserved cell for future content */}
                    <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm md:px-3">
                      {/* Future content */}
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
          onClick={handleSavePredictions}
          disabled={saving}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline text-lg ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? 'Saving...' : 'Save Predictions'}
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
                      const isSelected = predictions.some(p => p.playerId === player.id);
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