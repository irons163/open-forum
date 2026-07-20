export const DEFAULT_RECOMMENDATION_LIMIT = 3;
export const RECOMMEND_LABEL = 'recommend';

export function getRecommendationLimit(value = process.env.RECOMMENDATION_LIMIT) {
  if (value === undefined || value === '') return DEFAULT_RECOMMENDATION_LIMIT;

  if (!/^\d+$/.test(value)) {
    throw new Error(`RECOMMENDATION_LIMIT must be a positive integer. Received: ${value}`);
  }

  const limit = Number.parseInt(value, 10);
  if (limit < 1) {
    throw new Error(`RECOMMENDATION_LIMIT must be a positive integer. Received: ${value}`);
  }

  return limit;
}

export function getIssueLabelNames(issue) {
  return (issue.labels || [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter(Boolean);
}

export function isRecommendationIssue(issue) {
  return !issue.pull_request && getIssueLabelNames(issue).includes(RECOMMEND_LABEL);
}

export function isOverRecommendationLimit(count, limit) {
  return count > limit;
}

export function buildLimitComment({ author, count, limit }) {
  return [
    `@${author} 這個推薦表單目前限制每個 GitHub 帳號最多送出 ${limit} 則推薦。`,
    '',
    `系統目前偵測到你已經送出 ${count} 則推薦，因此這則會先自動關閉。`,
    '如果這是誤判，請維護者重新開啟或協助調整既有推薦 Issue。',
  ].join('\n');
}

export async function fetchIssue({ token, sourceRepository, issueNumber }) {
  return githubJson(token, `https://api.github.com/repos/${sourceRepository}/issues/${issueNumber}`);
}

export async function getRecommendationUsage({ token, sourceRepository, author }) {
  if (!author) throw new Error('Issue author is required to check recommendation usage.');

  const issues = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${sourceRepository}/issues`);
    url.searchParams.set('state', 'all');
    url.searchParams.set('labels', RECOMMEND_LABEL);
    url.searchParams.set('creator', author);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const pageIssues = await githubJson(token, url);
    issues.push(...pageIssues.filter(isRecommendationIssue));

    if (pageIssues.length < 100) break;
    page += 1;
  }

  return {
    author,
    count: issues.length,
    issues,
  };
}

export async function commentIssue({ token, sourceRepository, issueNumber, body }) {
  return githubJson(token, `https://api.github.com/repos/${sourceRepository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function closeIssue({ token, sourceRepository, issueNumber }) {
  return githubJson(token, `https://api.github.com/repos/${sourceRepository}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' }),
  });
}

export async function githubJson(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'open-forum-recommendation-automation',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed (${response.status}) for ${url}: ${body.slice(0, 400)}`);
  }

  return response.json();
}
