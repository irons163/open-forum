/**
 * GitHub Search has no true "stars gained in the last N days" field.
 * The practical proxy for recent velocity is: many stars accumulated over a
 * short age (especially repos created in the last few weeks), plus recent
 * pushes so the project is still alive. Candidates are never auto-added to
 * project-seeds.json — they land in discovery-candidates.json for review.
 */

export const discoveryLimit = 15;

export const categoryTopics = {
  AI: [
    'ai',
    'llm',
    'machine-learning',
    'deep-learning',
    'generative-ai',
    'agents',
    'ai-agents',
    'stable-diffusion',
    'pytorch',
    'transformers',
    'openai',
    'langchain',
    'diffusion',
    'ml',
  ],
  前端: ['frontend', 'react', 'vue', 'svelte', 'nextjs', 'astro', 'css', 'ui', 'web-components'],
  後端: ['backend', 'api', 'database', 'graphql', 'server', 'nestjs', 'django', 'fastapi'],
  工具: [
    'cli',
    'devops',
    'developer-tools',
    'tooling',
    'vscode-extension',
    'automation',
    'workflow',
    'self-hosted',
  ],
};

export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso = isoDate(new Date())) {
  const dayInMs = 1000 * 60 * 60 * 24;
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0;
  }

  return Math.max(0, Math.floor((to - from) / dayInMs));
}

export function shiftDays(fromDate, deltaDays) {
  const next = new Date(fromDate);
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next;
}

/**
 * A handful of complementary searches. Each one catches a different shape of
 * "recently heating up" that total-star sort alone would miss.
 */
export function buildSearchQueries(now = new Date()) {
  const today = isoDate(now);
  const d7 = isoDate(shiftDays(now, -7));
  const d30 = isoDate(shiftDays(now, -30));
  const d90 = isoDate(shiftDays(now, -90));
  const d180 = isoDate(shiftDays(now, -180));
  const d14 = isoDate(shiftDays(now, -14));

  return [
    {
      id: 'newcomer-week',
      label: '近 7 天新建且已破百星',
      query: `created:>${d7} stars:>=100 fork:false archived:false`,
    },
    {
      id: 'newcomer-month',
      label: '近 30 天新建且已破 300 星',
      query: `created:${d30}..${d7} stars:>=300 fork:false archived:false`,
    },
    {
      id: 'young-active',
      label: '半年內建立、近期仍在推、星數落在可追蹤區間',
      query: `created:${d180}..${d30} stars:500..20000 pushed:>${d14} fork:false archived:false`,
    },
    {
      id: 'topic-ai',
      label: '近期 AI / LLM 相關',
      query: `topic:llm created:>${d90} stars:>=200 fork:false archived:false`,
    },
    {
      id: 'topic-agents',
      label: '近期 AI agent 相關',
      query: `topic:ai-agents created:>${d90} stars:>=150 fork:false archived:false`,
    },
    {
      id: 'topic-frontend',
      label: '近期前端相關',
      query: `topic:frontend created:>${d90} stars:>=300 fork:false archived:false`,
    },
  ].map((entry) => ({
    ...entry,
    // Keep the day the queries were built so the JSON can explain itself.
    asOf: today,
  }));
}

export function trackedRepoSet(seeds) {
  return new Set(
    (Array.isArray(seeds) ? seeds : [])
      .map((seed) => String(seed?.repo || '').toLowerCase())
      .filter(Boolean),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMatchesKeyword(text, keyword) {
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();

  // Short tokens like "ai" / "cli" / "ml" must be whole words, otherwise
  // "cli" matches inside ordinary English ("A fast CLI" is fine; "application" is not).
  if (needle.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`).test(haystack);
  }

  return haystack.includes(needle);
}

export function guessCategory({ topics = [], language = null, description = '' } = {}) {
  const topicText = topics.join(' ').toLowerCase();
  const descriptionText = String(description || '').toLowerCase();
  const scores = Object.fromEntries(Object.keys(categoryTopics).map((name) => [name, 0]));

  for (const [category, keywords] of Object.entries(categoryTopics)) {
    for (const keyword of keywords) {
      if (textMatchesKeyword(topicText, keyword)) {
        // Explicit GitHub topics are a stronger signal than prose in the description.
        scores[category] += keyword.length >= 6 ? 3 : 2;
      } else if (textMatchesKeyword(descriptionText, keyword)) {
        scores[category] += 1;
      }
    }
  }

  if (['python', 'jupyter notebook'].includes(String(language || '').toLowerCase())) {
    scores.AI += 1;
  }

  if (['typescript', 'javascript', 'css', 'vue', 'svelte'].includes(String(language || '').toLowerCase())) {
    scores['前端'] += 1;
  }

  if (['go', 'java', 'ruby', 'php', 'c#', 'kotlin'].includes(String(language || '').toLowerCase())) {
    scores['後端'] += 1;
  }

  if (['rust', 'shell', 'dockerfile'].includes(String(language || '').toLowerCase())) {
    scores['工具'] += 1;
  }

  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);

  if (!ranked[0] || ranked[0][1] === 0) {
    return '工具';
  }

  return ranked[0][0];
}

export function estimateVelocity(stars, createdAt, asOf = isoDate(new Date())) {
  const ageDays = Math.max(1, daysBetween(createdAt.slice(0, 10), asOf));
  return Number((stars / ageDays).toFixed(2));
}

export function normalizeSearchItem(item, { source, asOf }) {
  const fullName = item.full_name;
  const createdAt = item.created_at;
  const stars = item.stargazers_count ?? 0;
  const ageDays = Math.max(1, daysBetween(createdAt.slice(0, 10), asOf));
  const topics = Array.isArray(item.topics) ? item.topics : [];

  return {
    fullName,
    name: item.name,
    owner: item.owner?.login || fullName.split('/')[0],
    repoUrl: item.html_url,
    description: item.description || '',
    language: item.language || null,
    license: item.license?.spdx_id || item.license?.name || null,
    topics,
    stars,
    forks: item.forks_count ?? 0,
    openIssues: item.open_issues_count ?? 0,
    createdAt,
    pushedAt: item.pushed_at,
    ageDays,
    starsPerDay: estimateVelocity(stars, createdAt, asOf),
    category: guessCategory({ topics, language: item.language, description: item.description || '' }),
    source,
    archived: item.archived === true,
    fork: item.fork === true,
  };
}

export function isEligibleCandidate(candidate, tracked) {
  if (!candidate?.fullName) {
    return false;
  }

  if (tracked.has(candidate.fullName.toLowerCase())) {
    return false;
  }

  if (candidate.archived || candidate.fork) {
    return false;
  }

  if (candidate.stars < 100) {
    return false;
  }

  return true;
}

/**
 * Prefer high daily star accumulation, then absolute stars, then freshness.
 * Cap the list so the maintainer page stays scannable.
 */
export function rankCandidates(candidates, limit = discoveryLimit) {
  return [...candidates]
    .sort(
      (left, right) =>
        right.starsPerDay - left.starsPerDay ||
        right.stars - left.stars ||
        left.ageDays - right.ageDays,
    )
    .slice(0, limit);
}

export function mergeCandidates(batches, tracked, { limit = discoveryLimit, asOf = isoDate(new Date()) } = {}) {
  const byName = new Map();

  for (const batch of batches) {
    for (const item of batch.items || []) {
      const candidate = normalizeSearchItem(item, { source: batch.id, asOf });

      if (!isEligibleCandidate(candidate, tracked)) {
        continue;
      }

      const existing = byName.get(candidate.fullName.toLowerCase());

      if (!existing || candidate.starsPerDay > existing.starsPerDay) {
        byName.set(candidate.fullName.toLowerCase(), {
          ...candidate,
          sources: existing ? [...new Set([...existing.sources, batch.id])] : [batch.id],
        });
      } else if (existing) {
        existing.sources = [...new Set([...existing.sources, batch.id])];
      }
    }
  }

  return rankCandidates([...byName.values()], limit);
}

export function buildRecommendIssueUrl(siteRepoUrl, candidate) {
  if (!siteRepoUrl || !candidate?.fullName) {
    return '';
  }

  const title = encodeURIComponent(`[Recommend] ${candidate.fullName}`);
  return `${siteRepoUrl}/issues/new?template=recommend-project.yml&title=${title}`;
}

export function buildDiscoverySummary({ candidates, queries, trackedCount }) {
  const lines = [
    '## 發現候選專案',
    '',
    `搜尋條件 ${queries.length} 組，已追蹤 ${trackedCount} 個，留下 ${candidates.length} 個候選。`,
    '',
  ];

  if (!candidates.length) {
    lines.push('這輪沒有符合條件、且尚未收錄的 repo。');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| repo | 類別 | stars | 日均增星（估算） | 年齡 | 來源 |', '| --- | --- | ---: | ---: | ---: | --- |');

  for (const candidate of candidates) {
    lines.push(
      `| [\`${candidate.fullName}\`](${candidate.repoUrl}) | ${candidate.category} | ${candidate.stars} | ${candidate.starsPerDay} | ${candidate.ageDays}d | ${(candidate.sources || [candidate.source]).join(', ')} |`,
    );
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}
