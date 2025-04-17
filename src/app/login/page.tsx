'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginButton from '../../components/auth/LoginButton';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { user, loading } = useAuth();
  const router = useRouter();

// In the useEffect that handles redirect after login, add this:
useEffect(() => {
  if (!loading && user) {
    // Check if there's a pending join link
    const pendingJoin = sessionStorage.getItem('pendingJoin');
    if (pendingJoin) {
      sessionStorage.removeItem('pendingJoin');
      router.push(pendingJoin);
    } else {
      router.push('/leagues');
    }
  }
}, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Draft Day Trades</h1>
        <p className="mb-4 text-gray-600 text-center">
          Sign in to create or join a draft prediction league
        </p>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}