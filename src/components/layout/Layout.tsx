'use client';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Changed from next/router to next/navigation
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Draft Day Trades</Link>
          {user ? (
            <div className="flex items-center space-x-4">
              <span>{user.displayName}</span>
              <button 
                onClick={() => auth.signOut()}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded">
              Sign In
            </Link>
          )}
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-200 p-4">
        <div className="container mx-auto text-center text-gray-600">
          &copy; {new Date().getFullYear()} Draft Day Trades
        </div>
      </footer>
    </div>
  );
}