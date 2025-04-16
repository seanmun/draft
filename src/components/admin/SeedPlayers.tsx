'use client';
import { useState } from 'react';
import { seedPlayers } from '../../lib/seedPlayers';
import { SportType } from '../../lib/types';

interface SeedPlayersProps {
  sportType: SportType;
  draftYear: number;
  onComplete?: () => void;
}

export default function SeedPlayers({ sportType, draftYear, onComplete }: SeedPlayersProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState('');

  const handleSeedPlayers = async () => {
    setIsSeeding(true);
    setResult('');
    
    try {
      const result = await seedPlayers(sportType, draftYear);
      setResult(result.message);
      if (onComplete && result.success) {
        onComplete();
      }
    } catch (error) {
      console.error('Error seeding players:', error);
      setResult('Failed to seed players');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSeedPlayers}
        disabled={isSeeding}
        className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded ${
          isSeeding ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSeeding ? 'Adding Test Players...' : 'Add Test Players'}
      </button>
      
      {result && (
        <p className="mt-2 text-sm text-gray-600">{result}</p>
      )}
    </div>
  );
}