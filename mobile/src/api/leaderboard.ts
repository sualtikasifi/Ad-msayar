import { apiClient } from './client';
import type { LeaderboardEntry, ParticipantRanking } from '../types';

export async function getDailyLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get('/leaderboard/friends/daily');
  return data;
}

export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get('/leaderboard/friends/weekly');
  return data;
}

export async function getChallengeLeaderboard(challengeId: string): Promise<ParticipantRanking[]> {
  const { data } = await apiClient.get(`/leaderboard/challenge/${challengeId}`);
  return data;
}
