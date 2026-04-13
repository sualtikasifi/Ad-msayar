import { apiClient } from './client';

export interface DailyPoint {
  date: string;
  steps: number;
}

export interface WeeklyPoint {
  week_start: string;
  total_steps: number;
  avg_daily: number;
  active_days: number;
}

export interface PersonalRecords {
  best_day_steps: number;
  best_day_date: string | null;
  current_streak: number;
  longest_streak: number;
  total_steps_all_time: number;
  active_days_total: number;
  avg_daily_steps_30d: number;
}

export interface HeatmapPoint {
  date: string;
  steps: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export async function getWeeklyStats():  Promise<DailyPoint[]>  { return (await apiClient.get('/stats/weekly')).data; }
export async function getMonthlyStats(): Promise<DailyPoint[]>  { return (await apiClient.get('/stats/monthly')).data; }
export async function get12WeeksStats(): Promise<WeeklyPoint[]> { return (await apiClient.get('/stats/12weeks')).data; }
export async function getPersonalRecords(): Promise<PersonalRecords> { return (await apiClient.get('/stats/records')).data; }
export async function getHeatmap(year: number, month: number): Promise<HeatmapPoint[]> {
  return (await apiClient.get('/stats/heatmap', { params: { year, month } })).data;
}
