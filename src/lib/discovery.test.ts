import { describe, expect, it } from 'vitest';
import {
  buildRecommendIssueBody,
  buildRecommendIssueUrl,
  discovery,
  getDiscoveryCandidates,
  getUntrackedDiscoveryCandidates,
  hasDiscoveryRun,
  type DiscoveryCandidate,
  type DiscoveryDocument,
} from './discovery';

describe('discovery helpers', () => {
  it('exposes the committed discovery document', () => {
    expect(discovery).toHaveProperty('candidates');
    expect(Array.isArray(discovery.candidates)).toBe(true);
  });

  it('returns an empty list when candidates are missing', () => {
    const document = { candidates: undefined } as unknown as DiscoveryDocument;

    expect(getDiscoveryCandidates(document)).toEqual([]);
  });

  it('returns the candidate list when present', () => {
    const document = {
      candidates: [{ fullName: 'acme/rocket' }],
    } as DiscoveryDocument;

    expect(getDiscoveryCandidates(document)).toEqual([{ fullName: 'acme/rocket' }]);
  });

  it('detects whether a discovery run has produced a snapshot', () => {
    expect(hasDiscoveryRun({ generatedAt: null } as DiscoveryDocument)).toBe(false);
    expect(hasDiscoveryRun({ generatedAt: '2026-07-25T00:00:00Z' } as DiscoveryDocument)).toBe(true);
  });

  it('hides candidates that were approved after the snapshot was taken', () => {
    const document = {
      candidates: [
        { fullName: 'DietrichGebert/ponytail' },
        { fullName: 'acme/rocket' },
      ],
    } as DiscoveryDocument;

    expect(
      getUntrackedDiscoveryCandidates(['dietrichgebert/ponytail'], document).map(
        (candidate: DiscoveryCandidate) => candidate.fullName,
      ),
    ).toEqual(['acme/rocket']);
  });

  it('prefills a plain markdown body once instead of sticky form fields', () => {
    const candidate = {
      fullName: 'acme/rocket',
      repoUrl: 'https://github.com/acme/rocket',
      category: 'AI',
      description: 'Agent harness',
    };
    const body = buildRecommendIssueBody(candidate);
    const url = buildRecommendIssueUrl('https://github.com/irons163/open-forum', candidate);
    const params = new URL(url).searchParams;

    expect(body).toContain('https://github.com/acme/rocket');
    expect(body).toContain('Agent harness');
    expect(body).toContain('（請改成實際適用對象或情境）');
    expect(params.get('template')).toBeNull();
    expect(params.get('labels')).toBe('recommend');
    expect(params.get('body')).toBe(body);
    expect(buildRecommendIssueUrl('', { fullName: 'acme/rocket', repoUrl: '', category: '', description: '' })).toBe(
      '',
    );
  });
});
