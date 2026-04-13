import { apiClient } from './client';
import type { Challenge, ChallengeDetail, ChallengeType } from '../types';

export async function createChallenge(params: {
  type: ChallengeType;
  title?: string;
  start_date: string;
  end_date: string;
  participant_ids: string[];
}): Promise<Challenge> {
  const { data } = await apiClient.post('/challenges', params);
  return data;
}

export async function getMyChallenges(): Promise<Challenge[]> {
  const { data } = await apiClient.get('/challenges');
  return data;
}

export async function getChallengeDetail(challengeId: string): Promise<ChallengeDetail> {
  const { data } = await apiClient.get(`/challenges/${challengeId}`);
  return data;
}

export async function acceptChallenge(challengeId: string): Promise<void> {
  await apiClient.put(`/challenges/${challengeId}/accept`);
}

export async function declineChallenge(challengeId: string): Promise<void> {
  await apiClient.put(`/challenges/${challengeId}/decline`);
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  await apiClient.put(`/challenges/${challengeId}/cancel`);
}
