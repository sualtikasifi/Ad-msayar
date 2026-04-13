import { apiClient } from './client';
import type { AuthTokens, PublicUser } from '../types';

export async function register(username: string, email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/register', { username, email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', { email, password });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function guestLogin(): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/guest');
  return data;
}

export async function claimAccount(
  username: string,
  email: string,
  password: string
): Promise<{ user: PublicUser }> {
  const { data } = await apiClient.post<{ user: PublicUser }>('/auth/claim', { username, email, password });
  return data;
}
