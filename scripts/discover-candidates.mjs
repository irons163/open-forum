import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  buildDiscoverySummary,
  buildRecommendIssueUrl,
  buildSearchQueries,
  discoveryLimit,
  isoDate,
  mergeCandidates,
  trackedRepoSet,
} from './discover-lib.mjs';

const seedFile = new URL('../src/data/project-seeds.json', import.meta.url);
const outputFile = new URL('../src/data/discovery-candidates.json', import.meta.url);

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const siteRepoUrl =
  process.env.PUBLIC_SITE_REPO ||
  (process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : '');

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'open-forum-discover-candidates',
  'X-GitHub-Api-Version': '2022-11-28',
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

async function searchRepositories(query, { perPage = 20 } = {}) {
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', query);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(perPage));

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`search failed (${response.status}): ${body.slice(0, 400)}`);
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const seeds = await readJson(seedFile, []);
const tracked = trackedRepoSet(seeds);
const now = new Date();
const asOf = isoDate(now);
const queries = buildSearchQueries(now);
const batches = [];
const errors = [];

for (const [index, entry] of queries.entries()) {
  try {
    // Authenticated search allows 30 req/min; leave a little headroom between calls.
    if (index > 0) {
      await sleep(token ? 1200 : 6500);
    }

    const payload = await searchRepositories(entry.query);
    batches.push({
      id: entry.id,
      label: entry.label,
      query: entry.query,
      totalCount: payload.total_count ?? 0,
      items: payload.items ?? [],
    });
    console.log(`Search ${entry.id}: ${(payload.items || []).length} hits (total ${payload.total_count ?? 0})`);
  } catch (error) {
    errors.push({ id: entry.id, reason: error.message });
    console.log(`::warning title=Discovery search failed::${entry.id} — ${error.message.slice(0, 280)}`);
  }
}

const ranked = mergeCandidates(batches, tracked, { limit: discoveryLimit, asOf });
const candidates = ranked.map((candidate) => ({
  ...candidate,
  recommendIssueUrl: buildRecommendIssueUrl(siteRepoUrl, candidate),
}));

const document = {
  generatedAt: now.toISOString(),
  asOf,
  trackedCount: tracked.size,
  queryCount: queries.length,
  candidateCount: candidates.length,
  note:
    'GitHub Search 沒有真正的 7 天增星欄位；日均增星是用目前 stars ÷ 建立天數估算，只作候選排序，不會自動收錄。',
  queries: batches.map((batch) => ({
    id: batch.id,
    label: batch.label,
    query: batch.query,
    totalCount: batch.totalCount,
    hitCount: batch.items.length,
  })),
  errors,
  candidates,
};

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    buildDiscoverySummary({
      candidates,
      queries,
      trackedCount: tracked.size,
    }),
  );
}

console.log(`Wrote ${candidates.length} discovery candidates to src/data/discovery-candidates.json`);

if (errors.length) {
  console.log(`${errors.length} search query/queries failed.`);
}
