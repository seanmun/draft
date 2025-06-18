'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import Link from 'next/link';
import UserAvatar from '../../../../components/common/UserAvatar';
import type { League, UserProfile } from '../../../../lib/types';

export default function ManageLeaguePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [leagueName, setLeagueName] = useState('');
  const [leagueDescription, setLeagueDescription] = useState('');
  const [totalPicks, setTotalPicks] = useState(10);
  const [publicJoin, setPublicJoin] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [showRegenerateCode, setShowRegenerateCode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && leagueId) {
      fetchLeagueData();
    }
  }, [leagueId, user, authLoading, router]);

  const fetchLeagueData = async () => {
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
      
      // Check if user is the league creator
      if (leagueData.createdBy !== user!.uid) {
        setError('You do not have permission to manage this league');
        setLoading(false);
        return;
      }
      
      setLeague(leagueData);
      
      // Set form values
      setLeagueName(leagueData.name);
      setLeagueDescription(leagueData.description || '');
      setTotalPicks(leagueData.settings.totalPicks);
      setPublicJoin(leagueData.settings.publicJoin);
      setInviteCode(leagueData.settings.inviteCode);
      
      // Fetch member profiles
      const memberProfiles: UserProfile[] = [];
      for (const memberId of leagueData.members) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            memberProfiles.push({
              id: memberId,
              email: userData.email || 'No email',
              displayName: userData.displayName || `User ${memberId.substring(0, 5)}`,
              photoURL: userData.photoURL
            });
          } else {
            // Fallback for users without profiles
            memberProfiles.push({
              id: memberId,
              email: 'user@example.com',
              displayName: `User ${memberId.substring(0, 5)}`
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${memberId}:`, error);
          memberProfiles.push({
            id: memberId,
            email: 'user@example.com',
            displayName: `User ${memberId.substring(0, 5)}`
          });
        }
      }
      
      setMembers(memberProfiles);
    } catch (error) {
      console.error('Error fetching league:', error);
      setError('Failed to load league data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!user || !league) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await updateDoc(doc(db, 'leagues', leagueId), {
        name: leagueName,
        description: leagueDescription,
        'settings.totalPicks': totalPicks,
        'settings.publicJoin': publicJoin,
        updatedAt: serverTimestamp()
      });
      
      setSuccess('League settings updated successfully!');
      
      // Update local state
      setLeague(prev => prev ? {
        ...prev,
        name: leagueName,
        description: leagueDescription,
        settings: {
          ...prev.settings,
          totalPicks,
          publicJoin
        }
      } : null);
      
    } catch (error) {
      console.error('Error updating league:', error);
      setError('Failed to update league settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!user || !league) return;
    
    setSaving(true);
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      await updateDoc(doc(db, 'leagues', leagueId), {
        'settings.inviteCode': newCode,
        updatedAt: serverTimestamp()
      });
      
      setInviteCode(newCode);
      setSuccess('New invite code generated successfully!');
      
      // Update local state
      setLeague(prev => prev ? {
        ...prev,
        settings: {
          ...prev.settings,
          inviteCode: newCode
        }
      } : null);
      
    } catch (error) {
      console.error('Error regenerating invite code:', error);
      setError('Failed to generate new invite code');
    } finally {
      setSaving(false);
      setShowRegenerateCode(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !league || memberId === user.uid) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Remove member from league
      await updateDoc(doc(db, 'leagues', leagueId), {
        members: arrayRemove(memberId),
        updatedAt: serverTimestamp()
      });
      
      // Also delete their predictions for this league
      try {
        await deleteDoc(doc(db, 'predictions', `${leagueId}_${memberId}`));
      } catch (predError) {
        console.warn('Could not delete member predictions:', predError);
      }
      
      // Update local state
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setLeague(prev => prev ? {
        ...prev,
        members: prev.members.filter(id => id !== memberId)
      } : null);
      
      setSuccess('Member removed from league successfully!');
      
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member from league');
    } finally {
      setSaving(false);
      setMemberToRemove(null);
    }
  };

  const handleDeleteLeague = async () => {
    if (!user || !league) return;
    
    setSaving(true);
    
    try {
      // Delete all predictions for this league
      const predictionsQuery = query(
        collection(db, 'predictions'),
        where('leagueId', '==', leagueId)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      for (const predDoc of predictionsSnapshot.docs) {
        await deleteDoc(predDoc.ref);
      }
      
      // Delete the league
      await deleteDoc(doc(db, 'leagues', leagueId));
      
      router.push('/leagues');
      
    } catch (error) {
      console.error('Error deleting league:', error);
      setError('Failed to delete league');
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const copyInviteLink = () => {
    if (!league) return;
    
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/join-league?code=${inviteCode}&id=${leagueId}`;
    
    navigator.clipboard.writeText(inviteLink)
      .then(() => setSuccess('Invite link copied to clipboard!'))
      .catch(() => setError('Failed to copy invite link'));
  };

  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (error && !league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <Link href="/leagues" className="text-blue-600 hover:underline">
          Back to leagues
        </Link>
      </div>
    );
  }

  if (!league) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage League</h1>
        <Link href={`/leagues/${leagueId}`} className="text-blue-600 hover:underline">
          Back to League
        </Link>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* League Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">League Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="leagueName">
                League Name
              </label>
              <input
                type="text"
                id="leagueName"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="leagueDescription">
                Description (Optional)
              </label>
              <textarea
                id="leagueDescription"
                value={leagueDescription}
                onChange={(e) => setLeagueDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="totalPicks">
                Total Picks
              </label>
              <select
                id="totalPicks"
                value={totalPicks}
                onChange={(e) => setTotalPicks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 12, 14, 15, 20, 25, 30, 32, 36].map(num => (
                  <option key={num} value={num}>
                    {num} picks
                    {num === 12 && ' (WNBA 1st Round)'}
                    {num === 14 && ' (NBA Lottery)'}
                    {num === 30 && ' (NBA 1st Round)'}
                    {num === 32 && ' (NHL/NFL 1st Round)'}
                    {num === 36 && ' (MLB 1st Round)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="publicJoin"
                checked={publicJoin}
                onChange={(e) => setPublicJoin(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="publicJoin" className="text-gray-700">
                Allow new members to join via invite link
              </label>
            </div>

            <button
              onClick={handleUpdateLeague}
              disabled={saving}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Saving...' : 'Update League Settings'}
            </button>
          </div>
        </div>

        {/* Invite Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Invite Management</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Current Invite Code</label>
              <div className="flex">
                <input
                  type="text"
                  value={inviteCode}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={() => setShowRegenerateCode(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-r-md"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Invite Link</label>
              <div className="flex">
                <input
                  type="text"
                  value={`${window.location.origin}/join-league?code=${inviteCode}&id=${leagueId}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-md"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Management */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Members ({members.length})</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserAvatar userId={member.id} size="sm" className="mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.id === league.createdBy
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.id === league.createdBy ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {member.id !== league.createdBy && (
                        <button
                          onClick={() => setMemberToRemove(member.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-red-800 mb-4">Danger Zone</h2>
          <p className="text-red-700 mb-4">
            Deleting this league will permanently remove all member predictions and cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >
            Delete League
          </button>
        </div>
      </div>

      {/* Regenerate Code Confirmation */}
      {showRegenerateCode && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Regenerate Invite Code</h3>
            <p className="text-gray-600 mb-4">
              This will generate a new invite code. The old invite links will no longer work.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRegenerateCode(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateInviteCode}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Remove Member</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove this member? Their predictions will also be deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setMemberToRemove(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete League Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete League</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this league? This action cannot be undone and will remove all member predictions.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLeague}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                {saving ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}