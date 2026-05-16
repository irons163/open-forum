import { afterEach, describe, expect, it, vi } from 'vitest';

async function importSite() {
  vi.resetModules();
  return import('./site');
}

describe('site URL helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.GITHUB_REPOSITORY;
  });

  it('uses explicit public repository URLs when provided', async () => {
    vi.stubEnv('BASE_URL', '/open-forum/');
    vi.stubEnv('PUBLIC_SITE_REPO', 'https://github.com/example/open-forum');
    vi.stubEnv('PUBLIC_DISCUSSIONS_URL', 'https://github.com/example/open-forum/discussions/general');

    const site = await importSite();

    expect(site.baseUrl).toBe('/open-forum/');
    expect(site.siteRepoUrl).toBe('https://github.com/example/open-forum');
    expect(site.discussionsUrl).toBe('https://github.com/example/open-forum/discussions/general');
    expect(site.recommendIssueUrl).toBe('https://github.com/example/open-forum/issues/new?template=recommend-project.yml');
  });

  it('falls back to the GitHub Actions repository when public URLs are absent', async () => {
    vi.stubEnv('BASE_URL', '/open-forum/');
    process.env.GITHUB_REPOSITORY = 'irons163/open-forum';

    const site = await importSite();

    expect(site.siteRepoUrl).toBe('https://github.com/irons163/open-forum');
    expect(site.discussionsUrl).toBe('https://github.com/irons163/open-forum/discussions');
    expect(site.recommendIssueUrl).toBe('https://github.com/irons163/open-forum/issues/new?template=recommend-project.yml');
  });

  it('keeps optional community URLs empty when there is no repository context', async () => {
    vi.stubEnv('BASE_URL', '/');

    const site = await importSite();

    expect(site.baseUrl).toBe('/');
    expect(site.siteRepoUrl).toBe('');
    expect(site.discussionsUrl).toBe('');
    expect(site.recommendIssueUrl).toBe('');
  });
});
