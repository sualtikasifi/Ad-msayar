import { apiClient } from './client';
import type { DailySteps } from '../types';

export async function syncSteps(stepDate: string, stepCount: number): Promise<DailySteps> {
  const { data } = await apiClient.post<DailySteps>('/steps/sync', { step_date: stepDate, step_count: stepCount });
  return data;
}

export async function getTodaySteps(): Promise<{ step_count: number; date: string }> {
  const { data } = await apiClient.get('/steps/me/today');
  return data;
}

export async function getStepsRange(from: string, to: string): Promise<DailySteps[]> {
  const { data } = await apiClient.get('/steps/me', { params: { from, to } });
  return data;
}
