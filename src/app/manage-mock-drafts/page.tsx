// src/app/manage-mock-drafts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/admin';
import { getPlayersBySportAndYear } from '../../lib/admin';
import { importMockDraftFromCSV, getMockDraftsBySportAndYear } from '../../lib/mockDrafts';
import Link from 'next/link';
import { Player, SportType, MockDraft } from '../../lib/types';

export default function ManageMockDraftsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sportType, setSportType] = useState<SportType>('NFL');
  const [draftYear, setDraftYear] = useState<number>(2025);
  const [sportscaster, setSportscaster] = useState('');
  const [version, setVersion] = useState('');
  const [csvData, setCsvData] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [mockDrafts, setMockDrafts] = useState<MockDraft[]>([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin(user.uid)) {
        router.push('/');
      } else {
        setAuthorized(true);
        fetchData();
      }
    }
  }, [user, loading, router, sportType, draftYear]);

  const fetchData = async () => {
    if (!authorized) return;
    
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    
    try {
      // Get players for this sport and year
      const fetchedPlayers = await getPlayersBySportAndYear(sportType, draftYear);
      setPlayers(fetchedPlayers);
      
      // Get mock drafts for this sport and year
      const fetchedMockDrafts = await getMockDraftsBySportAndYear(sportType, draftYear);
      setMockDrafts(fetchedMockDrafts);
    } catch (error) {
      console.error('Error fetching data:', error);
      setFeedback({
        message: 'Failed to load data. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData || !sportscaster || !version) {
      setFeedback({
        message: 'Please provide a CSV file, sportscaster name, and version',
        type: 'error'
      });
      return;
    }
    
    setIsSaving(true);
    setFeedback({ message: '', type: '' });
    
    try {
      const result = await importMockDraftFromCSV(
        csvData,
        sportscaster,
        version,
        sportType,
        draftYear,
        players
      );
      
      if (result.success) {
        let message = result.updated
          ? `Successfully updated mock draft with ${result.count} picks`
          : `Successfully imported mock draft with ${result.count} picks`;
        
        // Check for missing players - safely access the array
        if (result.missingPlayers && result.missingPlayers.length > 0) {
          message += ` Warning: ${result.missingPlayers.length} players could not be matched.`;
          setFeedback({
            message: message,
            type: 'warning'
          });
        } else {
          setFeedback({
            message: message,
            type: 'success'
          });
        }
        
        // Refresh the list of mock drafts
        fetchData();
        
        // Clear form
        setCsvData('');
        setSportscaster('');
        setVersion('');
        
        // Reset file input
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error importing mock draft:', error);
      setFeedback({
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | { toDate: () => Date } | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firebase Timestamp
      if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      
      // Handle Date object
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      
      return 'N/A';
    } catch {
      // Catch without assigning the error to a variable
      return 'N/A';
    }
  };

  if (loading || !authorized) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mock Draft Management</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Mock Draft Import</h2>
        <p className="text-blue-700">
          Upload mock drafts from sportscasters for users to use as starting points for their predictions.
          The CSV should have columns for &quot;position&quot; and &quot;player_name&quot;.
        </p>
      </div>
      
      {feedback.message && (
        <div 
          className={`p-4 mb-6 rounded-md ${
            feedback.type === 'error' 
              ? 'bg-red-50 text-red-700' 
              : feedback.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-700'
          }`}
        >
          {feedback.message}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="sportType">
              Sport
            </label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value as SportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading || isSaving}
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
              disabled={isLoading || isSaving}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">
              Player Count
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              {isLoading ? 'Loading...' : players.length} players available
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Form - Always shown now */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold text-gray-800 mb-4">Import Mock Draft</h3>
            
            {players.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">First 10 Players in Database</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {players.slice(0, 10).map((player, index) => (
                        <div key={index} className="bg-white p-2 rounded text-sm">
                        <strong>{player.name}</strong> ({player.position})
                        </div>
                    ))}
                    </div>
                    <p className="text-blue-700 mt-2">
                    {players.length > 10 ? `Plus ${players.length - 10} more players...` : ''}
                    </p>
                </div>
                )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="sportscaster">
                Sportscaster / Source
              </label>
              <input
                type="text"
                id="sportscaster"
                value={sportscaster}
                onChange={(e) => setSportscaster(e.target.value)}
                placeholder="e.g., Mel Kiper, The Ringer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isSaving}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="version">
                Version
              </label>
              <input
                type="text"
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., V1, 2.0, April 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isSaving}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="csvFile">
                CSV File
              </label>
              <input
                type="file"
                id="csvFile"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                CSV must include columns for &quot;position&quot; and &quot;player_name&quot;
              </p>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={handleImport}
                disabled={!csvData || isSaving}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg ${
                  (!csvData || isSaving) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? 'Importing...' : 'Import Mock Draft'}
              </button>
            </div>
          </div>
          
          {/* Existing Mock Drafts */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Existing Mock Drafts</h3>
            
            {isLoading ? (
              <div className="text-center py-8">Loading mock drafts...</div>
            ) : mockDrafts.length === 0 ? (
              <div className="bg-gray-100 p-4 rounded-md text-gray-500 text-center">
                No mock drafts found for {sportType} {draftYear}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sportscaster
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Picks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockDrafts.map((mockDraft) => (
                      <tr key={mockDraft.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {mockDraft.sportscaster}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {mockDraft.version}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {mockDraft.picks?.length || 0} picks
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(mockDraft.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* CSV Format Example */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">CSV Import Format</h3>
        <p className="text-blue-700 mb-2">
          Your CSV file should have the following columns:
        </p>
        <pre className="bg-white p-3 text-sm font-mono rounded border border-blue-200">
          {`position,player_name
1,Caleb Williams
2,Marvin Harrison Jr.
3,Drake Maye
...`}
        </pre>
      </div>
    </div>
  );
}