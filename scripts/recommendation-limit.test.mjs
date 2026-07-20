import { describe, expect, it } from 'vitest';
import {
  buildLimitComment,
  DEFAULT_RECOMMENDATION_LIMIT,
  getIssueLabelNames,
  getRecommendationLimit,
  isOverRecommendationLimit,
  isRecommendationIssue,
} from './recommendation-limit.mjs';

describe('recommendation limit helpers', () => {
  it('uses a default limit of three recommendations per account', () => {
    expect(DEFAULT_RECOMMENDATION_LIMIT).toBe(3);
    expect(getRecommendationLimit()).toBe(3);
    expect(getRecommendationLimit('5')).toBe(5);
  });

  it('rejects invalid custom limits', () => {
    expect(() => getRecommendationLimit('0')).toThrow(/positive integer/);
    expect(() => getRecommendationLimit('abc')).toThrow(/positive integer/);
  });

  it('reads labels from both issue API shapes', () => {
    expect(getIssueLabelNames({ labels: ['recommend'] })).toEqual(['recommend']);
    expect(getIssueLabelNames({ labels: [{ name: 'recommend' }, { name: 'approved' }] })).toEqual([
      'recommend',
      'approved',
    ]);
  });

  it('recognizes recommendation issues and ignores pull requests', () => {
    expect(isRecommendationIssue({ labels: [{ name: 'recommend' }] })).toBe(true);
    expect(isRecommendationIssue({ labels: [{ name: 'recommend' }], pull_request: {} })).toBe(false);
    expect(isRecommendationIssue({ labels: [{ name: 'question' }] })).toBe(false);
  });

  it('treats the fourth recommendation as over limit', () => {
    expect(isOverRecommendationLimit(3, 3)).toBe(false);
    expect(isOverRecommendationLimit(4, 3)).toBe(true);
  });

  it('builds a clear over-limit comment', () => {
    const comment = buildLimitComment({ author: 'octocat', count: 4, limit: 3 });

    expect(comment).toContain('@octocat');
    expect(comment).toContain('最多送出 3 則推薦');
    expect(comment).toContain('已經送出 4 則推薦');
  });
});
