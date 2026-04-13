export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  is_guest: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  avatar_url: string | null;
  is_guest: boolean;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: Date;
  updated_at: Date;
}

export interface DailySteps {
  id: string;
  user_id: string;
  step_date: string;
  step_count: number;
  synced_at: Date;
}

export type ChallengeType = '1v1' | 'group';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined';

export type ChallengeMode = 'standard' | 'duel' | 'race';

export interface Challenge {
  id: string;
  creator_id: string;
  type: ChallengeType;
  mode: ChallengeMode;
  status: ChallengeStatus;
  title: string | null;
  start_date: string;
  end_date: string;
  step_goal: number | null;
  penalty_text: string | null;
  started_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ParticipantStatus;
  total_steps: number;
  rank: number | null;
  joined_at: Date | null;
  penalty_claimed: boolean;
  created_at: Date;
}

export interface ParticipantRanking {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalSteps: number;
  rank: number;
  stepsToday: number;
  penaltyClaimed?: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}
