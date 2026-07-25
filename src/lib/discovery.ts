import rawDiscovery from '../data/discovery-candidates.json';

export type DiscoveryCandidate = {
  fullName: string;
  name: string;
  owner: string;
  repoUrl: string;
  description: string;
  language: string | null;
  license: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  pushedAt: string;
  ageDays: number;
  starsPerDay: number;
  category: string;
  source: string;
  sources?: string[];
  archived: boolean;
  fork: boolean;
  recommendIssueUrl?: string;
};

export type DiscoveryDocument = {
  generatedAt: string | null;
  asOf: string | null;
  trackedCount: number;
  queryCount: number;
  candidateCount: number;
  note: string;
  queries: Array<{
    id: string;
    label: string;
    query: string;
    totalCount: number;
    hitCount: number;
  }>;
  errors: Array<{ id: string; reason: string }>;
  candidates: DiscoveryCandidate[];
};

export const discovery = rawDiscovery as DiscoveryDocument;

export function getDiscoveryCandidates(document: DiscoveryDocument = discovery) {
  return Array.isArray(document.candidates) ? document.candidates : [];
}

/**
 * The weekly discovery snapshot can outlive a mid-week approval. Drop anything
 * already in the seed list so the maintainer page never offers "收錄" for a
 * repo that is already tracked.
 */
export function getUntrackedDiscoveryCandidates(
  trackedRepos: Iterable<string>,
  document: DiscoveryDocument = discovery,
) {
  const tracked = new Set(
    [...trackedRepos].map((repo) => repo.toLowerCase()).filter(Boolean),
  );

  return getDiscoveryCandidates(document).filter(
    (candidate) => !tracked.has(candidate.fullName.toLowerCase()),
  );
}

export function hasDiscoveryRun(document: DiscoveryDocument = discovery) {
  return Boolean(document.generatedAt);
}

/**
 * Prefill GitHub Issue Form fields by their YAML `id`. Title alone is not
 * enough. The field id must not be `repo` — GitHub treats that query key as
 * reserved and will not fill a custom input with it.
 */
export function buildRecommendIssueUrl(
  siteRepoUrl: string,
  candidate: Pick<DiscoveryCandidate, 'fullName' | 'repoUrl' | 'category' | 'description'>,
) {
  if (!siteRepoUrl || !candidate.fullName) {
    return '';
  }

  const params = new URLSearchParams({
    template: 'recommend-project.yml',
    title: `[Recommend] ${candidate.fullName}`,
    repository: candidate.repoUrl || `https://github.com/${candidate.fullName}`,
  });

  if (candidate.category) {
    params.set('category', candidate.category);
  }

  params.set('reason_type', '近期熱度上升');

  // Only prefill "為什麼推薦". Duplicating the same blurb into use_case makes
  // the second required field look stuck and is usually the wrong answer anyway.
  if (candidate.description) {
    params.set('reason', candidate.description);
  }

  return `${siteRepoUrl}/issues/new?${params.toString()}`;
}
