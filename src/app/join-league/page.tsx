'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import type { League } from '../../lib/types';

export default function JoinLeaguePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joining, setJoining] = useState(false);
  
  // Get the league ID and invite code from URL params
  const leagueId = searchParams?.get('id');
  const inviteCode = searchParams?.get('code');
  
  useEffect(() => {
    if (!authLoading && !user) {
      // Save the current URL to session storage so we can redirect back after login
      if (leagueId && inviteCode) {
        sessionStorage.setItem('pendingJoin', window.location.href);
      }
      router.push('/login');
      return;
    }

    if (user && leagueId && inviteCode) {
      fetchLeague();
    } else if (user) {
      setError('Invalid invite link. Please ask for a new link.');
      setLoading(false);
    }
  }, [user, authLoading, leagueId, inviteCode, router]);
  
  const fetchLeague = async () => {
    setLoading(true);
    try {
      const leagueDoc = await getDoc(doc(db, 'leagues', leagueId!));
      
      if (!leagueDoc.exists()) {
        setError('League not found. The link might be invalid or the league has been deleted.');
        setLoading(false);
        return;
      }
      
      const leagueData = { id: leagueDoc.id, ...leagueDoc.data() } as League;
      
      // Validate the invite code
      if (leagueData.settings.inviteCode !== inviteCode) {
        setError('Invalid invite code. Please ask for a new link.');
        setLoading(false);
        return;
      }
      
      // Check if user is already a member
      if (leagueData.members.includes(user!.uid)) {
        setSuccess(`You're already a member of "${leagueData.name}". Redirecting to league...`);
        setTimeout(() => {
          router.push(`/leagues/${leagueData.id}`);
        }, 2000);
        return;
      }
      
      // Check if public join is allowed
      if (!leagueData.settings.publicJoin) {
        setError('This league is not accepting new members through invite links.');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
    } catch (error) {
      console.error('Error fetching league:', error);
      setError('Failed to load league details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinLeague = async () => {
    if (!user || !league) return;
    
    setJoining(true);
    setError('');
    
    try {
      // Add user to league members
      await updateDoc(doc(db, 'leagues', league.id), {
        members: arrayUnion(user.uid)
      });
      
      setSuccess(`You've successfully joined "${league.name}"! Redirecting...`);
      
      // Redirect to league page after a short delay
      setTimeout(() => {
        router.push(`/leagues/${league.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error joining league:', error);
      setError('Failed to join league. Please try again later.');
      setJoining(false);
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
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        {error ? (
          <>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
            <div className="flex justify-between">
              <Link href="/leagues" className="text-blue-600 hover:underline">
                Back to Leagues
              </Link>
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </div>
          </>
        ) : success ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        ) : league ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Join League</h1>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{league.name}</h2>
              <div className="text-sm text-gray-500 mb-4">
                <span className="mr-2">{league.sportType}</span>
                <span>Draft {league.draftYear}</span>
              </div>
              
              {league.description && (
                <p className="text-gray-600 mb-4">{league.description}</p>
              )}
              
              <p className="text-gray-600">
                Members: {league.members.length}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleJoinLeague}
                disabled={joining}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded ${
                  joining ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {joining ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}