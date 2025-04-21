'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Link from 'next/link';
import UserAvatar from '../../../components/common/UserAvatar';
import type { League, UserProfile, Prediction, ActualPick } from '../../../lib/types';

// Admin user ID - only this user will see Oracle Actions
const ADMIN_USER_ID = 'gT2kV06j0udPRzdPBd0jt82ufNk2';

// Additional interfaces for winners display
interface UserScore {
  userId: string;
  displayName: string;
  photoURL?: string;
  paymentInfo?: string;
  totalPoints: number;
  correctPicks: number;
  totalPicks: number;
}

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [winners, setWinners] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [draftIsCompleted, setDraftIsCompleted] = useState(false);
  const [leagueNote, setLeagueNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');

  // Function to handle copying the invite link
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
      fetchLeagueAndData();
    }
  }, [leagueId, user, authLoading, router]);
  
  const fetchLeagueAndData = async () => {
    if (!user) return; // Early return if user is null
    
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
      
      // Check if draft is completed by fetching draft settings
      const draftSettingsQuery = query(
        collection(db, 'draftSettings'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      const draftSettingsSnapshot = await getDocs(draftSettingsQuery);
      let isCompleted = false;
      
      if (!draftSettingsSnapshot.empty) {
        const settingsData = draftSettingsSnapshot.docs[0].data();
        isCompleted = settingsData.isCompleted === true;
      }
      
      setDraftIsCompleted(isCompleted);
      
      // Get league-specific note if available
      const leagueSettingsQuery = query(
        collection(db, 'leagueSettings'),
        where('leagueId', '==', leagueId)
      );
      
      const leagueSettingsSnapshot = await getDocs(leagueSettingsQuery);
      let note = '';
      
      if (!leagueSettingsSnapshot.empty) {
        const settingsData = leagueSettingsSnapshot.docs[0].data();
        note = settingsData.note || '';
      }
      
      setLeagueNote(note);
      
      // Fetch actual user profiles from Firestore
      const memberProfiles: UserProfile[] = [];
      const userProfilesMap: Record<string, UserProfile> = {};
      
      // For each member ID, try to fetch their profile
      for (const memberId of leagueData.members) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          
          if (userDoc.exists()) {
            // Use data from the user document
            const userData = userDoc.data();
            const profile = {
              id: memberId,
              email: userData.email || 'No email',
              displayName: userData.displayName || `User ${memberId.substring(0, 5)}`,
              photoURL: userData.photoURL,
              paymentInfo: userData.paymentInfo || ''
            };
            memberProfiles.push(profile);
            userProfilesMap[memberId] = profile;
          } else if (memberId === user.uid) {
            // Fallback to current user data if they don't have a profile
            const profile = {
              id: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || undefined
            };
            memberProfiles.push(profile);
            userProfilesMap[memberId] = profile;
          } else {
            // Fallback for other users
            const profile = {
              id: memberId,
              email: 'user@example.com',
              displayName: `User ${memberId.substring(0, 5)}`,
              photoURL: undefined
            };
            memberProfiles.push(profile);
            userProfilesMap[memberId] = profile;
          }
        } catch (error) {
          console.error(`Error fetching user ${memberId}:`, error);
          // Add fallback user data
          const profile = {
            id: memberId,
            email: 'user@example.com',
            displayName: `User ${memberId.substring(0, 5)}`,
            photoURL: undefined
          };
          memberProfiles.push(profile);
          userProfilesMap[memberId] = profile;
        }
      }
      
      setMembers(memberProfiles);
      
      // If draft is completed, fetch winners
      if (isCompleted) {
        await fetchWinners(leagueId, leagueData, userProfilesMap);
      }
    } catch (error) {
      console.error('Error fetching league:', error);
      setError('Failed to load league details');
    } finally {
      setLoading(false);
    }
  };

  const fetchWinners = async (
    leagueId: string, 
    leagueData: League, 
    userProfilesMap: Record<string, UserProfile>
  ) => {
    if (!user) return;
    
    try {
      // First get all users' predictions for this league
      const predictionsQuery = query(
        collection(db, 'predictions'),
        where('leagueId', '==', leagueId)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      const predictions = predictionsSnapshot.docs.map(doc => doc.data() as Prediction);
      
      // Get actual draft picks to compare with predictions
      const actualPicksQuery = query(
        collection(db, 'draftResults'),
        where('sportType', '==', leagueData.sportType),
        where('draftYear', '==', leagueData.draftYear)
      );
      
      const actualPicksSnapshot = await getDocs(actualPicksQuery);
      const actualPicks: {[position: number]: ActualPick} = {};
      
      actualPicksSnapshot.docs.forEach(doc => {
        const pick = doc.data() as ActualPick;
        actualPicks[pick.position] = pick;
      });
      
      // Calculate scores for each user
      const scores: UserScore[] = [];
      
      for (const prediction of predictions) {
        let totalPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;
        
        // Calculate score for this prediction
        prediction.picks.forEach(pick => {
          totalPicks++;
          const actualPick = actualPicks[pick.position];
          
          if (actualPick && actualPick.playerId === pick.playerId) {
            // Correct prediction
            totalPoints += pick.confidence;
            correctPicks++;
          }
        });
        
        // Find the user's profile info
        const userProfile = userProfilesMap[prediction.userId];
        
        scores.push({
          userId: prediction.userId,
          displayName: userProfile?.displayName || `User ${prediction.userId.substring(0, 5)}`,
          photoURL: userProfile?.photoURL,
          paymentInfo: userProfile?.paymentInfo || '',
          totalPoints,
          correctPicks,
          totalPicks
        });
      }
      
      // Sort by total points (highest first)
      scores.sort((a, b) => b.totalPoints - a.totalPoints);
      
      // Take top 3 if available
      setWinners(scores.slice(0, 3));
    } catch (error) {
      console.error('Error fetching winners:', error);
    }
  };

  // Handle saving the league admin note
  const handleSaveNote = async () => {
    if (!user || !league) return;
    
    // Check if user is the league creator
    if (user.uid !== league.createdBy) {
      setError('Only the league admin can add notes');
      return;
    }
    
    try {
      setSavingNote(true);
      
      // Query for existing league settings
      const settingsQuery = query(
        collection(db, 'leagueSettings'),
        where('leagueId', '==', leagueId)
      );
      
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (settingsSnapshot.empty) {
        // Create new settings if none exist
        await updateDoc(doc(db, 'leagues', leagueId), {
          note: leagueNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      } else {
        // Update existing settings
        const settingsDoc = settingsSnapshot.docs[0];
        await updateDoc(doc(db, 'leagueSettings', settingsDoc.id), {
          note: leagueNote,
          lastUpdatedBy: user.uid,
          lastUpdatedAt: serverTimestamp()
        });
      }
      
      setEditingNote(false);
      setNoteSuccess('Note saved successfully!');
      setTimeout(() => setNoteSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving league note:', error);
      setError('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  // Check if current user is the admin
  const isUserAdmin = user && user.uid === ADMIN_USER_ID;
  
  // Check if current user is the league creator
  const isLeagueCreator = user && league && user.uid === league.createdBy;

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
      
      {/* Winners Display (Only show when draft is completed) */}
      {draftIsCompleted && winners.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-6 rounded-lg">
          <h2 className="text-xl font-bold text-purple-800 mb-4">🏆 Draft Complete - Final Results 🏆</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* First Place */}
            {winners.length > 0 && (
              <div className="bg-yellow-100 rounded-lg p-4 border border-yellow-300 text-center">
                <div className="text-yellow-600 text-4xl mb-1">🥇</div>
                <div className="text-lg font-bold text-gray-900">1st Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={winners[0]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{winners[0]?.displayName}</div>
                <div className="text-2xl font-bold text-yellow-700 mt-1">{winners[0]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {winners[0]?.correctPicks}/{winners[0]?.totalPicks} correct picks
                </div>
                {winners[0]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-yellow-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{winners[0]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Second Place (if exists) */}
            {winners.length > 1 && (
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 text-center">
                <div className="text-gray-600 text-4xl mb-1">🥈</div>
                <div className="text-lg font-bold text-gray-900">2nd Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={winners[1]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{winners[1]?.displayName}</div>
                <div className="text-2xl font-bold text-gray-700 mt-1">{winners[1]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {winners[1]?.correctPicks}/{winners[1]?.totalPicks} correct picks
                </div>
                {winners[1]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{winners[1]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Third Place (if exists) */}
            {winners.length > 2 && (
              <div className="bg-orange-100 rounded-lg p-4 border border-orange-300 text-center">
                <div className="text-orange-600 text-4xl mb-1">🥉</div>
                <div className="text-lg font-bold text-gray-900">3rd Place</div>
                <div className="flex justify-center mt-2">
                  <UserAvatar 
                    userId={winners[2]?.userId || ''}
                    size="md"
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 font-semibold">{winners[2]?.displayName}</div>
                <div className="text-2xl font-bold text-orange-700 mt-1">{winners[2]?.totalPoints} pts</div>
                <div className="text-sm text-gray-700 mt-1">
                  {winners[2]?.correctPicks}/{winners[2]?.totalPicks} correct picks
                </div>
                {winners[2]?.paymentInfo && (
                  <div className="mt-3 p-2 bg-white rounded border border-orange-200">
                    <p className="text-sm font-medium text-gray-700">Payment Info:</p>
                    <p className="text-sm text-gray-600">{winners[2]?.paymentInfo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* League Admin Note */}
          {(leagueNote || isLeagueCreator) && (
            <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-purple-800">League Admin Notes</h3>
                {isLeagueCreator && !editingNote && (
                  <button 
                    onClick={() => setEditingNote(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit Note
                  </button>
                )}
              </div>
              
              {editingNote && isLeagueCreator ? (
                <div>
                  <textarea
                    value={leagueNote}
                    onChange={(e) => setLeagueNote(e.target.value)}
                    placeholder="Enter additional information for league members... (e.g., prize distribution details)"
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingNote(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-1 px-3 rounded text-sm"
                      disabled={savingNote}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm"
                      disabled={savingNote}
                    >
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-line">
                  {leagueNote || (isLeagueCreator ? 
                    'Add a note with additional information for your league members.' : 
                    'No additional information has been added yet.')}
                </div>
              )}
              
              {noteSuccess && (
                <div className="mt-2 text-sm text-green-600">
                  {noteSuccess}
                </div>
              )}
            </div>
          )}
        </div>
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
                {/* Use the UserAvatar component here instead of conditional rendering */}
                <UserAvatar 
                  userId={member.id} 
                  size="sm" 
                  className="mr-2"
                />
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
      
      {/* Invite Friends Section */}
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
      
      {/* Oracle Actions - Only show for the site admin */}
      {isUserAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Oracle Actions</h2>
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
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/leagues')}
          className="text-blue-600 hover:underline"
        >
          Back to leagues
        </button>
        
        {/* Manage League link - Only show for league creator */}
        {isLeagueCreator && (
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