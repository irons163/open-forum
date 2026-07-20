import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  buildLimitComment,
  closeIssue,
  commentIssue,
  fetchIssue,
  getRecommendationLimit,
  getRecommendationUsage,
  isOverRecommendationLimit,
  isRecommendationIssue,
} from './recommendation-limit.mjs';

export async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const sourceRepository = process.env.GITHUB_REPOSITORY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const limit = getRecommendationLimit();

  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required.');
  if (!sourceRepository) throw new Error('GITHUB_REPOSITORY is required.');
  if (!issueNumber) throw new Error('ISSUE_NUMBER is required.');

  const issue = await fetchIssue({ token, sourceRepository, issueNumber });

  if (!isRecommendationIssue(issue)) {
    await writeOutputs({ skipped: 'true', over_limit: 'false', skip_reason: 'not_recommendation' });
    console.log('Skipping because the issue is not a recommendation issue.');
    return;
  }

  const author = issue.user?.login;
  const usage = await getRecommendationUsage({ token, sourceRepository, author });
  const overLimit = isOverRecommendationLimit(usage.count, limit);

  await writeOutputs({
    skipped: 'false',
    over_limit: String(overLimit),
    recommendation_count: String(usage.count),
    recommendation_limit: String(limit),
    author,
  });

  if (!overLimit) {
    console.log(`${author} has ${usage.count}/${limit} recommendation issues.`);
    return;
  }

  await commentIssue({
    token,
    sourceRepository,
    issueNumber,
    body: buildLimitComment({ author, count: usage.count, limit }),
  });
  await closeIssue({ token, sourceRepository, issueNumber });

  console.log(`Closed recommendation issue #${issueNumber}; ${author} has ${usage.count}/${limit}.`);
}

async function writeOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;

  const lines = Object.entries(outputs).map(([name, value]) => {
    const cleanValue = String(value).replace(/\r?\n/g, ' ');
    return `${name}=${cleanValue}`;
  });

  await appendFile(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
