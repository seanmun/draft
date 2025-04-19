// src/hooks/useLeagueData.ts
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, League, ActualPick } from '../lib/types';

/**
 * Custom hook to fetch players for a league based on sport type and draft year
 */
export const useLeaguePlayers = (league: League | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!league) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query players based on sport type and draft year
        const playersQuery = query(
          collection(db, 'players'),
          where('sportType', '==', league.sportType),
          where('draftYear', '==', league.draftYear)
        );

        const snapshot = await getDocs(playersQuery);
        const fetchedPlayers: Player[] = [];
        
        snapshot.forEach(doc => {
          fetchedPlayers.push({ id: doc.id, ...doc.data() } as Player);
        });
        
        // Sort players by rank if available
        const sortedPlayers = fetchedPlayers.sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          return a.name.localeCompare(b.name);
        });
        
        setPlayers(sortedPlayers);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load players. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [league]);

  return { players, loading, error };
};

/**
 * Custom hook to fetch actual draft results for a league
 * Uses the global draft results data
 */
export const useLeagueResults = (league: League | null) => {
  const [results, setResults] = useState<ActualPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!league) {
      setResults([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query draft results based on sport type and draft year
        const resultsQuery = query(
          collection(db, 'draftResults'),
          where('sportType', '==', league.sportType),
          where('draftYear', '==', league.draftYear)
        );

        const snapshot = await getDocs(resultsQuery);
        const fetchedResults: ActualPick[] = [];
        
        snapshot.forEach(doc => {
          fetchedResults.push({ id: doc.id, ...doc.data() } as ActualPick);
        });
        
        // Sort results by position
        const sortedResults = fetchedResults.sort((a, b) => a.position - b.position);
        
        setResults(sortedResults);
      } catch (err) {
        console.error('Error fetching draft results:', err);
        setError('Failed to load draft results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [league]);

  return { results, loading, error };
};

/**
 * Custom hook to calculate scores for a league based on predictions and actual results
 */
export const useLeagueScores = (league: League | null, predictions: any[], players: Player[], results: ActualPick[]) => {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!league || !predictions.length) {
      setScores([]);
      setLoading(false);
      return;
    }

    try {
      // Calculate scores for each user
      const calculatedScores = predictions.map(prediction => {
        let score = 0;
        let correctPicks = 0;
        let possiblePoints = 0;
        
        prediction.picks.forEach((pick: any) => {
          const actualPick = results.find(result => result.position === pick.position);
          
          // Add to possible points
          possiblePoints += pick.confidence;
          
          // If there's a match, add points
          if (actualPick && actualPick.playerId === pick.playerId) {
            score += pick.confidence;
            correctPicks++;
          }
        });
        
        return {
          userId: prediction.userId,
          score,
          correctPicks,
          possiblePoints,
          totalPicks: prediction.picks.length,
          // Add additional user info like displayName, etc.
        };
      });
      
      // Sort by score (highest first)
      calculatedScores.sort((a, b) => b.score - a.score);
      
      setScores(calculatedScores);
    } catch (err) {
      console.error('Error calculating scores:', err);
      setError('Failed to calculate scores.');
    } finally {
      setLoading(false);
    }
  }, [league, predictions, players, results]);

  return { scores, loading, error };
};