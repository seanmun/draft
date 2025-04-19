export interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }
  
  export type SportType = 'NFL' | 'NBA' | 'WNBA' | 'NHL' | 'MLB';
  
  export interface League {
    id: string;
    name: string;
    description?: string;
    sportType: SportType;
    draftYear: number;
    createdBy: string;
    members: string[];
    settings: {
      totalPicks: number;
      inviteCode: string;
      publicJoin: boolean;
    };
    createdAt: Date;
  }
  
  export interface Player {
    id: string;
    name: string;
    position: string;
    school?: string;
    team?: string;
    sportType: SportType;
    draftYear: number;
    rank?: number;
  }
  
  export interface Prediction {
    userId: string;
    leagueId: string;
    picks: {
      position: number;
      playerId: string;
      confidence: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ActualPick {
    position: number;
    playerId: string;
    teamId?: string;
    sportType: SportType;
    draftYear: number;
  }

  export interface Team {
    id: string;
    name: string;
    abbreviation: string;
    sportType: SportType;
    draftYear: number;
    pick: number;  // Draft position
    needs?: string[];  // Team needs (e.g., "QB", "WR", etc.)
    logoUrl?: string;  // URL to team logo
  }