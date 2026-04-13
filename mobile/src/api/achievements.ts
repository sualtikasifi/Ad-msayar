import { apiClient } from './client';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  xp: number;
  earned: boolean;
  earned_at: string | null;
}

export interface AchievementsResponse {
  total_xp: number;
  earned_count: number;
  total_count: number;
  recently_earned: Achievement[];
  all: Achievement[];
}

export async function getMyAchievements(): Promise<AchievementsResponse> {
  const { data } = await apiClient.get<AchievementsResponse>('/achievements/me');
  return data;
}

export async function getUserAchievements(userId: string): Promise<AchievementsResponse> {
  const { data } = await apiClient.get<AchievementsResponse>(`/achievements/user/${userId}`);
  return data;
}
