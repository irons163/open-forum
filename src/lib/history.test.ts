import { describe, expect, it } from 'vitest';
import type { HistoryMap } from './history';
import { getStarSeries, getStarSparkline, starHistory } from './history';

const sampleHistory: HistoryMap = {
  'acme/rocket': [
    { date: '2026-01-01', stars: 100, forks: 10, pushedAt: '2026-01-01T00:00:00Z' },
    { date: '2026-01-02', stars: 120, forks: 11, pushedAt: '2026-01-02T00:00:00Z' },
    { date: '2026-01-03', stars: 150, forks: 12, pushedAt: '2026-01-03T00:00:00Z' },
  ],
};

describe('star history', () => {
  it('ships the generated snapshot map', () => {
    expect(Object.keys(starHistory).length).toBeGreaterThan(0);
  });

  it('extracts the star series for a tracked repo', () => {
    expect(getStarSeries('acme/rocket', sampleHistory)).toEqual([100, 120, 150]);
  });

  it('returns an empty series for untracked repos', () => {
    expect(getStarSeries('acme/missing', sampleHistory)).toEqual([]);
    expect(getStarSeries('definitely/not-tracked')).toEqual([]);
  });

  it('builds a sparkline from the tracked series', () => {
    const shape = getStarSparkline('acme/rocket', 3, sampleHistory);

    expect(shape?.direction).toBe('up');
    expect(shape?.points).toHaveLength(3);
  });

  it('returns null when a repo has no usable history', () => {
    expect(getStarSparkline('acme/missing', 30, sampleHistory)).toBeNull();
    expect(getStarSparkline('definitely/not-tracked')).toBeNull();
  });
});
