// src/lib/admin.ts
import { collection, query, where, getDocs, addDoc, writeBatch, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Player, SportType, ActualPick } from './types';

// Admin user ID
export const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || 'gT2kV06j0udPRzdPBd0jt82ufNk2';

// Check if a user is an admin
export const isAdmin = (userId: string): boolean => {
  return userId === ADMIN_USER_ID;
};

// Get players for a specific sport and year
export const getPlayersBySportAndYear = async (sportType: SportType, draftYear: number) => {
  try {
    const q = query(
      collection(db, 'players'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    const players: Player[] = [];
    
    snapshot.forEach(doc => {
      players.push({ id: doc.id, ...doc.data() } as Player);
    });
    
    // Sort by rank if available, otherwise by name
    return players.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error getting players:', error);
    throw error;
  }
};

// Get draft results for a sport and year
export const getDraftResults = async (sportType: SportType, draftYear: number) => {
  try {
    const q = query(
      collection(db, 'draftResults'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    const results: ActualPick[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({ 
        id: doc.id, 
        position: data.position,
        playerId: data.playerId,
        sportType: data.sportType,
        draftYear: data.draftYear,
        teamId: data.teamId,
        timestamp: data.timestamp
      } as ActualPick);
    });
    
    // Sort by draft position
    return results.sort((a, b) => a.position - b.position);
  } catch (error) {
    console.error('Error getting draft results:', error);
    throw error;
  }
};

// Add or update a draft pick
export const updateDraftPick = async (pickData: Omit<ActualPick, 'id'>) => {
  try {
    // Check if a pick already exists for this position, sport, and year
    const q = query(
      collection(db, 'draftResults'),
      where('sportType', '==', pickData.sportType),
      where('draftYear', '==', pickData.draftYear),
      where('position', '==', pickData.position)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update existing pick
      const pickDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'draftResults', pickDoc.id), {
        ...pickData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: pickDoc.id, updated: true };
    } else {
      // Create new pick
      const docRef = await addDoc(collection(db, 'draftResults'), {
        ...pickData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id, updated: false };
    }
  } catch (error) {
    console.error('Error updating draft pick:', error);
    throw error;
  }
};

// Import players from CSV data
export const importPlayersFromCSV = async (
  csvData: string, 
  sportType: SportType, 
  draftYear: number
) => {
  try {
    // Parse CSV
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const nameIndex = headers.indexOf('name');
    const positionIndex = headers.indexOf('position');
    const schoolIndex = headers.indexOf('school');
    const rankIndex = headers.indexOf('rank');
    
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
        rank: rankIndex !== -1 ? parseInt(values[rankIndex]) || i : i,
        sportType,
        draftYear
      };
      
      if (player.name && player.position) {
        players.push(player);
      }
    }
    
    // Create Firestore batch to add all players at once
    const batch = writeBatch(db);
    let count = 0;
    
    players.forEach((player) => {
      const newPlayerRef = doc(collection(db, 'players'));
      batch.set(newPlayerRef, player);
      count++;
    });
    
    if (count === 0) {
      throw new Error('No valid players found in the CSV');
    }
    
    await batch.commit();
    return { success: true, count };
  } catch (error) {
    console.error('Error importing players:', error);
    throw error;
  }
};

// Get draft settings
export const getDraftSettings = async (sportType: SportType, draftYear: number) => {
  try {
    const q = query(
      collection(db, 'draftSettings'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create default settings if none exist
      const defaultSettings = {
        sportType,
        draftYear,
        isLive: false,
        lastUpdatedBy: ADMIN_USER_ID,
        lastUpdatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'draftSettings'), defaultSettings);
      return { id: docRef.id, ...defaultSettings, isLive: false };
    }
    
    // Return existing settings
    const settingsDoc = snapshot.docs[0];
    return { id: settingsDoc.id, ...settingsDoc.data() };
  } catch (error) {
    console.error('Error getting draft settings:', error);
    throw error;
  }
};

// Update draft live status
export const updateDraftLiveStatus = async (
  sportType: SportType, 
  draftYear: number, 
  isLive: boolean,
  userId: string
) => {
  try {
    const q = query(
      collection(db, 'draftSettings'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create settings if none exist
      const settings = {
        sportType,
        draftYear,
        isLive,
        lastUpdatedBy: userId,
        lastUpdatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'draftSettings'), settings);
    } else {
      // Update existing settings
      const settingsDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'draftSettings', settingsDoc.id), {
        isLive,
        lastUpdatedBy: userId,
        lastUpdatedAt: serverTimestamp()
      });
    }
    
    return { success: true, isLive };
  } catch (error) {
    console.error('Error updating draft live status:', error);
    throw error;
  }
};