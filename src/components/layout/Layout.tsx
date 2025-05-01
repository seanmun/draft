'use client';
import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import UserAvatar from '../common/UserAvatar';
import AcknowledgmentsModal from '../modals/AcknowledgmentsModal';
import PrivacyPolicyModal from '../modals/PrivacyPolicyModal';
import SupportModal from '../modals/SupportModal';
import AnnouncementBanner from '../common/AnnouncementBanner';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAcknowledgments, setShowAcknowledgments] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

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
                  How it works
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
                How it works
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

      {/* Announcement Banner - Add this right after the header */}
      <AnnouncementBanner sportType="NFL" draftYear={2025} />
      
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-100 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} Draft Day Trades</p>
              <p className="text-gray-500 text-xs mt-1">Major league sports draft prediction platform</p>
              <p className="text-gray-500 text-xs mt-1">Built and maintained by <a href="https://seanmun.com" target="_blank">Sean Munley</a></p>

            </div>
            
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
              <button 
                onClick={() => setShowAcknowledgments(true)} 
                className="text-gray-600 hover:text-blue-600"
              >
                Acknowledgments
              </button>
              <button 
                onClick={() => setShowPrivacyPolicy(true)} 
                className="text-gray-600 hover:text-blue-600"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setShowSupport(true)}
                className="text-gray-600 hover:text-blue-600"
              >
                Support
              </button>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a href="https://linkedin.com/in/sean-munley" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a href="https://twitter.com/seanmun" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="https://seanmun.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modular Modal Components */}
      <AcknowledgmentsModal 
        isOpen={showAcknowledgments} 
        onClose={() => setShowAcknowledgments(false)} 
      />
      
      <PrivacyPolicyModal 
        isOpen={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
      />
      
      <SupportModal 
        isOpen={showSupport} 
        onClose={() => setShowSupport(false)} 
      />
    </div>
  );
}