'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { SportType } from '../../lib/types';

interface AnnouncementBannerProps {
  sportType?: SportType;
  draftYear?: number;
}

export default function AnnouncementBanner({ 
  sportType = 'NFL', 
  draftYear = 2025 
}: AnnouncementBannerProps) {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkDraftStatus = async () => {
      try {
        const settingsQuery = query(
          collection(db, 'draftSettings'),
          where('sportType', '==', sportType),
          where('draftYear', '==', draftYear)
        );
        
        const settingsSnapshot = await getDocs(settingsQuery);
        let draftIsLive = false;
        
        if (!settingsSnapshot.empty) {
          const settingsData = settingsSnapshot.docs[0].data();
          draftIsLive = settingsData.isLive === true;
        }
        
        setIsLive(draftIsLive);
      } catch (error) {
        console.error('Error fetching draft status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkDraftStatus();

    // Check every minute for changes
    const interval = setInterval(checkDraftStatus, 60000);
    
    return () => clearInterval(interval);
  }, [sportType, draftYear]);

  if (loading) return null;

  return (
    <div className={`w-full py-3 px-4 text-center text-white font-bold ${
      isLive ? 'bg-green-600' : 'bg-red-600'
    }`}>
      {isLive ? (
        <div className="flex items-center justify-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="uppercase tracking-wider">NFL Draft is LIVE!</span>
        </div>
      ) : (
        <span>NBA Draft predictions lock at 7:55pm EST Wednesday June 25th</span>
      )}
    </div>
  );
}