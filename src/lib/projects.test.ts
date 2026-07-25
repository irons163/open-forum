import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeProjects,
  breakoutProjects,
  buildCategorySummaries,
  buildEditorialFeaturedProjects,
  buildTrendState,
  categories,
  categorySummaries,
  discoveryProjects,
  discoveryScore,
  editorialFeaturedProjects,
  editorialWatchlist,
  featuredProjects,
  formatCompactNumber,
  formatDate,
  formatDelta,
  formatMomentum,
  formatPercentage,
  getBriefFreshness,
  getBreakoutProjects,
  getDiscoveryProjects,
  getLastSyncedAt,
  getRecentlyUpdatedProjects,
  getScaleLeaderProjects,
  getTrendingProjects,
  lastSyncedAt,
  projects,
  recentlyUpdatedProjects,
  relativeDays,
  scaleLeaderProjects,
  sortByTrendScore,
  totalStars,
  trendingProjects,
  weeklyBrief,
} from './projects';
import type { Project } from './projects';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: 'owner-repo',
    name: 'repo',
    owner: 'owner',
    fullName: 'owner/repo',
    repoUrl: 'https://github.com/owner/repo',
    homepage: null,
    description: 'Project description',
    category: '工具',
    highlight: 'Useful project',
    topics: [],
    language: 'TypeScript',
    license: 'MIT',
    stars: 100,
    forks: 10,
    openIssues: 1,
    watchers: 2,
    historyDays: 10,
    delta1d: 0,
    delta7d: 0,
    delta30d: 0,
    growthRate7d: 0,
    starVelocity7d: 0,
    trendScore: 1000,
    lastPushedAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
    syncedAt: '2026-05-16T00:00:00Z',
    avatarUrl: 'https://example.com/avatar.png',
    ...overrides,
  };
}

describe('project data exports', () => {
  it('sorts and slices the curated project collections predictably', () => {
    expect(projects.length).toBeGreaterThan(0);
    expect(projects).toEqual([...projects].sort((a, b) => b.trendScore - a.trendScore));
    expect(featuredProjects).toEqual(projects.slice(0, 6));
    expect(trendingProjects).toHaveLength(Math.min(6, projects.length));
    expect(breakoutProjects).toHaveLength(Math.min(6, projects.length));
    expect(scaleLeaderProjects).toHaveLength(Math.min(6, projects.length));
    expect(discoveryProjects).toHaveLength(Math.min(6, projects.length));
    expect(recentlyUpdatedProjects).toHaveLength(Math.min(5, projects.length));
  });

  it('builds category and editorial summaries from generated data', () => {
    expect(categories).toEqual(Array.from(new Set(projects.map((project) => project.category))));
    expect(categorySummaries.map((summary) => summary.name)).toEqual(categories);
    expect(totalStars).toBe(projects.reduce((sum, project) => sum + project.stars, 0));
    expect(activeProjects).toBeGreaterThanOrEqual(0);
    expect(lastSyncedAt).toBe(projects[0]?.syncedAt);
    expect(editorialFeaturedProjects.every((entry) => entry.project.fullName === entry.repo)).toBe(true);
    expect(editorialWatchlist.length).toBeGreaterThan(0);
    expect(weeklyBrief.signals.length).toBeGreaterThan(0);
  });
});

describe('collection helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts projects by trend score', () => {
    const first = makeProject({ fullName: 'owner/first', trendScore: 1 });
    const second = makeProject({ fullName: 'owner/second', trendScore: 2 });

    expect(sortByTrendScore([first, second]).map((project) => project.fullName)).toEqual(['owner/second', 'owner/first']);
  });

  it('uses trend score as the tie-breaker for trending projects', () => {
    const lower = makeProject({ fullName: 'owner/lower', delta7d: 10, trendScore: 1 });
    const higher = makeProject({ fullName: 'owner/higher', delta7d: 10, trendScore: 2 });

    expect(getTrendingProjects([lower, higher]).map((project) => project.fullName)).toEqual(['owner/higher', 'owner/lower']);
  });

  it('uses delta and trend score as tie-breakers for breakout projects', () => {
    const trendWinner = makeProject({ fullName: 'owner/trend', growthRate7d: 2, delta7d: 5, trendScore: 3 });
    const trendLoser = makeProject({ fullName: 'owner/trend-loser', growthRate7d: 2, delta7d: 5, trendScore: 2 });
    const deltaWinner = makeProject({ fullName: 'owner/delta', growthRate7d: 2, delta7d: 6, trendScore: 1 });
    const growthWinner = makeProject({ fullName: 'owner/growth', growthRate7d: 3, delta7d: 0, trendScore: 1 });

    expect(getBreakoutProjects([trendLoser, trendWinner, deltaWinner, growthWinner]).map((project) => project.fullName)).toEqual([
      'owner/growth',
      'owner/delta',
      'owner/trend',
      'owner/trend-loser',
    ]);
  });

  it('uses trend score as the tie-breaker for scale leaders', () => {
    const lower = makeProject({ fullName: 'owner/lower', stars: 100, trendScore: 1 });
    const higher = makeProject({ fullName: 'owner/higher', stars: 100, trendScore: 2 });

    expect(getScaleLeaderProjects([lower, higher]).map((project) => project.fullName)).toEqual(['owner/higher', 'owner/lower']);
  });

  it('uses trend score as the tie-breaker for discovery projects', () => {
    const lower = makeProject({
      fullName: 'owner/lower',
      stars: 400,
      trendScore: 100,
      lastPushedAt: '2026-05-15T00:00:00Z',
    });
    const higher = makeProject({
      fullName: 'owner/higher',
      stars: 1600,
      trendScore: 200,
      lastPushedAt: '2026-05-15T00:00:00Z',
    });

    expect(getDiscoveryProjects([lower, higher]).map((project) => project.fullName)).toEqual(['owner/higher', 'owner/lower']);
  });

  it('sorts recently updated projects and honors custom limits', () => {
    const older = makeProject({ fullName: 'owner/older', lastPushedAt: '2026-05-01T00:00:00Z' });
    const newer = makeProject({ fullName: 'owner/newer', lastPushedAt: '2026-05-15T00:00:00Z' });

    expect(getRecentlyUpdatedProjects([older, newer], 1).map((project) => project.fullName)).toEqual(['owner/newer']);
  });

  it('returns a fallback sync date when no projects exist', () => {
    expect(getLastSyncedAt([], 'fallback-date')).toBe('fallback-date');
  });

  it('keeps empty categories represented in summaries', () => {
    const summary = buildCategorySummaries([makeProject({ category: '工具' })], ['工具', 'AI']);

    expect(summary[0].leadProject?.category).toBe('工具');
    expect(summary[1]).toMatchObject({ name: 'AI', count: 0, stars: 0, activeCount: 0, leadProject: null });
  });

  it('drops editorial entries when their repo is not tracked', () => {
    const entry = {
      repo: 'missing/repo',
      kicker: '本週編輯推薦',
      angle: 'Missing',
      summary: 'Missing summary',
      whyNow: 'Missing reason',
    };

    expect(buildEditorialFeaturedProjects([entry], [makeProject()])).toEqual([]);
  });
});

describe('formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats compact numbers across size boundaries', () => {
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(1_250)).toBe('1.3k');
    expect(formatCompactNumber(1_250_000)).toBe('1.3M');
  });

  it('formats dates using the zh-TW locale', () => {
    expect(formatDate('2026-05-16T00:00:00Z')).toContain('2026');
  });

  it('formats relative update age', () => {
    expect(relativeDays('2026-05-16T00:00:00Z')).toBe('今天有更新');
    expect(relativeDays('2026-05-15T00:00:00Z')).toBe('1 天前更新');
    expect(relativeDays('2026-05-13T00:00:00Z')).toBe('3 天前更新');
  });

  it('formats momentum with the strongest available signal', () => {
    expect(formatMomentum(makeProject({ historyDays: 2 }))).toBe('剛開始追蹤');
    expect(formatMomentum(makeProject({ delta7d: 123 }))).toBe('7d +123');
    expect(formatMomentum(makeProject({ delta1d: 12 }))).toBe('1d +12');
    expect(formatMomentum(makeProject({ delta30d: 1234 }))).toBe('30d +1.2k');
    expect(formatMomentum(makeProject())).toBe('暫時持平');
  });

  it('formats percentages with one decimal place', () => {
    expect(formatPercentage(12)).toBe('12.0%');
    expect(formatPercentage(12.345)).toBe('12.3%');
  });

  it('formats deltas with an explicit sign', () => {
    expect(formatDelta(1234)).toBe('+1.2k');
    expect(formatDelta(0)).toBe('0');
    expect(formatDelta(-42)).toBe('-42');
    expect(formatDelta(-2500)).toBe('-2.5k');
  });

  it('treats a recent weekly brief as current', () => {
    expect(getBriefFreshness('2026 / 05 / 10')).toEqual({ ageDays: 6, isCurrent: true });
  });

  it('reports the age of a stale weekly brief', () => {
    expect(getBriefFreshness('2026 / 03 / 01')).toEqual({ ageDays: 76, isCurrent: false });
  });

  it('never reports a negative age for a future weekly brief', () => {
    expect(getBriefFreshness('2026 / 06 / 01')).toEqual({ ageDays: 0, isCurrent: true });
  });

  it('degrades gracefully when the weekly brief label is unparseable', () => {
    expect(getBriefFreshness('not a date')).toEqual({ ageDays: null, isCurrent: false });
  });
});

describe('trend state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks projects with too little history as tracking', () => {
    expect(buildTrendState(makeProject({ historyDays: 1 })).tone).toBe('tracking');
  });

  it('marks high absolute or relative growth as surging', () => {
    expect(buildTrendState(makeProject({ delta7d: 250 })).tone).toBe('surging');
    expect(buildTrendState(makeProject({ growthRate7d: 4 })).tone).toBe('surging');
  });

  it('marks moderate growth as rising', () => {
    expect(buildTrendState(makeProject({ delta7d: 50 })).tone).toBe('rising');
    expect(buildTrendState(makeProject({ delta1d: 10 })).tone).toBe('rising');
    expect(buildTrendState(makeProject({ growthRate7d: 1.2 })).tone).toBe('rising');
  });

  it('marks active monthly growth as steady', () => {
    expect(buildTrendState(makeProject({ delta30d: 1, lastPushedAt: '2026-05-10T00:00:00Z' })).tone).toBe('steady');
  });

  it('marks inactive projects as cooling', () => {
    expect(buildTrendState(makeProject({ lastPushedAt: '2026-04-01T00:00:00Z' })).tone).toBe('cooling');
  });

  it('keeps active projects without growth under observation', () => {
    expect(buildTrendState(makeProject({ lastPushedAt: '2026-05-14T00:00:00Z' })).label).toBe('持續觀察');
  });

  it('scores discovery candidates with freshness and size adjustment', () => {
    expect(discoveryScore(makeProject({ stars: 100, trendScore: 1000, lastPushedAt: '2026-05-15T00:00:00Z' }))).toBe(130);
  });
});
