import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Player, SportType } from './types';

// Sample NFL players for testing
const nflPlayers: Omit<Player, 'id'>[] = [
  { name: 'Caleb Williams', position: 'QB', school: 'USC', sportType: 'NFL', draftYear: 2025 },
  { name: 'Marvin Harrison Jr.', position: 'WR', school: 'Ohio State', sportType: 'NFL', draftYear: 2025 },
  { name: 'Drake Maye', position: 'QB', school: 'North Carolina', sportType: 'NFL', draftYear: 2025 },
  { name: 'Malik Nabers', position: 'WR', school: 'LSU', sportType: 'NFL', draftYear: 2025 },
  { name: 'Jayden Daniels', position: 'QB', school: 'LSU', sportType: 'NFL', draftYear: 2025 },
  { name: 'Joe Alt', position: 'OT', school: 'Notre Dame', sportType: 'NFL', draftYear: 2025 },
  { name: 'Olu Fashanu', position: 'OT', school: 'Penn State', sportType: 'NFL', draftYear: 2025 },
  { name: 'Rome Odunze', position: 'WR', school: 'Washington', sportType: 'NFL', draftYear: 2025 },
  { name: 'Laiatu Latu', position: 'EDGE', school: 'UCLA', sportType: 'NFL', draftYear: 2025 },
  { name: 'Jared Verse', position: 'EDGE', school: 'Florida State', sportType: 'NFL', draftYear: 2025 },
];

export const seedPlayers = async (sportType: SportType, draftYear: number) => {
  try {
    // Check if players already exist for this sport and year
    const q = query(
      collection(db, 'players'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log(`Players already exist for ${sportType} ${draftYear}`);
      return { success: true, message: `Players already exist for ${sportType} ${draftYear}`, count: snapshot.size };
    }
    
    // Select the appropriate player list based on sport type
    let players = nflPlayers;
    
    if (sportType !== 'NFL') {
      // For non-NFL sports, just use placeholder data
      players = Array.from({ length: 30 }, (_, i) => ({
        name: `Player ${i + 1}`,
        position: 'POS',
        school: 'University',
        sportType,
        draftYear
      }));
    }
    
    // Add players to Firestore
    for (const player of players) {
      await addDoc(collection(db, 'players'), player);
    }
    
    return { success: true, message: `Successfully added ${players.length} ${sportType} players for ${draftYear}`, count: players.length };
  } catch (error) {
    console.error('Error seeding players:', error);
    return { success: false, message: 'Failed to seed players', error };
  }
};