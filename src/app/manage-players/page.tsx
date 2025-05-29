'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Player, SportType } from '../../lib/types';
import Link from 'next/link';

// Admin user ID
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';

export default function ManagePlayersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('NFL');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearResult, setClearResult] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && user.uid !== ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    if (user) {
      fetchPlayers();
    }
  }, [user, authLoading, router, selectedSport, selectedYear]);

  const fetchPlayers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setClearResult(''); // Clear any previous clear results
    
    try {
      const q = query(
        collection(db, 'players'),
        where('sportType', '==', selectedSport),
        where('draftYear', '==', selectedYear)
      );

      const querySnapshot = await getDocs(q);
      const playersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];

      // Sort players by rank if available, otherwise by name
      playersData.sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        return a.name.localeCompare(b.name);
      });

      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
      setErrorMessage('Failed to load players. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllPlayers = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${selectedSport} ${selectedYear} players? This cannot be undone!`)) {
      return;
    }

    setClearLoading(true);
    setClearResult('Finding players to delete...');
    
    try {
      // Get all players for this sport and year
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', selectedSport),
        where('draftYear', '==', selectedYear)
      );
      
      const snapshot = await getDocs(playersQuery);
      
      if (snapshot.empty) {
        setClearResult(`No ${selectedSport} ${selectedYear} players found to delete.`);
        return;
      }
      
      setClearResult(`Found ${snapshot.size} players. Deleting...`);
      
      // Delete in batches (Firestore has a 500 operation limit per batch)
      const batchSize = 500;
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;
      
      snapshot.docs.forEach((doc) => {
        currentBatch.delete(doc.ref);
        operationCount++;
        
        if (operationCount === batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });
      
      // Add the last batch if it has operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }
      
      // Execute all batches
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        setClearResult(`Deleting... ${Math.min((i + 1) * batchSize, snapshot.size)}/${snapshot.size} players deleted`);
      }
      
      setClearResult(`✅ Successfully deleted all ${snapshot.size} ${selectedSport} ${selectedYear} players!`);
      
      // Refresh the player list
      await fetchPlayers();
      
    } catch (error) {
      console.error('Error clearing players:', error);
      setClearResult(`Error clearing players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClearLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user || user.uid !== ADMIN_USER_ID) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Player Database Management</h1>
        <Link href="/leagues" className="text-blue-600 hover:underline">
          Back to Leagues
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="md:w-1/3">
          <label className="block text-gray-700 mb-2" htmlFor="sportType">
            Sport
          </label>
          <select
            id="sportType"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value as SportType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="NFL">NFL</option>
            <option value="NBA">NBA</option>
            <option value="WNBA">WNBA</option>
            <option value="NHL">NHL</option>
            <option value="MLB">MLB</option>
          </select>
        </div>
        
        <div className="md:w-1/3">
          <label className="block text-gray-700 mb-2" htmlFor="draftYear">
            Draft Year
          </label>
          <select
            id="draftYear"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
        
        <div className="md:w-1/3 flex items-end">
          <button
            onClick={fetchPlayers}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Player List'}
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Clear Results */}
      {clearResult && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <h4 className="font-semibold text-yellow-700 mb-2">Clear Operation:</h4>
          <pre className="whitespace-pre-wrap text-sm text-yellow-600">{clearResult}</pre>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Import/Clear Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Player Management</h2>
          
          <div className="space-y-4">
            <Link 
              href="/import-players" 
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-medium py-2 px-4 rounded"
            >
              Import from CSV
            </Link>
            
            <button
              onClick={clearAllPlayers}
              disabled={clearLoading || players.length === 0}
              className={`w-full font-medium py-2 px-4 rounded text-white ${
                clearLoading || players.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {clearLoading 
                ? 'Clearing...' 
                : `Clear All ${selectedSport} ${selectedYear} Players (${players.length})`
              }
            </button>
            
            {players.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                No players to clear for {selectedSport} {selectedYear}
              </p>
            )}
          </div>
        </div>
        
        {/* Player List Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Current Database
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sport:</span>
              <span className="font-medium">{selectedSport}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Year:</span>
              <span className="font-medium">{selectedYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Players:</span>
              <span className="font-bold text-lg">{players.length}</span>
            </div>
            
            {players.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Position breakdown:</p>
                <div className="text-xs text-gray-500">
                  {Object.entries(
                    players.reduce((acc, player) => {
                      acc[player.position] = (acc[player.position] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([,a], [,b]) => b - a)
                    .map(([position, count]) => `${position}: ${count}`)
                    .join(' • ')
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Player List Table */}
      {players.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Player List ({players.length} players)
          </h2>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player) => (
                  <tr key={player.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.rank || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.school || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* No Players Message */}
      {!isLoading && players.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Players Found
          </h3>
          <p className="text-gray-600 mb-4">
            No players found for {selectedSport} {selectedYear}. Import players to get started.
          </p>
          <Link 
            href="/import-players" 
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
          >
            Import Players from CSV
          </Link>
        </div>
      )}
      
      {/* Admin Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Admin Navigation</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <Link 
            href="/leagues" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Manage Leagues
          </Link>
          <Link 
            href="/import-players" 
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Import Players
          </Link>
          <Link 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}