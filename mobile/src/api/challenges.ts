import { apiClient } from './client';
import type { Challenge, ChallengeDetail, ChallengeType, ChallengeMode } from '../types';

export async function createChallenge(params: {
  type: ChallengeType;
  mode?: ChallengeMode;
  title?: string;
  start_date: string;
  end_date?: string;
  step_goal?: number;
  penalty_text?: string;
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

export interface InviteInfo {
  challengeId: string;
  title: string | null;
  type: '1v1' | 'group';
  status: string;
  start_date: string;
  end_date: string;
  creatorUsername: string;
  participantCount: number;
  maxParticipants: number;
  token: string;
  expiresAt: string;
}

export async function createInviteLink(challengeId: string): Promise<{ token: string; expiresAt: string }> {
  const { data } = await apiClient.post(`/challenges/${challengeId}/invite-link`);
  return data;
}

export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const { data } = await apiClient.get(`/challenges/invite/${token}`);
  return data;
}

export async function joinByInviteToken(token: string): Promise<{ challengeId: string; alreadyMember: boolean }> {
  const { data } = await apiClient.post(`/challenges/invite/${token}/join`);
  return data;
}

export async function claimPenalty(challengeId: string): Promise<void> {
  await apiClient.put(`/challenges/${challengeId}/claim-penalty`);
}
