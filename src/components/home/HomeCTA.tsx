'use client';

import { useAuth } from '../../hooks/useAuth';
import { TrackableLink } from '../seo/TrackableLink';

export default function HomeCTA() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-12 w-44 bg-gray-200 rounded-lg animate-pulse mx-auto" />;
  }

  if (user) {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <TrackableLink
          href="/leagues/create"
          fromPage="/"
          linkText="Create a League"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md shadow-blue-500/20 transition-all"
        >
          Create a League
        </TrackableLink>
        <TrackableLink
          href="/leagues"
          fromPage="/"
          linkText="My Leagues"
          className="border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 font-bold py-3 px-8 rounded-lg transition-colors"
        >
          My Leagues
        </TrackableLink>
      </div>
    );
  }

  return (
    <TrackableLink
      href="/login"
      fromPage="/"
      linkText="Get Started"
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md shadow-blue-500/20 transition-all text-lg"
    >
      Get Started
    </TrackableLink>
  );
}
