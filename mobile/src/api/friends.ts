import { apiClient } from './client';
import type { FriendWithSteps, FriendRequest, Friendship } from '../types';

export async function getFriends(): Promise<FriendWithSteps[]> {
  const { data } = await apiClient.get('/friends');
  return data;
}

export async function getPendingRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get('/friends/requests');
  return data;
}

export async function getSentRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get('/friends/sent');
  return data;
}

export async function sendFriendRequest(addresseeId: string): Promise<Friendship> {
  const { data } = await apiClient.post('/friends/request', { addressee_id: addresseeId });
  return data;
}

export async function acceptRequest(friendshipId: string): Promise<Friendship> {
  const { data } = await apiClient.put(`/friends/request/${friendshipId}/accept`);
  return data;
}

export async function declineRequest(friendshipId: string): Promise<void> {
  await apiClient.put(`/friends/request/${friendshipId}/decline`);
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await apiClient.delete(`/friends/${friendshipId}`);
}

export async function searchUsers(query: string): Promise<{ id: string; username: string; avatar_id: number }[]> {
  const { data } = await apiClient.get('/users/search', { params: { q: query } });
  return data;
}
