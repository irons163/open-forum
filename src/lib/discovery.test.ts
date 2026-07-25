import { describe, expect, it } from 'vitest';
import {
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

  it('prefills issue form fields by id, not only the title', () => {
    const url = buildRecommendIssueUrl('https://github.com/irons163/open-forum', {
      fullName: 'acme/rocket',
      repoUrl: 'https://github.com/acme/rocket',
      category: 'AI',
      description: 'Agent harness',
    });
    const params = new URL(url).searchParams;

    expect(params.get('repository')).toBe('https://github.com/acme/rocket');
    expect(params.get('repo')).toBeNull();
    expect(params.get('category')).toBe('AI');
    expect(params.get('reason_type')).toBe('近期熱度上升');
    expect(params.get('reason')).toBe('Agent harness');
    expect(params.get('use_case')).toBeNull();
    expect(buildRecommendIssueUrl('', { fullName: 'acme/rocket', repoUrl: '', category: '', description: '' })).toBe(
      '',
    );
  });
});
