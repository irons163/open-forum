import { describe, expect, it } from 'vitest';
import {
  buildHealthSummary,
  collectStaleProjects,
  findPreviousProject,
  staleDays,
  staleThresholdDays,
} from './sync-health.mjs';

describe('staleDays', () => {
  it('returns zero when there is no previous successful fetch', () => {
    expect(staleDays(undefined, '2026-07-25T00:00:00Z')).toBe(0);
  });

  it('counts whole days between the successful fetch and now', () => {
    expect(staleDays('2026-07-20T12:00:00Z', '2026-07-25T00:00:00Z')).toBe(4);
  });

  it('never reports a negative age', () => {
    expect(staleDays('2026-07-26T00:00:00Z', '2026-07-25T00:00:00Z')).toBe(0);
  });
});

describe('findPreviousProject', () => {
  const projects = [
    { fullName: 'facebook/react', stars: 1 },
    { fullName: 'Comfy-Org/ComfyUI', stars: 2 },
  ];

  it('matches case-insensitively so a rename that only changed case still finds the row', () => {
    expect(findPreviousProject(projects, 'FACEBOOK/react')).toEqual(projects[0]);
  });

  it('returns null when the seed has never been synced', () => {
    expect(findPreviousProject(projects, 'new/repo')).toBeNull();
  });
});

describe('collectStaleProjects', () => {
  it('keeps only projects at or past the threshold', () => {
    const now = '2026-07-25T00:00:00Z';
    const projects = [
      { fullName: 'fresh/repo', fetchedAt: '2026-07-24T00:00:00Z' },
      { fullName: 'stale/repo', fetchedAt: '2026-07-22T00:00:00Z' },
      { fullName: 'ancient/repo', fetchedAt: '2026-07-01T00:00:00Z' },
    ];

    expect(collectStaleProjects(projects, now).map((project) => project.fullName)).toEqual([
      'stale/repo',
      'ancient/repo',
    ]);
    expect(staleThresholdDays).toBe(2);
  });
});

describe('buildHealthSummary', () => {
  it('reports a clean run in one sentence', () => {
    expect(buildHealthSummary({ failures: [], archived: [], stale: [] })).toContain(
      '所有追蹤中的 repo 都成功更新。',
    );
  });

  it('lists failures, archived repos and stale snapshots', () => {
    const summary = buildHealthSummary({
      failures: [
        {
          repo: 'gone/repo',
          reason: 'gone/repo -> 404 {"message":"Not Found"}',
          keptStaleData: true,
        },
        {
          repo: 'brand/new',
          reason: 'brand/new -> 403 | private',
          keptStaleData: false,
        },
      ],
      archived: [{ fullName: 'old/project' }],
      stale: [{ fullName: 'gone/repo', fetchedAt: '2026-07-20T00:00:00Z' }],
    });

    expect(summary).toContain('| `gone/repo` | 沿用舊資料 |');
    expect(summary).toContain('| `brand/new` | 未收錄 |');
    expect(summary).toContain('\\| private');
    expect(summary).toContain('- `old/project`');
    expect(summary).toContain('超過 2 天沒有成功更新');
    expect(summary).toContain('最後成功：2026-07-20T00:00:00Z');
  });
});
