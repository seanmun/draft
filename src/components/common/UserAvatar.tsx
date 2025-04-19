import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Interface for component props with optional userId
interface UserAvatarProps {
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Component definition with default values for all props
const UserAvatar = ({ 
  userId = '', 
  size = 'md', 
  className = '' 
}: UserAvatarProps) => {
  const [avatarType, setAvatarType] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userId) {
          // Handle empty userId
          setAvatarType('initials');
          setAvatarColor('#3B82F6');
          setDisplayName('');
          setPhotoURL(null);
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAvatarType(userData.avatarType || 'initials');
          setAvatarColor(userData.avatarColor || '#3B82F6');
          setDisplayName(userData.displayName || '');
          setPhotoURL(userData.photoURL || null);
        } else {
          // Set defaults if user document doesn't exist
          setAvatarType('initials');
          setAvatarColor('#3B82F6');
          setDisplayName('');
          setPhotoURL(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Set defaults on error
        setAvatarType('initials');
        setAvatarColor('#3B82F6');
        setDisplayName('');
        setPhotoURL(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Get user initials for initial-based avatar
  const getUserInitials = () => {
    if (!displayName) return '?';
    
    const nameParts = displayName.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  // Size classes mapping
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl'
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse ${className}`}></div>
    );
  }

  // Google photo avatar
  if (avatarType === 'google' && photoURL) {
    return (
      <img 
        src={photoURL} 
        alt={displayName || 'User'} 
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 ${className}`}
      />
    );
  }

  // Initials avatar
  if (avatarType === 'initials') {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold ${className}`}
        style={{ backgroundColor: avatarColor || '#3B82F6' }}
      >
        {getUserInitials()}
      </div>
    );
  }

  // Color avatar
  if (avatarType === 'color') {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full ${className}`}
        style={{ backgroundColor: avatarColor || '#3B82F6' }}
      />
    );
  }

  // Default fallback
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-1/2 w-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
};

export default UserAvatar;