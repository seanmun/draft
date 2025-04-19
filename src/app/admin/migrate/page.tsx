// src/app/admin/migrate/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin, migrateLeagueDraftResults } from '../../../lib/admin';
import { collection, query, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';
import { League } from '../../../lib/types';

export default function MigrationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<Record<string, {
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>({});

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin(user.uid)) {
        router.push('/');
      } else {
        setAuthorized(true);
        fetchLeagues();
      }
    }
  }, [user, loading, router]);

  const fetchLeagues = async () => {
    setIsLoading(true);
    try {
      const leaguesQuery = query(collection(db, 'leagues'));
      const snapshot = await getDocs(leaguesQuery);
      
      const fetchedLeagues: League[] = [];
      snapshot.forEach(doc => {
        fetchedLeagues.push({ id: doc.id, ...doc.data() } as League);
      });
      
      // Sort by sport type and year
      fetchedLeagues.sort((a, b) => {
        if (a.sportType !== b.sportType) {
          return a.sportType.localeCompare(b.sportType);
        }
        return b.draftYear - a.draftYear;
      });
      
      setLeagues(fetchedLeagues);
      
      // Initialize migration status
      const initialStatus: Record<string, { status: 'pending' | 'success' | 'error'; message: string }> = {};
      fetchedLeagues.forEach(league => {
        initialStatus[league.id] = { status: 'pending', message: 'Not migrated yet' };
      });
      setMigrationStatus(initialStatus);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateLeague = async (leagueId: string) => {
    try {
      // Check if the league has actual picks
      const actualPicksDoc = await getDoc(doc(db, 'actualPicks', leagueId));
      
      if (!actualPicksDoc.exists()) {
        setMigrationStatus(prev => ({
          ...prev,
          [leagueId]: {
            status: 'error',
            message: 'No draft picks to migrate'
          }
        }));
        return;
      }
      
      // Update status to indicate migration is in progress
      setMigrationStatus(prev => ({
        ...prev,
        [leagueId]: {
          status: 'pending',
          message: 'Migration in progress...'
        }
      }));
      
      // Perform migration
      const result = await migrateLeagueDraftResults(leagueId);
      
      // Update status with result
      setMigrationStatus(prev => ({
        ...prev,
        [leagueId]: {
          status: 'success',
          message: result.message
        }
      }));
    } catch (error) {
      console.error(`Error migrating league ${leagueId}:`, error);
      setMigrationStatus(prev => ({
        ...prev,
        [leagueId]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const handleMigrateAll = async () => {
    for (const league of leagues) {
      await handleMigrateLeague(league.id);
    }
  };

  if (loading || !authorized) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Migration Dashboard</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Data Migration Tool</h2>
        <p className="text-yellow-700">
          This tool will migrate draft picks from the league-specific system to the new global system.
          Each league's draft picks will be copied to the global draft results collection, making them
          available to all leagues for the same sport and year.
        </p>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Loading leagues...</div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleMigrateAll}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Migrate All Leagues
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      League Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sport
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leagues.map(league => (
                    <tr key={league.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {league.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {league.sportType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {league.draftYear}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {migrationStatus[league.id] && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            migrationStatus[league.id].status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : migrationStatus[league.id].status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {migrationStatus[league.id].status === 'success'
                              ? 'Success'
                              : migrationStatus[league.id].status === 'error'
                                ? 'Error'
                                : 'Pending'}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {migrationStatus[league.id]?.message}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleMigrateLeague(league.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Migrate
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {leagues.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                        No leagues found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}