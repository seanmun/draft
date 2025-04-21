'use client';

import Link from 'next/link';
import Image from 'next/image'; // Add this import
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center text-center">
      {/* Add the logo here, above the welcome text */}
      <div className="mb-6">
        <Image 
          src="/images/ddt_gettleman.png"
          alt="Draft Day Trades Logo"
          width={250}
          height={250}
          priority
        />
      </div>
      
      <h1 className="text-4xl font-bold mb-4">Welcome to Draft Day Trades</h1>
      <p className="text-xl mb-8 max-w-2xl">
        Predict draft picks, assign confidence points, and compete with friends across multiple sports!
      </p>
      
      {user ? (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/leagues/create" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
            Create a League
          </Link>
          <Link href="/leagues" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded">
            My Leagues
          </Link>
        </div>
      ) : (
        <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
          Get Started
        </Link>
      )}
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        <div className="border p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Predict</h3>
          <p>Select which players will be drafted and in what order</p>
        </div>
        <div className="border p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Rate</h3>
          <p>Assign confidence points to each of your predictions</p>
        </div>
        <div className="border p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Compete</h3>
          <p>Win points for correct picks and compete with friends</p>
        </div>
      </div>
    </div>
  );
}