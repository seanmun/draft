'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import type { Team, League, Player, Prediction } from '../../../../lib/types';

export default function PredictionsPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
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
  const [draftIsLive, setDraftIsLive] = useState<boolean>(false);
  const [isPredictionComplete, setIsPredictionComplete] = useState<boolean>(false);
  
  // For the UI state
  const [availableConfidencePoints, setAvailableConfidencePoints] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [showConfidenceSelector, setShowConfidenceSelector] = useState<number | null>(null);
  
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
    // Extract unique positions from players for the filter dropdown
    if (players.length > 0) {
      const positions = [...new Set(players.map(player => player.position))].sort();
      setAvailablePositions(positions);
    }
  }, [players]);
  
  useEffect(() => {
    // Check if prediction is complete
    const missingPicks = predictions.some(p => p.playerId === null);
    const missingConfidence = predictions.some(p => p.confidence === null);
    setIsPredictionComplete(!missingPicks && !missingConfidence);
  }, [predictions]);
  
  useEffect(() => {
    // Filter players based on search term and position filter
    let filtered = [...players];
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(term) || 
        player.position.toLowerCase().includes(term) ||
        (player.school && player.school.toLowerCase().includes(term))
      );
    }
    
    // Apply position filter if selected
    if (positionFilter) {
      filtered = filtered.filter(player => player.position === positionFilter);
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
  }, [searchTerm, positionFilter, players]);
  
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
      
      // Get teams for this sport and year
      const teamsQuery = query(
        collection(db, 'teams'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Get players for this sport and year from global database
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Get draft settings
      const draftSettingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      // Fetch all data in parallel
      const [teamsSnapshot, playersSnapshot, draftSettingsSnapshot] = await Promise.all([
        getDocs(teamsQuery),
        getDocs(playersQuery),
        getDocs(draftSettingsQuery)
      ]);
      
      // Process teams data
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      setTeams(teamsData);
      
      // Process players data
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
      
      // Check if draft is live
      let isLive = false;
      if (!draftSettingsSnapshot.empty) {
        const settingsData = draftSettingsSnapshot.docs[0].data();
        isLive = settingsData.isLive === true;
      }
      setDraftIsLive(isLive);
      
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
    if (!editingPosition || draftIsLive) return;
    
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
    setPositionFilter('');
  };
  
  const handleConfidenceSelect = (position: number, confidence: number) => {
    if (draftIsLive) return;
    
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
    
    // Close the confidence selector
    setShowConfidenceSelector(null);
  };
  
  const handleClearPick = (position: number) => {
    if (draftIsLive) return;
    
    setPredictions(prev => 
      prev.map(p => 
        p.position === position 
          ? { position, playerId: null, confidence: null } 
          : p
      )
    );
  };
  
  const handleApplyChalk = () => {
    if (draftIsLive || !league) return;
    
    const totalPicks = league.settings.totalPicks;
    
    // Set confidence points in "chalk" order (highest to lowest)
    const updatedPredictions = predictions.map(p => ({
      ...p,
      confidence: totalPicks - p.position + 1
    }));
    
    setPredictions(updatedPredictions);
  };
  
  const handleSavePredictions = async (isComplete: boolean = false) => {
    if (!user || !league) return;
    
    // Prevent saving if draft is live
    if (draftIsLive) {
      setError('Predictions are locked. The draft is now live!');
      return;
    }
    
    // If saving as complete, validate predictions
    if (isComplete) {
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
          playerId: p.playerId || "", // Handle null values for incomplete predictions
          confidence: p.confidence || 0 // Handle null values for incomplete predictions
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        isComplete: isComplete
      };
      
      // Save to Firestore
      await setDoc(
        doc(db, 'predictions', `${leagueId}_${user.uid}`), 
        predictionData
      );
      
      setSuccess(isComplete 
        ? 'Your predictions have been saved successfully!' 
        : 'Your progress has been saved. You can complete your predictions later.'
      );
    } catch (error) {
      console.error('Error saving predictions:', error);
      setError('Failed to save predictions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Close confidence selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showConfidenceSelector !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.confidence-selector')) {
          setShowConfidenceSelector(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfidenceSelector]);

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
        <p className="text-blue-700 mb-2">
          Select which players will be drafted at each position. Then, assign confidence points to each of your picks.
          The highest confidence rating ({league.settings.totalPicks}) should be given to the pick you&apos;re most confident about.
          The lowest confidence rating (1) should be given to the pick you&apos;re least confident about.
        </p>
        <p className="text-blue-700">
          You can save your progress at any time and come back later to complete your predictions.
        </p>
      </div>
      
      {draftIsLive && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Predictions Locked</h2>
          <p className="text-red-700">
            The draft is now live! Predictions are locked and can no longer be modified.
          </p>
        </div>
      )}
      
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
      
      {/* Quick Tools */}
      {!draftIsLive && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Quick Tools</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApplyChalk}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm"
              title="Assign confidence points based on draft order (highest to lowest)"
            >
              Apply Chalk Points
            </button>
            <div className="text-sm text-gray-500 ml-2 flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Assigns points in order: Pick 1 = {league.settings.totalPicks} points, Pick 2 = {league.settings.totalPicks - 1} points, etc.
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
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
                  Player
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 md:px-3">
                  Points
                </th>
                <th className="px-1 py-2 text-center w-10 md:w-12">
                  {/* X icon column - no heading */}
                </th>
                {/* Rank column */}
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:px-3 w-16">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {predictions.map((prediction) => {
              const player = getPlayerById(prediction.playerId);
              const team = teams.find(t => t.pick === prediction.position);
              
              return (
                <tr key={prediction.position} className="hover:bg-gray-50">
                  <td className="px-1 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 md:px-2">
                    {prediction.position}
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
                      `Pick ${prediction.position}`
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
                        onClick={() => !draftIsLive && setEditingPosition(prediction.position)}
                        className={`bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 md:py-2 md:px-3 rounded text-xs md:text-sm ${
                          draftIsLive ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={draftIsLive}
                      >
                        Select Player
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm text-gray-500 md:px-3 relative">
                    {player ? (
                      <div className="relative">
                        <button
                          onClick={() => !draftIsLive && setShowConfidenceSelector(prediction.position)}
                          className={`flex items-center justify-between w-full border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm ${
                            draftIsLive ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={draftIsLive}
                        >
                          <span className="font-medium">
                            {prediction.confidence || 'Points'}
                          </span>
                          <svg 
                            className="h-4 w-4 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Confidence selector popup */}
                        {showConfidenceSelector === prediction.position && !draftIsLive && (
                          <div 
                            className="confidence-selector absolute z-10 mt-1 w-40 bg-white shadow-lg max-h-60 rounded-md border border-gray-200 overflow-auto"
                            style={{ left: '0', top: '100%' }}
                          >
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {availableConfidencePoints.map(point => (
                                <button
                                  key={point}
                                  onClick={() => handleConfidenceSelect(prediction.position, point)}
                                  className="text-xs md:text-sm py-2 px-3 hover:bg-blue-100 rounded text-center"
                                >
                                  {point}
                                </button>
                              ))}
                              {prediction.confidence && !availableConfidencePoints.includes(prediction.confidence) && (
                                <button
                                  onClick={() => handleConfidenceSelect(prediction.position, prediction.confidence as number)}
                                  className="text-xs md:text-sm py-2 px-3 bg-blue-100 rounded text-center"
                                >
                                  {prediction.confidence}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap text-center text-xs md:text-sm font-medium md:px-2">
                    {player && !draftIsLive && (
                      <button
                        onClick={() => handleClearPick(prediction.position)}
                        className="text-gray-400 hover:text-red-600 group relative"
                        aria-label="Clear pick"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 md:h-5 md:w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {/* Hover tooltip */}
                        <span className="absolute bg-gray-800 text-white text-xs rounded py-1 px-2 -mt-8 left-1/2 transform -translate-x-1/2 invisible group-hover:visible whitespace-nowrap">
                          Clear
                        </span>
                      </button>
                    )}
                  </td>
                  {/* Rank column */}
                  <td className="px-2 py-3 whitespace-nowrap text-xs md:text-sm md:px-3 text-gray-500">
                    {player && player.rank ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        #{player.rank}
                      </span>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
      
      {!draftIsLive && (
        <div className="flex flex-col md:flex-row justify-end gap-3 md:gap-4">
          <button
            onClick={() => handleSavePredictions(false)}
            disabled={saving}
            className={`bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline text-lg ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          
          <button
            onClick={() => handleSavePredictions(true)}
            disabled={saving}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline text-lg ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Saving...' : isPredictionComplete ? 'Submit Complete Predictions' : 'Submit as Complete'}
          </button>
        </div>
      )}
      
      {draftIsLive && (
        <div className="flex justify-end">
          <button
            disabled={true}
            className="bg-gray-400 text-white font-bold py-2 px-6 rounded-lg opacity-50 cursor-not-allowed text-lg"
          >
            Predictions Locked
          </button>
        </div>
      )}
      
      {/* Player Selection Modal */}
      {editingPosition && !draftIsLive && (
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
                  setPositionFilter('');
                }}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                &times;
              </button>
            </div>
            
            {/* Search and filtering controls */}
            <div className="mb-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search players by name, position, or school"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:w-1/4">
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Positions</option>
                  {availablePositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0">
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
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 md:px-6 md:py-4 text-center text-gray-500">
                        No players found. Please try a different search term or position filter.
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
                          <td className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-500">
                            {player.rank || '–'}
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
                  setPositionFilter('');
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