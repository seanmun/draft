'use client';
// this file is src/app/login/page.tsx
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import LoginButton from '../../components/auth/LoginButton';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';

export default function Login() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get returnUrl and autoJoin from URL if present
  const returnUrl = searchParams?.get('returnUrl');
  const autoJoin = searchParams?.get('autoJoin') === 'true';

  // Store these values in sessionStorage as a backup
  useEffect(() => {
    if (returnUrl) {
      try {
        // Store the returnUrl and autoJoin flag in sessionStorage
        const pendingJoinData = {
          url: returnUrl,
          autoJoin: autoJoin
        };
        sessionStorage.setItem('pendingJoin', JSON.stringify(pendingJoinData));
      } catch {
        console.warn('SessionStorage not available');
      }
    }
  }, [returnUrl, autoJoin]);

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
    
    // Check if there's a pending join link from URL params or sessionStorage
    let pendingJoin;
    let pendingJoinUrl = returnUrl;
    let shouldAutoJoin = autoJoin;
    
    if (!pendingJoinUrl) {
      // Try to get from sessionStorage if not in URL
      try {
        const pendingJoinStr = sessionStorage.getItem('pendingJoin');
        if (pendingJoinStr) {
          try {
            // Try parsing as JSON (new format)
            pendingJoin = JSON.parse(pendingJoinStr);
            pendingJoinUrl = pendingJoin.url;
            shouldAutoJoin = pendingJoin.autoJoin === true;
          } catch {
            // If it's not JSON, assume it's just the URL (old format)
            pendingJoinUrl = pendingJoinStr;
            shouldAutoJoin = false;
          }
        }
      } catch {
        console.warn('SessionStorage not available');
      }
    }
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // If profile is incomplete or doesn't exist, redirect to profile
      // but DON'T remove pendingJoin from sessionStorage
      if (!userData.profileCompleted) {
        router.push('/profile');
      } else if (pendingJoinUrl) {
        // If there's a pending join and profile is complete, redirect there
        try {
          sessionStorage.removeItem('pendingJoin');
        } catch {
          console.warn('SessionStorage not available');
        }
        
        // Add autoJoin parameter if needed
        if (shouldAutoJoin) {
          const url = new URL(pendingJoinUrl);
          url.searchParams.set('autoJoin', 'true');
          router.push(url.toString());
        } else {
          router.push(pendingJoinUrl);
        }
      } else {
        // Otherwise, go to leagues
        router.push('/leagues');
      }
    } else {
      // New user, no profile yet - redirect to profile
      // but DON'T remove pendingJoin from sessionStorage
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