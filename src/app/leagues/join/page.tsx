'use client';
// this file is src/app/leages/join/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';

export default function JoinLeaguePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Find the league with the matching invite code
      const q = query(
        collection(db, 'leagues'),
        where('settings.inviteCode', '==', inviteCode.trim().toUpperCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Invalid invite code. Please try again.');
        return;
      }
      
      const leagueDoc = querySnapshot.docs[0];
      const leagueData = leagueDoc.data();
      
      // Check if user is already a member
      if (leagueData.members.includes(user.uid)) {
        router.push(`/leagues/${leagueDoc.id}`);
        return;
      }
      
      // Check if league allows joining with invite code
      if (!leagueData.settings.publicJoin) {
        setError('This league does not allow joining with an invite code.');
        return;
      }
      
      // Add user to league members
      await updateDoc(doc(db, 'leagues', leagueDoc.id), {
        members: arrayUnion(user.uid)
      });
      
      // Redirect to the league page
      router.push(`/leagues/${leagueDoc.id}`);
    } catch (error) {
      console.error('Error joining league:', error);
      setError('Failed to join league. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Join a League</h1>
        
        <form onSubmit={handleJoin}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="inviteCode">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter invite code (e.g., ABC123)"
            />
          </div>
          
          {error && (
            <div className="mb-4 text-red-500">
              {error}
            </div>
          )}
          
          <div className="flex justify-between">
            <Link href="/leagues" className="text-blue-600 hover:underline">
              Back to leagues
            </Link>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Joining...' : 'Join League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}