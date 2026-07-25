import { describe, expect, it } from 'vitest';
import { discovery, getDiscoveryCandidates, hasDiscoveryRun, type DiscoveryDocument } from './discovery';

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
});
