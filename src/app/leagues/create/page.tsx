'use client';
import CreateLeagueForm from '../../../components/leagues/CreateLeagueForm';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateLeaguePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  console.log("Create League Page - User:", user, "Loading:", loading);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // This will not render as the useEffect will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New League</h1>
      <CreateLeagueForm />
    </div>
  );
}