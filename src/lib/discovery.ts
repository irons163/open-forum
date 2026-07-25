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

export function hasDiscoveryRun(document: DiscoveryDocument = discovery) {
  return Boolean(document.generatedAt);
}

/**
 * Prefill GitHub Issue Form fields by their YAML `id`. Title alone is not
 * enough — without `repo=`, the "GitHub repo" input stays empty.
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
    repo: candidate.repoUrl || `https://github.com/${candidate.fullName}`,
  });

  if (candidate.category) {
    params.set('category', candidate.category);
  }

  params.set('reason_type', '近期熱度上升');

  if (candidate.description) {
    params.set('reason', candidate.description);
    params.set('use_case', candidate.description);
  }

  return `${siteRepoUrl}/issues/new?${params.toString()}`;
}
