'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import LoginButton from '../../components/auth/LoginButton';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';

export default function Login() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirects after login
  useEffect(() => {
    if (!loading && user) {
      // First check if user has a profile
      checkUserProfile(user.uid);
    }
  }, [user, loading, router]);

  // Check if user has completed their profile
  const checkUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      // Check if there's a pending join link
      const pendingJoin = sessionStorage.getItem('pendingJoin');
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If profile is incomplete or doesn't exist, redirect to profile
        if (!userData.profileCompleted) {
          router.push('/profile');
        } else if (pendingJoin) {
          // If there's a pending join, redirect there
          sessionStorage.removeItem('pendingJoin');
          router.push(pendingJoin);
        } else {
          // Otherwise, go to leagues
          router.push('/leagues');
        }
      } else {
        // New user, no profile yet
        router.push('/profile');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // On error, just redirect to leagues as fallback
      router.push('/leagues');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Draft Day Trades</h1>
        <p className="mb-6 text-gray-600 text-center">
          Sign in to create or join a draft prediction league
        </p>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}