export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Local-calendar-day version of formatDate. `toISOString()` converts to UTC
// first, which is wrong for "today" — between 00:00-03:00 Turkey time it
// still reports yesterday's date, desyncing from the backend (which buckets
// "today" in fixed UTC+3) and from locally-cached step data.
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return formatLocalDate(new Date());
}

export function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return formatLocalDate(d);
}

export function daysLeft(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatTurkishDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
