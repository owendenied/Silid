export interface LevelInfo {
  title: string;
  minXp: number;
  maxXp: number;
  nextTitle: string | null;
}

export const LEVELS: LevelInfo[] = [
  { title: 'Mag-aaral', minXp: 0, maxXp: 100, nextTitle: 'Iskolar' },
  { title: 'Iskolar', minXp: 100, maxXp: 300, nextTitle: 'Henyo' },
  { title: 'Henyo', minXp: 300, maxXp: 500, nextTitle: 'Kampeon' },
  { title: 'Kampeon', minXp: 500, maxXp: 1000000, nextTitle: null },
];

export const getLevelInfo = (xp: number): LevelInfo => {
  return LEVELS.find(l => xp >= l.minXp && xp < l.maxXp) || LEVELS[0];
};

export const calculateProgress = (xp: number): number => {
  const level = getLevelInfo(xp);
  if (!level.nextTitle) return 100;
  const range = level.maxXp - level.minXp;
  const earned = xp - level.minXp;
  return Math.min(Math.floor((earned / range) * 100), 100);
};
