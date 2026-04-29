export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  color: string;
  minXp: number;
  nextLevelXp: number | null; // null = max level
  xpIntoLevel: number;
  xpNeededForNext: number | null;
  progress: number; // 0–1
}

const LEVELS = [
  { level: 1,  title: 'Acemi',      emoji: '🌱', color: '#9CA3AF', minXp: 0     },
  { level: 2,  title: 'Çaylak',     emoji: '🚶', color: '#6B7280', minXp: 150   },
  { level: 3,  title: 'Yürüyüşçü', emoji: '🏃', color: '#3B82F6', minXp: 400   },
  { level: 4,  title: 'Koşucu',    emoji: '⚡',  color: '#8B5CF6', minXp: 750   },
  { level: 5,  title: 'Sporcu',    emoji: '💪',  color: '#6C63FF', minXp: 1200  },
  { level: 6,  title: 'Atlet',     emoji: '🏅',  color: '#10B981', minXp: 2000  },
  { level: 7,  title: 'Şampiyon',  emoji: '🏆',  color: '#F59E0B', minXp: 3000  },
  { level: 8,  title: 'Efsane',    emoji: '👑',  color: '#EF4444', minXp: 4500  },
  { level: 9,  title: 'Titan',     emoji: '⚔️',  color: '#EC4899', minXp: 7000  },
  { level: 10, title: 'Tanrı',     emoji: '🌟',  color: '#F97316', minXp: 10000 },
] as const;

export function getLevelInfo(xp: number): LevelInfo {
  let current: typeof LEVELS[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }

  const idx = LEVELS.indexOf(current as (typeof LEVELS)[number]);
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  const xpIntoLevel = xp - current.minXp;
  const xpNeededForNext = next ? next.minXp - current.minXp : null;
  const progress = xpNeededForNext ? Math.min(xpIntoLevel / xpNeededForNext, 1) : 1;

  return {
    level: current.level,
    title: current.title,
    emoji: current.emoji,
    color: current.color,
    minXp: current.minXp,
    nextLevelXp: next ? next.minXp : null,
    xpIntoLevel,
    xpNeededForNext,
    progress,
  };
}

export function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K XP`;
  return `${xp} XP`;
}
