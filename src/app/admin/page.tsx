// src/app/admin/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/admin';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin(user.uid)) {
        router.push('/');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Player Management</h2>
          <p className="text-gray-600 mb-4">
            Import and manage players for all sports and draft years. These players will be available to all leagues.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/manage-players" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center">
              Manage Players
            </Link>
            <Link href="/manage-teams" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center">
              Manage Teams
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Draft Oracle</h2>
          <p className="text-gray-600 mb-4">
            Enter actual draft results as they happen on draft night. Results will be available to all leagues.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/manage-draft" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-center">
              Global Draft Oracle
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">League Management</h2>
          <p className="text-gray-600 mb-4">
            View and manage all leagues in the system.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/leagues" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center">
              Manage Leagues
            </Link>
            
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}