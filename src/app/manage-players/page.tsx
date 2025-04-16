'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Player, SportType } from '../../lib/types';
import Link from 'next/link';

// Admin user ID
const ADMIN_USER_ID = 'gT2kV06j0udPRzdPBd0jt82ufNk2';

export default function ManagePlayersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('NFL');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [error, setError] = useState('');

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
    setLoading(true);
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

      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to load players');
    } finally {
      setLoading(false);
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
          >
            Refresh Player List
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Import Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Import Players</h2>
          
          <div className="space-y-4">
            <Link 
              href="/import-players" 
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-medium py-2 px-4 rounded"
            >
              Import from CSV
            </Link>
          </div>
        </div>
        
        {/* Player List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Player List ({players.length} players)
          </h2>
          
          {players.length === 0 ? (
            <p className="text-gray-600">
              No players found for {selectedSport} {selectedYear}. Import players using the available options.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
          )}
        </div>
      </div>
      
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