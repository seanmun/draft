'use client';
import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import UserAvatar from '../common/UserAvatar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo and Main Nav */}
            <div className="flex items-center">
              <Link href="/" className="font-bold text-xl text-blue-600">
                Draft Day Trades
              </Link>
              
              {/* Main Navigation - hide on mobile */}
              <nav className="hidden md:flex ml-6">
                <Link href="/leagues" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  Leagues
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  About
                </Link>
              </nav>
            </div>
            
            {/* User Menu - Show if logged in */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={toggleMenu}
                  className="flex items-center focus:outline-none"
                >
                  <UserAvatar userId={user.uid} size="sm" className="mr-2" />
                  <span className="hidden md:inline text-gray-700 mr-1">
                    {user.displayName || 'User'}
                  </span>
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link 
                      href="/leagues" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Leagues
                    </Link>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Login/Register Links if not logged in
              <div className="flex items-center">
                <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 mr-2">
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Get Started
                </Link>
              </div>
            )}
            
            {/* Mobile menu button - only show on mobile */}
            <button 
              className="md:hidden focus:outline-none"
              onClick={toggleMenu}
            >
              <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
          
          {/* Mobile Navigation - show when menu is open */}
          {menuOpen && (
            <nav className="md:hidden mt-3 pb-3">
              <Link 
                href="/leagues" 
                className="block text-gray-700 hover:text-blue-600 py-2"
                onClick={() => setMenuOpen(false)}
              >
                Leagues
              </Link>
              <Link 
                href="/about" 
                className="block text-gray-700 hover:text-blue-600 py-2"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              {user && (
                <>
                  <Link 
                    href="/profile" 
                    className="block text-gray-700 hover:text-blue-600 py-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left text-gray-700 hover:text-blue-600 py-2"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </nav>
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