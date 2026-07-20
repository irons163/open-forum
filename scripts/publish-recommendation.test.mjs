import { describe, expect, it } from 'vitest';
import { buildHighlight, normalizeRepoInput, parseIssueForm } from './publish-recommendation.mjs';

describe('publish recommendation helpers', () => {
  it('parses GitHub issue form sections', () => {
    const body = `### GitHub repo

https://github.com/owner/repo

### 類別

AI

### 推薦角度

近期熱度上升

### 為什麼推薦

支援 agent workflow，最近社群討論很多。

### 適合什麼人或什麼情境

適合正在找 AI agent workflow 的團隊。
`;

    const fields = parseIssueForm(body);

    expect(fields.get('GitHub repo')).toBe('https://github.com/owner/repo');
    expect(fields.get('類別')).toBe('AI');
    expect(fields.get('推薦角度')).toBe('近期熱度上升');
    expect(fields.get('為什麼推薦')).toBe('支援 agent workflow，最近社群討論很多。');
  });

  it('normalizes supported GitHub repo formats', () => {
    expect(normalizeRepoInput('https://github.com/Owner/Repo')).toBe('Owner/Repo');
    expect(normalizeRepoInput('https://github.com/owner/repo.git')).toBe('owner/repo');
    expect(normalizeRepoInput('owner/repo')).toBe('owner/repo');
  });

  it('rejects invalid repo values', () => {
    expect(() => normalizeRepoInput('https://example.com/owner/repo')).toThrow(/Invalid GitHub repo/);
    expect(() => normalizeRepoInput('owner')).toThrow(/Invalid GitHub repo/);
  });

  it('builds a concise highlight from the recommendation reason', () => {
    expect(
      buildHighlight({
        reasonType: '近期熱度上升',
        reason: '- [很好用](https://example.com)，適合快速做原型',
        useCase: '適合內部工具',
        repoName: 'owner/repo',
      }),
    ).toBe('近期熱度上升：很好用，適合快速做原型。');
  });
});
