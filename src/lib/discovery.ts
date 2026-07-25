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
