import { describe, expect, it } from 'vitest';
import {
  buildDiscoverySummary,
  buildRecommendIssueUrl,
  buildSearchQueries,
  daysBetween,
  estimateVelocity,
  guessCategory,
  isEligibleCandidate,
  isoDate,
  mergeCandidates,
  normalizeSearchItem,
  rankCandidates,
  shiftDays,
  trackedRepoSet,
} from './discover-lib.mjs';

function searchItem(overrides = {}) {
  return {
    full_name: 'acme/rocket',
    name: 'rocket',
    owner: { login: 'acme' },
    html_url: 'https://github.com/acme/rocket',
    description: 'A fast CLI for developers',
    language: 'Rust',
    license: { spdx_id: 'MIT' },
    topics: ['cli', 'developer-tools'],
    stargazers_count: 1200,
    forks_count: 40,
    open_issues_count: 12,
    created_at: '2026-07-01T00:00:00Z',
    pushed_at: '2026-07-20T00:00:00Z',
    archived: false,
    fork: false,
    ...overrides,
  };
}

describe('date helpers', () => {
  it('formats and shifts UTC dates', () => {
    expect(isoDate(new Date('2026-07-25T15:00:00Z'))).toBe('2026-07-25');
    expect(isoDate(shiftDays(new Date('2026-07-25T00:00:00Z'), -7))).toBe('2026-07-18');
  });

  it('counts whole days between two ISO dates', () => {
    expect(daysBetween('2026-07-01', '2026-07-25')).toBe(24);
    expect(daysBetween('not-a-date', '2026-07-25')).toBe(0);
  });
});

describe('buildSearchQueries', () => {
  it('builds complementary searches anchored to the given day', () => {
    const queries = buildSearchQueries(new Date('2026-07-25T00:00:00Z'));

    expect(queries).toHaveLength(6);
    expect(queries[0].query).toContain('created:>2026-07-18');
    expect(queries[1].query).toContain('created:2026-06-25..2026-07-18');
    expect(queries.every((entry) => entry.asOf === '2026-07-25')).toBe(true);
  });
});

describe('guessCategory', () => {
  it('maps AI topics ahead of language defaults', () => {
    expect(
      guessCategory({
        topics: ['llm', 'agents'],
        language: 'TypeScript',
        description: 'agent framework',
      }),
    ).toBe('AI');
  });

  it('falls back to 工具 when nothing matches', () => {
    expect(guessCategory({ topics: [], language: null, description: '' })).toBe('工具');
  });

  it('uses language hints for frontend and backend', () => {
    expect(guessCategory({ language: 'Vue', topics: [] })).toBe('前端');
    expect(guessCategory({ language: 'Go', topics: ['api'] })).toBe('後端');
  });

  it('does not treat short keywords as substrings of ordinary words', () => {
    expect(
      guessCategory({
        topics: [],
        language: null,
        description: 'An application for machine operators',
      }),
    ).toBe('工具');
  });

  it('prefers explicit topics over description prose', () => {
    expect(
      guessCategory({
        topics: ['llm'],
        language: 'Rust',
        description: 'A fast CLI for developers',
      }),
    ).toBe('AI');
  });
});

describe('candidate normalization and ranking', () => {
  it('estimates stars per day from age', () => {
    expect(estimateVelocity(240, '2026-07-01T00:00:00Z', '2026-07-25')).toBe(10);
  });

  it('normalizes a search hit into a reviewable candidate', () => {
    const candidate = normalizeSearchItem(searchItem(), {
      source: 'newcomer-month',
      asOf: '2026-07-25',
    });

    expect(candidate.fullName).toBe('acme/rocket');
    expect(candidate.category).toBe('工具');
    expect(candidate.ageDays).toBe(24);
    expect(candidate.starsPerDay).toBe(50);
    expect(candidate.source).toBe('newcomer-month');
  });

  it('drops tracked, archived, forked and tiny repos', () => {
    const tracked = trackedRepoSet([{ repo: 'Already/Tracked' }]);

    expect(isEligibleCandidate(normalizeSearchItem(searchItem(), { source: 'x', asOf: '2026-07-25' }), tracked)).toBe(
      true,
    );
    expect(
      isEligibleCandidate(
        normalizeSearchItem(searchItem({ full_name: 'already/tracked' }), { source: 'x', asOf: '2026-07-25' }),
        tracked,
      ),
    ).toBe(false);
    expect(
      isEligibleCandidate(
        normalizeSearchItem(searchItem({ archived: true }), { source: 'x', asOf: '2026-07-25' }),
        tracked,
      ),
    ).toBe(false);
    expect(
      isEligibleCandidate(
        normalizeSearchItem(searchItem({ fork: true }), { source: 'x', asOf: '2026-07-25' }),
        tracked,
      ),
    ).toBe(false);
    expect(
      isEligibleCandidate(
        normalizeSearchItem(searchItem({ stargazers_count: 20 }), { source: 'x', asOf: '2026-07-25' }),
        tracked,
      ),
    ).toBe(false);
    expect(isEligibleCandidate(null, tracked)).toBe(false);
  });

  it('ranks by estimated daily velocity first', () => {
    const ranked = rankCandidates(
      [
        { fullName: 'slow/big', starsPerDay: 2, stars: 50000, ageDays: 1000 },
        { fullName: 'fast/new', starsPerDay: 40, stars: 800, ageDays: 20 },
      ],
      1,
    );

    expect(ranked.map((item) => item.fullName)).toEqual(['fast/new']);
  });

  it('merges batches, dedupes by full name and skips tracked seeds', () => {
    const tracked = trackedRepoSet([{ repo: 'keep/out' }]);
    const candidates = mergeCandidates(
      [
        {
          id: 'newcomer-week',
          items: [
            searchItem({ full_name: 'keep/out', stargazers_count: 900 }),
            searchItem({
              full_name: 'rise/fast',
              stargazers_count: 700,
              created_at: '2026-07-18T00:00:00Z',
              topics: ['llm'],
            }),
          ],
        },
        {
          id: 'topic-ai',
          items: [
            searchItem({
              full_name: 'rise/fast',
              stargazers_count: 720,
              created_at: '2026-07-18T00:00:00Z',
              topics: ['llm'],
            }),
          ],
        },
      ],
      tracked,
      { asOf: '2026-07-25', limit: 5 },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].fullName).toBe('rise/fast');
    expect(candidates[0].sources).toEqual(['newcomer-week', 'topic-ai']);
    expect(candidates[0].category).toBe('AI');
  });
});

describe('issue helpers and summary', () => {
  it('builds a prefilled recommend issue URL including form field ids', () => {
    const url = buildRecommendIssueUrl('https://github.com/irons163/open-forum', {
      fullName: 'acme/rocket',
      repoUrl: 'https://github.com/acme/rocket',
      category: '工具',
      description: 'A fast CLI',
    });

    expect(url.startsWith('https://github.com/irons163/open-forum/issues/new?')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('template')).toBe('recommend-project.yml');
    expect(params.get('title')).toBe('[Recommend] acme/rocket');
    expect(params.get('repo')).toBe('https://github.com/acme/rocket');
    expect(params.get('category')).toBe('工具');
    expect(params.get('reason_type')).toBe('近期熱度上升');
    expect(params.get('reason')).toBe('A fast CLI');
    expect(buildRecommendIssueUrl('', { fullName: 'acme/rocket' })).toBe('');
  });

  it('renders a markdown summary for Actions', () => {
    const summary = buildDiscoverySummary({
      trackedCount: 32,
      queries: [{ id: 'a' }, { id: 'b' }],
      candidates: [
        {
          fullName: 'rise/fast',
          repoUrl: 'https://github.com/rise/fast',
          category: 'AI',
          stars: 720,
          starsPerDay: 90,
          ageDays: 8,
          sources: ['newcomer-week'],
        },
      ],
    });

    expect(summary).toContain('留下 1 個候選');
    expect(summary).toContain('`rise/fast`');
    expect(buildDiscoverySummary({ trackedCount: 32, queries: [], candidates: [] })).toContain(
      '這輪沒有符合條件',
    );
  });
});
