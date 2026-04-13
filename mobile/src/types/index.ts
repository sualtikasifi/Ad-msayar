export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  username: string;
  avatar_url: string | null;
  is_guest?: boolean;
}

export interface FriendWithSteps extends PublicUser {
  today_steps: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface FriendRequest extends Friendship {
  from_user?: PublicUser;
  to_user?: PublicUser;
}

export interface DailySteps {
  id: string;
  user_id: string;
  step_date: string;
  step_count: number;
  synced_at: string;
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
  started_at: string | null;
  created_at: string;
  updated_at: string;
  my_status?: ParticipantStatus;
  my_steps?: number;
  my_rank?: number | null;
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

export interface ChallengeDetail extends Challenge {
  rankings: ParticipantRanking[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  stepCount: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser & { email?: string };
}
