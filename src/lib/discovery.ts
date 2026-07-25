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
 * Build a markdown issue body the publish script can parse. Used instead of
 * Issue Form field query params, because forms re-apply URL values on every
 * re-render ("delete it and it grows back"). A plain `body=` prefill is pasted
 * once into the editor and stays editable.
 */
export function buildRecommendIssueBody(
  candidate: Pick<DiscoveryCandidate, 'fullName' | 'repoUrl' | 'category' | 'description'>,
) {
  const repoUrl = candidate.repoUrl || `https://github.com/${candidate.fullName}`;
  const category = candidate.category || '工具';
  const reason = candidate.description?.trim() || '（請說明為什麼值得收錄）';

  return `### GitHub repo

${repoUrl}

### 類別

${category}

### 推薦角度

近期熱度上升

### 為什麼推薦

${reason}

### 適合什麼人或什麼情境

（請改成實際適用對象或情境）
`;
}

/**
 * Discovery "開收錄 Issue" links intentionally skip the Issue Form template.
 * Form query prefills cannot be "apply once"; markdown body prefills can.
 */
export function buildRecommendIssueUrl(
  siteRepoUrl: string,
  candidate: Pick<DiscoveryCandidate, 'fullName' | 'repoUrl' | 'category' | 'description'>,
) {
  if (!siteRepoUrl || !candidate.fullName) {
    return '';
  }

  const params = new URLSearchParams({
    title: `[Recommend] ${candidate.fullName}`,
    labels: 'recommend',
    body: buildRecommendIssueBody(candidate),
  });

  return `${siteRepoUrl}/issues/new?${params.toString()}`;
}
