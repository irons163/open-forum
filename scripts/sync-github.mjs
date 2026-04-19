import { mkdir, readFile, writeFile } from 'node:fs/promises';

const seedFile = new URL('../src/data/project-seeds.json', import.meta.url);
const outputFile = new URL('../src/data/projects.generated.json', import.meta.url);
const historyFile = new URL('../data/history.json', import.meta.url);

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'open-forum-sync-script',
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function readJson(fileUrl, fallback) {
  try {
    const content = await readFile(fileUrl, 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function slugify(fullName) {
  return fullName.toLowerCase().replace(/[^\w]+/g, '-');
}

function daysSince(date) {
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / dayInMs));
}

function computeTrendScore({ stars, forks, delta1d, delta7d, delta30d, lastPushedAt }) {
  const recencyBonus = Math.max(0, 35 - daysSince(lastPushedAt)) * 18;
  return Math.round(
    stars * 0.16 +
      forks * 0.14 +
      delta1d * 40 +
      delta7d * 24 +
      delta30d * 8 +
      recencyBonus,
  );
}

async function fetchRepo(fullName) {
  const response = await fetch(`https://api.github.com/repos/${fullName}`, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${fullName} -> ${response.status} ${body}`);
  }

  return response.json();
}

const seeds = await readJson(seedFile, []);
const previousProjects = await readJson(outputFile, []);
const history = await readJson(historyFile, {});

const syncedAt = new Date().toISOString();
const snapshotDate = syncedAt.slice(0, 10);
const nextProjects = [];

for (const seed of seeds) {
  try {
    const repo = await fetchRepo(seed.repo);
    const previousEntries = Array.isArray(history[seed.repo]) ? history[seed.repo] : [];
    const withoutToday = previousEntries.filter((entry) => entry.date !== snapshotDate);
    const entries = [
      ...withoutToday,
      {
        date: snapshotDate,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        pushedAt: repo.pushed_at,
      },
    ].slice(-45);

    history[seed.repo] = entries;

    const previousDay = entries.at(-2);
    const weeklyBase = entries.length > 7 ? entries.at(-8) : entries[0];
    const monthlyBase = entries.length > 30 ? entries.at(-31) : entries[0];
    const delta1d = previousDay ? repo.stargazers_count - previousDay.stars : 0;
    const delta7d = weeklyBase ? repo.stargazers_count - weeklyBase.stars : 0;
    const delta30d = monthlyBase ? repo.stargazers_count - monthlyBase.stars : 0;
    const historyDays = entries.length;
    const previousWeeklyStars = Math.max(1, repo.stargazers_count - delta7d);
    const growthRate7d = Number(((delta7d / previousWeeklyStars) * 100).toFixed(2));
    const starVelocity7d = Number(
      (delta7d / Math.max(1, Math.min(7, Math.max(1, historyDays - 1)))).toFixed(1),
    );

    nextProjects.push({
      slug: slugify(repo.full_name),
      name: repo.name,
      owner: repo.owner.login,
      fullName: repo.full_name,
      repoUrl: repo.html_url,
      homepage: repo.homepage || null,
      description: repo.description || `${repo.full_name} repository`,
      category: seed.category,
      highlight: seed.highlight,
      topics: repo.topics || [],
      language: repo.language,
      license: repo.license?.spdx_id || repo.license?.name || null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      watchers: repo.subscribers_count,
      historyDays,
      delta1d,
      delta7d,
      delta30d,
      growthRate7d,
      starVelocity7d,
      trendScore: computeTrendScore({
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        delta1d,
        delta7d,
        delta30d,
        lastPushedAt: repo.pushed_at,
      }),
      lastPushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
      syncedAt,
      avatarUrl: repo.owner.avatar_url,
    });
  } catch (error) {
    const staleProject = previousProjects.find((project) => project.fullName === seed.repo);

    if (staleProject) {
      nextProjects.push({
        ...staleProject,
        category: seed.category,
        highlight: seed.highlight,
        syncedAt,
      });
      console.warn(`Using stale data for ${seed.repo}: ${error.message}`);
      continue;
    }

    console.warn(`Skipping ${seed.repo}: ${error.message}`);
  }
}

nextProjects.sort((left, right) => right.trendScore - left.trendScore);

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(nextProjects, null, 2)}\n`);
await writeFile(historyFile, `${JSON.stringify(history, null, 2)}\n`);

console.log(`Synced ${nextProjects.length} repositories at ${syncedAt}`);
