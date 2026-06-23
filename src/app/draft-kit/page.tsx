'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Player, Team } from '../../lib/types';
import SportIcons from '../../components/home/SportIcons';

export default function DraftKitPage() {
  const [prospects, setProspects] = useState<Player[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        const q = query(
          collection(db, 'players'),
          where('sportType', '==', 'NBA'),
          where('draftYear', '==', 2026)
        );
        const snapshot = await getDocs(q);
        const players: Player[] = [];
        snapshot.forEach(doc => {
          players.push({ id: doc.id, ...doc.data() } as Player);
        });
        players.sort((a, b) => (a.rank || 999) - (b.rank || 999));
        setProspects(players);
      } catch (error) {
        console.error('Error fetching prospects:', error);
      } finally {
        setLoadingProspects(false);
      }
    };

    const fetchTeams = async () => {
      try {
        const q = query(
          collection(db, 'teams'),
          where('sportType', '==', 'NBA'),
          where('draftYear', '==', 2026)
        );
        const snapshot = await getDocs(q);
        const teamsData: Team[] = [];
        snapshot.forEach(doc => {
          teamsData.push({ id: doc.id, ...doc.data() } as Team);
        });
        teamsData.sort((a, b) => a.pick - b.pick);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchProspects();
    fetchTeams();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          2026 NBA <span className="text-gradient">Draft Kit</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Everything you need to prepare for the 2026 NBA Draft. Team draft order, records, and top prospects.
        </p>
        <SportIcons />
      </div>

      {/* Two-column layout: draft order (1 col) + prospects (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draft Order — takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:sticky lg:top-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Draft Order</h2>
              <p className="text-sm text-gray-500 mt-1">2026 NBA Draft</p>
            </div>
            {loadingTeams ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm">Loading draft order...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm">Draft order coming soon.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600 w-10">#</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-gray-900">{team.pick}.</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {team.logoUrl && (
                              <img src={team.logoUrl} alt={team.name} className="h-5 w-5 flex-shrink-0" />
                            )}
                            <div className="font-medium text-gray-900 text-sm">{team.name}</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Prospects — takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Top Prospects</h2>
              <p className="text-sm text-gray-500 mt-1">2026 NBA Draft</p>
            </div>
            {loadingProspects ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm">Loading prospects...</p>
              </div>
            ) : prospects.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm">Prospect rankings coming soon.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600 w-12">Rk</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Player</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Pos</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">School</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prospects.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-gray-900">{player.rank}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{player.name}</td>
                        <td className="px-4 py-2 text-gray-700">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {player.position}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{player.school}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
