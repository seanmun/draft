// src/lib/mockDrafts.ts
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Player, SportType, MockDraft } from './types';

// Get mock drafts for a specific sport and year
export const getMockDraftsBySportAndYear = async (sportType: SportType, draftYear: number) => {
  try {
    const q = query(
      collection(db, 'mockDrafts'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear)
    );
    
    const snapshot = await getDocs(q);
    const mockDrafts: MockDraft[] = [];
    
    snapshot.forEach(doc => {
      mockDrafts.push({ id: doc.id, ...doc.data() } as MockDraft);
    });
    
    return mockDrafts;
  } catch (error) {
    console.error('Error getting mock drafts:', error);
    throw error;
  }
};

// Get a specific mock draft by sportscaster and version
export const getMockDraftBySourceAndVersion = async (
  sportType: SportType,
  draftYear: number,
  sportscaster: string,
  version: string
) => {
  try {
    const q = query(
      collection(db, 'mockDrafts'),
      where('sportType', '==', sportType),
      where('draftYear', '==', draftYear),
      where('sportscaster', '==', sportscaster),
      where('version', '==', version)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    // Return the first matching document (should be only one)
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as MockDraft;
  } catch (error) {
    console.error('Error getting mock draft:', error);
    throw error;
  }
};

// Import mock draft from CSV data
export const importMockDraftFromCSV = async (
  csvData: string,
  sportscaster: string,
  version: string,
  sportType: SportType,
  draftYear: number,
  players: Player[]
) => {
  try {
    // Log player count for debugging
    console.log(`Attempting to import with ${players.length} players available`);
    
    // Normalize player names by removing extra spaces, etc.
    const normalizePlayerName = (name: string) => {
      // Remove all non-alphanumeric characters and convert to lowercase
      return name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
    };
    
    // Create multiple maps for different ways of matching
    const playerNameToIdMap = new Map<string, string>();
    const playerLastNameMap = new Map<string, Player[]>();
    
    players.forEach(player => {
      const normalizedName = normalizePlayerName(player.name);
      playerNameToIdMap.set(normalizedName, player.id);
      
      // Also map by last name for partial matching
      const nameParts = normalizedName.split(' ');
      if (nameParts.length > 0) {
        const lastName = nameParts[nameParts.length - 1];
        if (!playerLastNameMap.has(lastName)) {
          playerLastNameMap.set(lastName, []);
        }
        playerLastNameMap.get(lastName)?.push(player);
      }
      
      console.log(`Added player to map: "${normalizedName}" -> ${player.id}`);
    });
    
    // Parse CSV
    const lines = csvData.split('\n');
    console.log(`CSV has ${lines.length} lines`);
    
    // Log the first few lines for debugging
    console.log("CSV header:", lines[0]);
    if (lines.length > 1) console.log("First data row:", lines[1]);
    if (lines.length > 2) console.log("Second data row:", lines[2]);
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log("Parsed headers:", headers);
    
    // Find column indices
    const positionIndex = headers.indexOf('position');
    const playerNameIndex = headers.indexOf('player_name');
    
    console.log(`Position index: ${positionIndex}, Player name index: ${playerNameIndex}`);
    
    // Validate headers
    if (positionIndex === -1 || playerNameIndex === -1) {
      throw new Error(`CSV headers must include "position" and "player_name" columns. Found: ${headers.join(', ')}`);
    }
    
    // Parse data rows
    const picks = [];
    const missingPlayers = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`Line ${i} is empty, skipping`);
        continue; // Skip empty lines
      }
      
      const values = line.split(',').map(v => v.trim());
      if (values.length < 2) {
        console.log(`Line ${i} has fewer than 2 values, skipping`);
        continue; // Skip invalid lines
      }
      
      const position = parseInt(values[positionIndex]);
      const playerName = values[playerNameIndex];
      
      if (isNaN(position) || !playerName) {
        console.log(`Line ${i} has invalid position or empty player name, skipping`);
        continue; // Skip invalid data
      }
      
      // Find player ID from name
      const normalizedName = normalizePlayerName(playerName);
      console.log(`Looking for player: "${normalizedName}"`);
      
      // Try exact match first
      let playerId = playerNameToIdMap.get(normalizedName);
      
      // If no exact match, try matching by last name
      if (!playerId) {
        const nameParts = normalizedName.split(' ');
        if (nameParts.length > 0) {
          const lastName = nameParts[nameParts.length - 1];
          const candidates = playerLastNameMap.get(lastName);
          
          if (candidates && candidates.length === 1) {
            // If there's only one player with this last name, use it
            playerId = candidates[0].id;
            console.log(`Matched by last name: "${normalizedName}" -> ${candidates[0].name} (${playerId})`);
          } else if (candidates && candidates.length > 1) {
            // Multiple matches - try to find the best one
            let bestMatch = null;
            let bestScore = 0;
            
            for (const candidate of candidates) {
              // Simple matching algorithm - count how many words match
              const candidateParts = normalizePlayerName(candidate.name).split(' ');
              let matchScore = 0;
              
              for (const part of nameParts) {
                if (candidateParts.includes(part)) {
                  matchScore++;
                }
              }
              
              if (matchScore > bestScore) {
                bestScore = matchScore;
                bestMatch = candidate;
              }
            }
            
            if (bestMatch && bestScore > 0) {
              playerId = bestMatch.id;
              console.log(`Matched best candidate: "${normalizedName}" -> ${bestMatch.name} (${playerId})`);
            }
          }
        }
      }
      
      if (playerId) {
        console.log(`Found match for player "${normalizedName}" with ID ${playerId}`);
        picks.push({ position, playerId });
      } else {
        console.log(`No match found for player "${normalizedName}"`);
        missingPlayers.push({ position, playerName });
      }
    }
    
    console.log(`Parsed ${picks.length} valid picks and found ${missingPlayers.length} missing players`);
    
    // Handle the case where no picks were matched
    if (picks.length === 0 && missingPlayers.length === 0) {
      throw new Error('No valid picks found in the CSV file. Please check the format.');
    } else if (picks.length === 0 && missingPlayers.length > 0) {
      console.warn(`No matching players found, but will create mock draft anyway with placeholder IDs`);
      // Create temporary picks with placeholder IDs for testing
      missingPlayers.forEach(mp => {
        picks.push({
          position: mp.position,
          playerId: `placeholder_${mp.position}` // Use placeholder IDs
        });
      });
    }
    
    // Check if a mock draft already exists for this sportscaster, version, sport, and year
    const existingMockDraft = await getMockDraftBySourceAndVersion(
      sportType, 
      draftYear, 
      sportscaster, 
      version
    );
    
    if (existingMockDraft) {
      // Update existing mock draft
      await updateDoc(doc(db, 'mockDrafts', existingMockDraft.id), {
        picks,
        updatedAt: serverTimestamp()
      });
      
      return { 
        success: true, 
        updated: true,
        count: picks.length,
        missingPlayers: missingPlayers.length > 0 ? missingPlayers : null
      };
    } else {
      // Create new mock draft
      const newMockDraft = {
        sportscaster,
        version,
        sportType,
        draftYear,
        picks,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'mockDrafts'), newMockDraft);
      
      return { 
        success: true, 
        updated: false,
        id: docRef.id,
        count: picks.length,
        missingPlayers: missingPlayers.length > 0 ? missingPlayers : null
      };
    }
  } catch (error) {
    console.error('Error importing mock draft:', error);
    throw error;
  }
};

// Get a specific mock draft by ID
export const getMockDraftById = async (id: string) => {
  try {
    const docRef = doc(db, 'mockDrafts', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as MockDraft;
  } catch (error) {
    console.error('Error getting mock draft by ID:', error);
    throw error;
  }
};