import { describe, expect, it } from 'vitest';
import type { Project } from './projects';
import {
  buildBreadcrumbSchema,
  buildProjectSchema,
  buildRankingSchema,
  buildWebSiteSchema,
  serializeJsonLd,
} from './structured-data';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: 'astral-sh-uv',
    name: 'uv',
    owner: 'astral-sh',
    fullName: 'astral-sh/uv',
    repoUrl: 'https://github.com/astral-sh/uv',
    homepage: null,
    description: 'An extremely fast Python package manager',
    category: '工具',
    highlight: 'Python 工具鏈的新標準。',
    topics: ['python', 'packaging'],
    language: 'Rust',
    license: 'MIT',
    stars: 42000,
    forks: 1200,
    openIssues: 300,
    watchers: 150,
    historyDays: 45,
    delta1d: 20,
    delta7d: 180,
    delta30d: 900,
    growthRate7d: 0.43,
    starVelocity7d: 25.7,
    trendScore: 12345,
    lastPushedAt: '2026-07-24T00:00:00Z',
    updatedAt: '2026-07-24T00:00:00Z',
    syncedAt: '2026-07-25T00:00:00Z',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    ...overrides,
  };
}

describe('serializeJsonLd', () => {
  it('produces parseable JSON', () => {
    expect(JSON.parse(serializeJsonLd({ a: 1 }))).toEqual({ a: 1 });
  });

  it('escapes angle brackets so a description cannot close the script tag', () => {
    const output = serializeJsonLd({ description: '</script><img onerror=alert(1)>' });

    expect(output).not.toContain('</script>');
    expect(JSON.parse(output).description).toBe('</script><img onerror=alert(1)>');
  });
});

describe('buildWebSiteSchema', () => {
  it('exposes a search action pointing at the homepage query parameter', () => {
    const schema = buildWebSiteSchema('https://example.com/open-forum/', 'Open Forum', '雷達站');

    expect(schema['@type']).toBe('WebSite');
    expect(schema.url).toBe('https://example.com/open-forum/');
    expect(schema.potentialAction.target.urlTemplate).toBe(
      'https://example.com/open-forum/?q={search_term_string}',
    );
  });
});

describe('buildProjectSchema', () => {
  it('maps repository metadata onto SoftwareSourceCode', () => {
    const schema = buildProjectSchema(makeProject(), 'https://example.com/projects/astral-sh-uv/');

    expect(schema['@type']).toBe('SoftwareSourceCode');
    expect(schema.codeRepository).toBe('https://github.com/astral-sh/uv');
    expect(schema.programmingLanguage).toBe('Rust');
    expect(schema.keywords).toBe('python, packaging');
    expect(schema.interactionStatistic.userInteractionCount).toBe(42000);
  });

  it('omits optional fields that GitHub did not provide', () => {
    const schema = buildProjectSchema(
      makeProject({ language: null, license: null, topics: [] }),
      'https://example.com/projects/astral-sh-uv/',
    );

    expect(schema.programmingLanguage).toBeUndefined();
    expect(schema.license).toBeUndefined();
    expect(schema.keywords).toBeUndefined();
  });
});

describe('buildBreadcrumbSchema', () => {
  it('numbers each step of the trail in order', () => {
    const schema = buildBreadcrumbSchema([
      { name: '首頁', url: 'https://example.com/' },
      { name: '工具', url: 'https://example.com/?category=%E5%B7%A5%E5%85%B7' },
      { name: 'astral-sh/uv', url: 'https://example.com/projects/astral-sh-uv/' },
    ]);

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement.map((step) => step.position)).toEqual([1, 2, 3]);
    expect(schema.itemListElement[2].name).toBe('astral-sh/uv');
  });

  it('handles an empty trail', () => {
    expect(buildBreadcrumbSchema([]).itemListElement).toEqual([]);
  });
});

describe('buildRankingSchema', () => {
  const buildUrl = (project: Project) => `https://example.com/projects/${project.slug}/`;

  it('numbers list items from one', () => {
    const schema = buildRankingSchema(
      [makeProject(), makeProject({ slug: 'other', fullName: 'other/other' })],
      buildUrl,
    );

    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'astral-sh/uv',
      url: 'https://example.com/projects/astral-sh-uv/',
    });
    expect(schema.itemListElement[1].position).toBe(2);
  });

  it('caps the list at the requested limit', () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      makeProject({ slug: `repo-${index}`, fullName: `owner/repo-${index}` }),
    );
    const schema = buildRankingSchema(many, buildUrl, 5);

    expect(schema.numberOfItems).toBe(5);
    expect(schema.itemListElement).toHaveLength(5);
  });
});
