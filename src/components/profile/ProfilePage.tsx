'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

// Color options for initial-based avatars
const AVATAR_COLORS = [
  { id: 'red', name: 'Red', value: '#EF4444' },
  { id: 'orange', name: 'Orange', value: '#F97316' },
  { id: 'amber', name: 'Amber', value: '#F59E0B' },
  { id: 'green', name: 'Green', value: '#10B981' },
  { id: 'blue', name: 'Blue', value: '#3B82F6' },
  { id: 'indigo', name: 'Indigo', value: '#6366F1' },
  { id: 'purple', name: 'Purple', value: '#8B5CF6' },
  { id: 'pink', name: 'Pink', value: '#EC4899' },
];

// No props interface needed - ProfilePage doesn't accept props
export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarType, setAvatarType] = useState('google');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].value);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUserProfile();
    }
  }, [user, authLoading, router]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(userData.displayName || user.displayName || '');
        setAvatarType(userData.avatarType || 'google');
        setAvatarColor(userData.avatarColor || AVATAR_COLORS[0].value);
      } else {
        // If no user doc exists yet, use display name from auth if available
        setUsername(user.displayName || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Basic validation
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Check if document exists first
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(userRef, {
          displayName: username,
          avatarType,
          avatarColor,
          updatedAt: new Date()
        });
      } else {
        // Create new document with setDoc
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          displayName: username,
          avatarType,
          avatarColor,
          photoURL: user.photoURL,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setSuccess('Your profile has been updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get user initials for initial-based avatar
  const getUserInitials = () => {
    if (!username) return '?';
    
    const nameParts = username.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  // Avatar preview component
  const AvatarPreview = () => {
    if (avatarType === 'google' && user && user.photoURL) {
      return (
        <img 
          src={user.photoURL} 
          alt="Your Google Profile" 
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
        />
      );
    } else if (avatarType === 'initials') {
      return (
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: avatarColor }}
        >
          {getUserInitials()}
        </div>
      );
    } else if (avatarType === 'color') {
      return (
        <div 
          className="w-20 h-20 rounded-full"
          style={{ backgroundColor: avatarColor }}
        />
      );
    }
    
    // Default fallback
    return (
      <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  };

  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Link href="/leagues" className="text-blue-600 hover:underline">
          Back to Leagues
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
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSaveProfile}>
          <div className="flex flex-col md:flex-row mb-8">
            <div className="md:mr-8 mb-4 md:mb-0 flex flex-col items-center">
              <div className="mb-4">
                <AvatarPreview />
              </div>
              {(avatarType === 'initials' || avatarType === 'color') && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setAvatarColor(color.value)}
                      className={`w-6 h-6 rounded-full ${avatarColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color.value }}
                      aria-label={`Select ${color.name} color`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Picture</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="avatar-google"
                    name="avatarType"
                    checked={avatarType === 'google'}
                    onChange={() => setAvatarType('google')}
                    className="mr-2"
                  />
                  <label htmlFor="avatar-google" className="cursor-pointer">
                    {user && user.photoURL ? (
                      <span>Use Google Photo</span>
                    ) : (
                      <span className="text-gray-400">Use Google Photo (None available)</span>
                    )}
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="avatar-initials"
                    name="avatarType"
                    checked={avatarType === 'initials'}
                    onChange={() => setAvatarType('initials')}
                    className="mr-2"
                  />
                  <label htmlFor="avatar-initials" className="cursor-pointer">
                    Use Initials
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="avatar-color"
                    name="avatarType"
                    checked={avatarType === 'color'}
                    onChange={() => setAvatarType('color')}
                    className="mr-2"
                  />
                  <label htmlFor="avatar-color" className="cursor-pointer">
                    Use Solid Color
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={(user && user.email) || ''}
              disabled
              className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed
            </p>
          </div>
          
          <div className="mb-8">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
            />
            <p className="mt-1 text-xs text-gray-500">
              This name will be displayed to other users
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`
                bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 
                rounded-lg focus:outline-none focus:shadow-outline
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}