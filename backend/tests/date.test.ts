import { todayInAppTimezone } from '../src/utils/date';

describe('todayInAppTimezone', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('matches the UTC calendar date at UTC noon (still the same day in UTC+3)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    expect(todayInAppTimezone()).toBe('2026-03-15');
  });

  it('rolls over to the next day for UTC 21:00-23:59 (already tomorrow in UTC+3)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T21:00:00.000Z'));
    expect(todayInAppTimezone()).toBe('2026-03-16');

    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T23:59:59.000Z'));
    expect(todayInAppTimezone()).toBe('2026-03-16');
  });

  it('does not roll over just before 21:00 UTC (still the same day in UTC+3)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T20:59:59.000Z'));
    expect(todayInAppTimezone()).toBe('2026-03-15');
  });

  it('correctly carries year/month boundaries (New Year\'s Eve 23:00 UTC -> Jan 1 in UTC+3)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-12-31T23:00:00.000Z'));
    expect(todayInAppTimezone()).toBe('2026-01-01');
  });

  it('correctly carries month boundaries (e.g. Jan 31 -> Feb 1)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-31T21:30:00.000Z'));
    expect(todayInAppTimezone()).toBe('2026-02-01');
  });
});
