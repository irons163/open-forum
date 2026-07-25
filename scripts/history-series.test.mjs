import { describe, expect, it } from 'vitest';
import { takePreviousEntries } from './history-series.mjs';

const entry = (date, stars) => ({ date, stars, forks: 1, pushedAt: `${date}T00:00:00Z` });

describe('takePreviousEntries', () => {
  it('returns existing entries when the seed name is already canonical', () => {
    const history = { 'astral-sh/uv': [entry('2026-07-01', 10)] };

    expect(takePreviousEntries(history, 'astral-sh/uv', 'astral-sh/uv')).toEqual([
      entry('2026-07-01', 10),
    ]);
    expect(Object.keys(history)).toEqual(['astral-sh/uv']);
  });

  it('carries history over from a stale seed name after a rename', () => {
    const history = { 'facebook/react': [entry('2026-07-01', 10), entry('2026-07-02', 12)] };

    expect(takePreviousEntries(history, 'facebook/react', 'react/react')).toEqual([
      entry('2026-07-01', 10),
      entry('2026-07-02', 12),
    ]);
    expect(history['facebook/react']).toBeUndefined();
  });

  it('prefers canonical entries and discards the stale key when both exist', () => {
    const history = {
      'facebook/react': [entry('2026-07-01', 10)],
      'react/react': [entry('2026-07-02', 12)],
    };

    expect(takePreviousEntries(history, 'facebook/react', 'react/react')).toEqual([
      entry('2026-07-02', 12),
    ]);
    expect(history['facebook/react']).toBeUndefined();
  });

  it('returns an empty series for a newly tracked repository', () => {
    expect(takePreviousEntries({}, 'new/repo', 'new/repo')).toEqual([]);
  });

  it('ignores malformed history values', () => {
    expect(takePreviousEntries({ 'bad/repo': 'not-an-array' }, 'bad/repo', 'bad/repo')).toEqual([]);
  });
});
