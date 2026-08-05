import { apiClient } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_id: number;
  daily_step_goal?: number;
  created_at: string;
  updated_at: string;
}

export async function getMe(): Promise<UserProfile> {
  return (await apiClient.get('/users/me')).data;
}

export async function updateProfile(data: { username?: string; avatar_id?: number; daily_step_goal?: number }): Promise<UserProfile> {
  return (await apiClient.put('/users/me', data)).data;
}

export async function updateStepGoal(goal: number): Promise<UserProfile> {
  return (await apiClient.put('/users/me', { daily_step_goal: goal })).data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await apiClient.put('/users/me/password', { current_password, new_password });
}
