'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Player } from '../../lib/types';
import SportIcons from '../../components/home/SportIcons';

const nflDraftOrder = [
  { pick: 1, team: "Las Vegas Raiders", wins: 3, losses: 14, ties: 0 },
  { pick: 2, team: "New York Jets", wins: 3, losses: 14, ties: 0 },
  { pick: 3, team: "Arizona Cardinals", wins: 3, losses: 14, ties: 0 },
  { pick: 4, team: "Tennessee Titans", wins: 3, losses: 14, ties: 0 },
  { pick: 5, team: "New York Giants", wins: 4, losses: 13, ties: 0 },
  { pick: 6, team: "Cleveland Browns", wins: 5, losses: 12, ties: 0 },
  { pick: 7, team: "Washington Commanders", wins: 5, losses: 12, ties: 0 },
  { pick: 8, team: "New Orleans Saints", wins: 6, losses: 11, ties: 0 },
  { pick: 9, team: "Kansas City Chiefs", wins: 6, losses: 11, ties: 0 },
  { pick: 10, team: "Cincinnati Bengals", wins: 6, losses: 11, ties: 0 },
  { pick: 11, team: "Miami Dolphins", wins: 7, losses: 10, ties: 0 },
  { pick: 12, team: "Dallas Cowboys", wins: 7, losses: 9, ties: 1 },
  { pick: 13, team: "Atlanta Falcons", tradedTo: "L.A. Rams", wins: 8, losses: 9, ties: 0 },
  { pick: 14, team: "Baltimore Ravens", wins: 8, losses: 9, ties: 0 },
  { pick: 15, team: "Tampa Bay Buccaneers", wins: 8, losses: 9, ties: 0 },
  { pick: 16, team: "Indianapolis Colts", tradedTo: "N.Y. Jets", wins: 8, losses: 9, ties: 0 },
  { pick: 17, team: "Detroit Lions", wins: 9, losses: 8, ties: 0 },
  { pick: 18, team: "Minnesota Vikings", wins: 9, losses: 8, ties: 0 },
  { pick: 19, team: "Carolina Panthers", wins: 8, losses: 9, ties: 0 },
  { pick: 20, team: "Green Bay Packers", tradedTo: "Dallas", wins: 9, losses: 7, ties: 1 },
  { pick: 21, team: "Pittsburgh Steelers", wins: 10, losses: 7, ties: 0 },
  { pick: 22, team: "Los Angeles Chargers", wins: 11, losses: 6, ties: 0 },
  { pick: 23, team: "Philadelphia Eagles", wins: 11, losses: 6, ties: 0 },
  { pick: 24, team: "Jacksonville Jaguars", tradedTo: "Cleveland", wins: 13, losses: 4, ties: 0 },
  { pick: 25, team: "Chicago Bears", wins: 11, losses: 6, ties: 0 },
  { pick: 26, team: "Buffalo Bills", wins: 12, losses: 5, ties: 0 },
  { pick: 27, team: "San Francisco 49ers", wins: 12, losses: 5, ties: 0 },
  { pick: 28, team: "Houston Texans", wins: 12, losses: 5, ties: 0 },
  { pick: 29, team: "Los Angeles Rams", wins: 12, losses: 5, ties: 0 },
  { pick: 30, team: "Denver Broncos", wins: 14, losses: 3, ties: 0 },
  { pick: 31, team: "New England Patriots", wins: 14, losses: 3, ties: 0 },
  { pick: 32, team: "Seattle Seahawks", wins: 14, losses: 3, ties: 0 },
];

export default function DraftKitPage() {
  const [prospects, setProspects] = useState<Player[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(true);

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        const q = query(
          collection(db, 'players'),
          where('sportType', '==', 'NFL'),
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
    fetchProspects();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          2026 NFL <span className="text-gradient">Draft Kit</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Everything you need to prepare for the 2026 NFL Draft. Team draft order, records, and top prospects.
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
              <p className="text-sm text-gray-500 mt-1">2025 season results</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600 w-10">#</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Team</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nflDraftOrder.map((row) => (
                    <tr key={row.pick} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-bold text-gray-900">{row.pick}.</td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900 text-sm">{row.team}</div>
                        {row.tradedTo && (
                          <div className="text-xs text-amber-600 font-medium">Traded to {row.tradedTo}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-700 text-sm">
                        {row.wins}-{row.losses}{row.ties > 0 ? `-${row.ties}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Prospects — takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Top Prospects</h2>
              <p className="text-sm text-gray-500 mt-1">2026 NFL Draft</p>
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
