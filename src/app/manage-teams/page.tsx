// src/app/manage-teams/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { Team, SportType } from '../../lib/types';
import { isAdmin } from '../../lib/admin';

export default function ManageTeamsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportType, setSportType] = useState<SportType>('NFL');
  const [draftYear, setDraftYear] = useState<number>(2025);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // For adding/editing teams
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form fields
  const [teamName, setTeamName] = useState('');
  const [teamAbbr, setTeamAbbr] = useState('');
  const [teamPick, setTeamPick] = useState('');
  const [teamNeeds, setTeamNeeds] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && !isAdmin(user.uid)) {
      router.push('/');
      return;
    }

    if (user) {
      fetchTeams();
    }
  }, [user, authLoading, router, sportType, draftYear]);
  
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('sportType', '==', sportType),
        where('draftYear', '==', draftYear)
      );
      
      const snapshot = await getDocs(teamsQuery);
      let teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      // Sort by pick order
      teamsData = teamsData.sort((a, b) => a.pick - b.pick);
      
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamAbbr(team.abbreviation);
    setTeamPick(team.pick.toString());
    setTeamNeeds(team.needs?.join(', ') || '');
    setTeamLogo(team.logoUrl || '');
    setIsAdding(false);
  };
  
  const handleAddNew = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamAbbr('');
    setTeamPick('');
    setTeamNeeds('');
    setTeamLogo('');
    setIsAdding(true);
  };
  
  const handleCancel = () => {
    setEditingTeam(null);
    setIsAdding(false);
  };
  
  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      
      // Validate data
      if (!teamName || !teamAbbr || !teamPick) {
        setError('Team name, abbreviation, and pick are required');
        return;
      }
      
      const pickNumber = parseInt(teamPick);
      if (isNaN(pickNumber) || pickNumber < 1) {
        setError('Pick must be a positive number');
        return;
      }
      
      // Check for duplicate pick position
      if (teams.some(t => t.pick === pickNumber && t.id !== (editingTeam?.id || ''))) {
        setError(`Pick #${pickNumber} is already assigned to another team`);
        return;
      }
      
      // Format needs as an array
      const needsArray = teamNeeds
        .split(',')
        .map(need => need.trim())
        .filter(need => need.length > 0);
      
      // Create team data
      const teamData = {
        name: teamName,
        abbreviation: teamAbbr,
        pick: pickNumber,
        needs: needsArray,
        logoUrl: teamLogo || null,
        sportType,
        draftYear
      };
      
      if (editingTeam) {
        // Update existing team
        await setDoc(doc(db, 'teams', editingTeam.id), teamData);
        setSuccess(`Team "${teamName}" updated successfully`);
      } else {
        // Add new team
        await addDoc(collection(db, 'teams'), teamData);
        setSuccess(`Team "${teamName}" added successfully`);
      }
      
      // Reset form
      setEditingTeam(null);
      setIsAdding(false);
      
      // Refresh data
      await fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      setError('Failed to save team data');
    }
  };
  
  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete ${team.name}?`)) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'teams', team.id));
      setSuccess(`Team "${team.name}" deleted successfully`);
      await fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team');
    }
  };
  
  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    try {
      const file = event.target.files[0];
      const text = await file.text();
      
      // Parse CSV
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find column indices
      const nameIndex = headers.indexOf('name');
      const abbrIndex = headers.indexOf('abbreviation');
      const pickIndex = headers.indexOf('pick');
      const needsIndex = headers.indexOf('needs');
      const logoIndex = headers.indexOf('logo');
      
      // Validate headers
      if (nameIndex === -1 || abbrIndex === -1 || pickIndex === -1) {
        setError('CSV must include "name", "abbreviation", and "pick" columns');
        return;
      }
      
      // Create batch for bulk operation
      const batch = writeBatch(db);
      const teamsCollectionRef = collection(db, 'teams');
      let count = 0;
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim());
        if (values.length < 3) continue; // Skip invalid lines
        
        const name = values[nameIndex];
        const abbr = values[abbrIndex];
        const pick = parseInt(values[pickIndex]);
        
        if (!name || !abbr || isNaN(pick)) continue; // Skip invalid data
        
        // Parse needs if available
        const needs = needsIndex !== -1 && values[needsIndex] 
          ? values[needsIndex].split(';').map(n => n.trim()) 
          : [];
        
        // Get logo if available
        const logo = logoIndex !== -1 ? values[logoIndex] : null;
        
        // Create team data
        const teamData = {
          name,
          abbreviation: abbr,
          pick,
          needs,
          logoUrl: logo,
          sportType,
          draftYear
        };
        
        // Add to batch
        const docRef = doc(teamsCollectionRef);
        batch.set(docRef, teamData);
        count++;
      }
      
      // Commit batch if we have teams
      if (count > 0) {
        await batch.commit();
        setSuccess(`Successfully imported ${count} teams`);
        await fetchTeams();
      } else {
        setError('No valid teams found in CSV');
      }
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing teams:', error);
      setError('Failed to import teams from CSV');
    }
  };
  
  // Render UI
  if (authLoading || (loading && user)) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; // Redirect handled in useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Draft Order</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Manage Teams Draft Order</h2>
        <p className="text-blue-700">
          Add and organize teams for draft order. This order will be used when entering actual draft picks.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      {/* Sport and Year Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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
          
          <div className="flex-1">
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
      </div>
      
      {/* Team Form (for adding/editing) */}
      {(isAdding || editingTeam) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {isAdding ? 'Add New Team' : `Edit ${editingTeam?.name}`}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="teamName">
                Team Name
              </label>
              <input
                type="text"
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Chicago Bears"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="teamAbbr">
                Abbreviation
              </label>
              <input
                type="text"
                id="teamAbbr"
                value={teamAbbr}
                onChange={(e) => setTeamAbbr(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="CHI"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="teamPick">
                Draft Position
              </label>
              <input
                type="number"
                id="teamPick"
                value={teamPick}
                onChange={(e) => setTeamPick(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="teamLogo">
                Logo URL (optional)
              </label>
              <input
                type="text"
                id="teamLogo"
                value={teamLogo}
                onChange={(e) => setTeamLogo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/logo.png"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2" htmlFor="teamNeeds">
                Team Needs (comma separated, optional)
              </label>
              <input
                type="text"
                id="teamNeeds"
                value={teamNeeds}
                onChange={(e) => setTeamNeeds(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="QB, WR, CB"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}
      
      {/* Teams List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Teams</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleAddNew}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Team
            </button>
            <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
              Bulk Import
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        {teams.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No teams found. Add teams using the form above or import from CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pick
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abbr
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Needs
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.map(team => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {team.pick}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {team.logoUrl && (
                        <img 
                          src={team.logoUrl} 
                          alt={team.name} 
                          className="h-6 w-6 inline-block mr-2"
                        />
                      )}
                      {team.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {team.abbreviation}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {team.needs && team.needs.join(', ')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* CSV Format Example */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">CSV Import Format</h3>
        <p className="text-blue-700 mb-2">
          Your CSV file should have the following columns:
        </p>
        <pre className="bg-white p-3 text-sm font-mono rounded border border-blue-200">
          {`name,abbreviation,pick,needs,logo
Chicago Bears,CHI,1,"QB, OT, DL",https://example.com/bears-logo.png
Washington Commanders,WAS,2,"QB, CB",https://example.com/commanders-logo.png`}
        </pre>
      </div>
    </div>
  );
}