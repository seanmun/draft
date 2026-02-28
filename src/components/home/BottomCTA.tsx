'use client';

import { useAuth } from '../../hooks/useAuth';
import { TrackableLink } from '../seo/TrackableLink';

export default function BottomCTA() {
  const { user } = useAuth();

  if (user) return null;

  return (
    <TrackableLink
      href="/login"
      fromPage="/"
      linkText="Create Free Account"
      className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-8 rounded-lg transition-colors inline-block text-lg shadow-md"
    >
      Create Free Account
    </TrackableLink>
  );
}
