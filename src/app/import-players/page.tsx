'use client';
import { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Player, SportType } from '../../lib/types';
import Link from 'next/link';

export default function ImportPlayersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [sportType, setSportType] = useState<SportType>('NFL');
  const [draftYear, setDraftYear] = useState<number>(2025);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const importPlayersFromCSV = async () => {
    if (!file) {
      setResult('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setResult('Reading CSV file...');
    
    try {
      // Read file content
      const text = await file.text();
      
      // Simple CSV parsing (without using external libraries)
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find column indices
      const nameIndex = headers.indexOf('name');
      const positionIndex = headers.indexOf('position');
      const schoolIndex = headers.indexOf('school');
      
      // Validate headers
      if (nameIndex === -1 || positionIndex === -1) {
        throw new Error('CSV must include "name" and "position" columns');
      }
      
      // Parse data rows
      const players = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim());
        if (values.length < 2) continue; // Skip invalid lines
        
        const player = {
          name: values[nameIndex],
          position: values[positionIndex],
          school: schoolIndex !== -1 ? values[schoolIndex] || '' : '',
        };
        
        if (player.name && player.position) {
          players.push(player);
        }
      }
      
      setResult(`Found ${players.length} players. Importing to database...`);
      
      // Create Firestore batch to add all players at once
      const batch = writeBatch(db);
      let count = 0;
      
      players.forEach((player) => {
        const playerData = {
          name: player.name,
          position: player.position,
          school: player.school,
          sportType: sportType,
          draftYear: draftYear,
        };
        
        const newPlayerRef = doc(collection(db, 'players'));
        batch.set(newPlayerRef, playerData);
        count++;
      });
      
      if (count === 0) {
        throw new Error('No valid players found in the CSV');
      }
      
      await batch.commit();
      setResult(`Successfully imported ${count} players to the database.`);
    } catch (error) {
      console.error('Error importing players:', error);
      setResult(`Error importing players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Import Players from CSV</h1>
        <Link href="/manage-players" className="text-blue-600 hover:underline">
          Back to Player Management
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="mb-4 text-gray-600">
          Upload a CSV file with player data. The CSV should have columns for name, position, and school.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="sportType">
              Sport
            </label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value as SportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="WNBA">WNBA</option>
              <option value="NHL">NHL</option>
              <option value="MLB">MLB</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="draftYear">
              Draft Year
            </label>
            <select
              id="draftYear"
              value={draftYear}
              onChange={(e) => setDraftYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="csvFile">
            CSV File
          </label>
          <input
            type="file"
            id="csvFile"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            CSV format: name, position, school
          </p>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={importPlayersFromCSV}
            disabled={loading || !file}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline ${
              (loading || !file) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Importing...' : 'Import Players'}
          </button>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">CSV Format Example</h3>
        <p className="text-blue-700 mb-2">
          Your CSV file should have the following columns:
        </p>
        <pre className="bg-white p-3 text-sm font-mono rounded border border-blue-200">
{`name,position,school
Caleb Williams,QB,USC
Marvin Harrison Jr.,WR,Ohio State
Drake Maye,QB,North Carolina
`}
        </pre>
      </div>
    </div>
  );
}