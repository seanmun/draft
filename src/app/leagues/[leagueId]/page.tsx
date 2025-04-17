'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Link from 'next/link';
import type { League, UserProfile } from '../../../lib/types';
import SeedPlayers from '../../../components/admin/SeedPlayers';

// Admin user ID
const ADMIN_USER_ID = 'gT2kV06j0udPRzdPBd0jt82ufNk2';

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Inside your component, add this state
const [inviteCopied, setInviteCopied] = useState(false);

// Add this function to handle copying the invite link
const copyInviteLink = () => {
  // Check if league exists
  if (!league) return;
  
  // Construct the invite link
  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/join-league?code=${league.settings.inviteCode}&id=${league.id}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(inviteLink)
    .then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000); // Reset after 3 seconds
    })
    .catch(err => {
      console.error('Failed to copy invite link:', err);
    });
};

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && leagueId) {
      const fetchLeagueAndMembers = async () => {
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
          if (!leagueData.members.includes(user.uid)) {
            setError('You are not a member of this league');
            setLoading(false);
            return;
          }
          
          setLeague(leagueData);
          
          // Get member profiles
          // Note: In a real app, you'd have a users collection to query
          // For now, we'll just use the auth user info for the current user
          const dummyMembers: UserProfile[] = leagueData.members.map(memberId => {
            if (memberId === user.uid) {
              return {
                id: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Anonymous',
                photoURL: user.photoURL || undefined
              };
            }
            return {
              id: memberId,
              email: 'user@example.com',
              displayName: `User ${memberId.substring(0, 5)}`,
              photoURL: undefined
            };
          });
          
          setMembers(dummyMembers);
        } catch (error) {
          console.error('Error fetching league:', error);
          setError('Failed to load league details');
        } finally {
          setLoading(false);
        }
      };

      fetchLeagueAndMembers();
    }
  }, [leagueId, user, authLoading, router]);

  const isAdmin = user && user.uid === ADMIN_USER_ID;

  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Redirect handled in useEffect
  }

  if (error) {
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
      <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <span className="mr-2">{league.sportType}</span>
        <span>Draft {league.draftYear}</span>
      </div>
      
      {league.description && (
        <p className="text-gray-600 mb-6">{league.description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* League Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">League Details</h2>
          
          <div className="space-y-3">
            <p className="text-gray-600">
              <span className="font-medium">Total Picks:</span> {league.settings.totalPicks}
            </p>
            
            <p className="text-gray-600">
              <span className="font-medium">Invite Code:</span> {league.settings.inviteCode}
            </p>
            
            <p className="text-gray-600">
              <span className="font-medium">Public Join:</span> {league.settings.publicJoin ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
        
        {/* Members List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Members ({members.length})</h2>
          
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center">
                {member.photoURL ? (
                  <img 
                    src={member.photoURL} 
                    alt={member.displayName} 
                    className="w-8 h-8 rounded-full mr-2"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                    <span className="text-gray-600">{member.displayName.charAt(0)}</span>
                  </div>
                )}
                <span className="text-gray-800">{member.displayName}</span>
                {member.id === league.createdBy && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="space-y-3">
            <button
              onClick={copyInviteLink}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            >
              {inviteCopied ? 'Copied!' : 'Copy Invite Link'}
            </button>
            
            <Link
              href={`/leagues/${leagueId}/predictions`}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-center"
            >
              Make Predictions
            </Link>
            
            <Link
              href={`/leagues/${leagueId}/leaderboard`}
              className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded text-center"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
      
      {/* Draft Prediction Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Draft Predictions</h2>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">
            You haven't made your predictions yet for this draft. Make your predictions before draft day!
          </p>
        </div>
        
        <div className="mt-4">
          <Link
            href={`/leagues/${leagueId}/predictions`}
            className="text-blue-600 hover:underline"
          >
            Make your predictions now
          </Link>
          <Link
            href={`/leagues/${leagueId}/leaderboard`}
            className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded text-center"
          >
            View Leaderboard
          </Link>
        </div>
      </div>

      {/* Add this section to the league detail page */}
      {league && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Invite Friends</h2>
          <p className="text-gray-600 mb-4">
            Share this link with friends to invite them to join your league:
          </p>
          
          <div className="flex">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/join-league?code=${league.settings.inviteCode}&id=${league.id}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={copyInviteLink}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-r-md"
            >
              {inviteCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className="mt-3 text-sm text-gray-500">
            <span className="font-medium mr-2">Invite Code:</span>
            {league.settings.inviteCode}
          </div>
        </div>
      )}
      
      {/* Admin Section - Only visible to the admin user */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
          <Link 
            href="/manage-players" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded block mb-2 text-center"
          >
            Manage Players
          </Link>
        </div>
      )}

    // Add in the JSX where you have the admin actions
    {(user.uid === league.createdBy || user.uid === ADMIN_USER_ID) && (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
        <div className="space-y-3">
          <Link 
            href={`/leagues/${leagueId}/manage-draft`} 
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Manage Draft Picks
          </Link>
          
          <Link 
            href="/manage-players" 
            className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded text-center"
          >
            Manage Players
          </Link>
        </div>
      </div>
    )}
      
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/leagues')}
          className="text-blue-600 hover:underline"
        >
          Back to leagues
        </button>
        
        {user.uid === league.createdBy && (
          <Link
            href={`/leagues/${leagueId}/manage`}
            className="text-blue-600 hover:underline"
          >
            Manage league
          </Link>
        )}
      </div>
    </div>
  );
}