'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import type { League } from '../../lib/types';

export default function LeaguesPage() {
    const { user, loading: authLoading } = useAuth();
    // Add this line to see your user ID
    useEffect(() => {
      if (user) {
        console.log("Current user ID:", user.uid);
      }
    }, [user]);
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const fetchLeagues = async () => {
        try {
          const q = query(
            collection(db, 'leagues'),
            where('members', 'array-contains', user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const leaguesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as League[];
          
          setLeagues(leaguesData);
        } catch (error) {
          console.error('Error fetching leagues:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchLeagues();
    }
  }, [user, authLoading, router]);

  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // This will not render as the useEffect will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Leagues</h1>
        <Link href="/leagues/create" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Create League
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">You are not a member of any leagues yet. Create a new league or join an existing one.</p>
          
          <div className="mt-4">
            <Link href="/leagues/join" className="text-blue-600 hover:underline">
              Join a League
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map(league => (
            <Link href={`/leagues/${league.id}`} key={league.id}>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
                <h2 className="text-xl font-semibold mb-2">{league.name}</h2>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <span className="mr-2">{league.sportType}</span>
                  <span>Draft {league.draftYear}</span>
                </div>
                {league.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{league.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  {league.members.length} {league.members.length === 1 ? 'member' : 'members'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}