'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function EmailSignInHandler() {
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        // If missing email, prompt user for it
        if (!email) {
          try {
            email = window.prompt('Please provide your email for confirmation');
            
            if (!email) {
              setStatus('error');
              setError('Email is required to complete sign in.');
              return;
            }
          } catch (error) {
            console.error('Error prompting for email:', error);
            setStatus('error');
            setError('Could not prompt for email.');
            return;
          }
        }
        
        try {
          setStatus('signing-in');
          const result = await signInWithEmailLink(auth, email, window.location.href);
          
          // Clear email from storage
          window.localStorage.removeItem('emailForSignIn');
          
          // Check if user has a completed profile
          await checkUserProfile(result.user.uid);
          
        } catch (error: unknown) {
          console.error('Error completing sign in:', error);
          setStatus('error');
          
          if (error instanceof FirebaseError) {
            setError(`Failed to complete sign in: ${error.message}`);
          } else {
            setError('Failed to complete sign in. The link may have expired.');
          }
        }
      } else {
        setStatus('error');
        setError('Invalid sign-in link. Please request a new sign-in link.');
      }
    };

    completeSignIn();
  }, [router]);

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
          setStatus('success');
          setTimeout(() => {
            router.push('/profile');
          }, 1000);
        } else if (pendingJoin) {
          // If there's a pending join, redirect there
          sessionStorage.removeItem('pendingJoin');
          setStatus('success');
          setTimeout(() => {
            router.push(pendingJoin);
          }, 1000);
        } else {
          // Otherwise, go to leagues
          setStatus('success');
          setTimeout(() => {
            router.push('/leagues');
          }, 1000);
        }
      } else {
        // New user, no profile yet
        setStatus('success');
        setTimeout(() => {
          router.push('/profile');
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // On error, just redirect to leagues as fallback
      setStatus('success');
      setTimeout(() => {
        router.push('/leagues');
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">Completing Sign In</h1>
        
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Verifying your email link...</p>
          </>
        )}
        
        {status === 'signing-in' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Signing you in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="text-xl font-medium text-green-600 mb-2">Successfully signed in!</p>
            <p>Redirecting you...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <p className="text-xl font-medium text-red-600 mb-2">Sign in failed</p>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}