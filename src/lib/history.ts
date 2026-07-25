import rawHistory from '../../data/history.json';
import { buildSparkline } from './sparkline';

export type HistorySnapshot = {
  date: string;
  stars: number;
  forks: number;
  pushedAt: string;
};

export type HistoryMap = Record<string, HistorySnapshot[]>;

export const starHistory = rawHistory as HistoryMap;

export function getStarSeries(fullName: string, source: HistoryMap = starHistory) {
  const snapshots = source[fullName];

  if (!snapshots) {
    return [];
  }

  return snapshots.map((snapshot) => snapshot.stars);
}

export function getStarSparkline(fullName: string, limit = 30, source: HistoryMap = starHistory) {
  return buildSparkline(getStarSeries(fullName, source), limit);
}
