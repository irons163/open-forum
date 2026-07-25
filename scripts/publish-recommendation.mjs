import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  fetchIssue,
  getIssueLabelNames,
  getRecommendationLimit,
  getRecommendationUsage,
  githubJson,
  isOverRecommendationLimit,
} from './recommendation-limit.mjs';

const CATEGORY_OPTIONS = new Set(['AI', '前端', '工具', '後端']);
const FORM_FIELDS = {
  repo: 'GitHub repo',
  category: '類別',
  reasonType: '推薦角度',
  reason: '為什麼推薦',
  useCase: '適合什麼人或什麼情境',
};

export async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const sourceRepository = process.env.GITHUB_REPOSITORY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const approvalLabel = process.env.APPROVAL_LABEL || 'approved';
  const recommendationLimit = getRecommendationLimit();

  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required.');
  if (!sourceRepository) throw new Error('GITHUB_REPOSITORY is required.');
  if (!issueNumber) throw new Error('ISSUE_NUMBER is required.');

  const issue = await fetchIssue({ token, sourceRepository, issueNumber });

  if (issue.pull_request) {
    await writeOutputs({ skipped: 'true', changed: 'false', skip_reason: 'pull_request' });
    console.log('Skipping because the event points to a pull request.');
    return;
  }

  const labels = getIssueLabelNames(issue);

  if (!labels.includes('recommend')) {
    await writeOutputs({ skipped: 'true', changed: 'false', skip_reason: 'missing_recommend_label' });
    console.log('Skipping because the issue is not labeled recommend.');
    return;
  }

  if (!labels.includes(approvalLabel)) {
    await writeOutputs({ skipped: 'true', changed: 'false', skip_reason: 'missing_approval_label' });
    console.log(`Skipping because the issue is not labeled ${approvalLabel}.`);
    return;
  }

  const recommendationUsage = await getRecommendationUsage({
    token,
    sourceRepository,
    author: issue.user?.login,
  });

  if (isOverRecommendationLimit(recommendationUsage.count, recommendationLimit)) {
    await writeOutputs({
      skipped: 'true',
      changed: 'false',
      over_limit: 'true',
      recommendation_count: String(recommendationUsage.count),
      recommendation_limit: String(recommendationLimit),
      skip_reason: 'recommendation_limit',
    });
    console.log(
      `Skipping because ${issue.user?.login} has ${recommendationUsage.count}/${recommendationLimit} recommendation issues.`,
    );
    return;
  }

  const fields = parseIssueForm(issue.body || '');
  const repoInput = requiredField(fields, FORM_FIELDS.repo);
  const category = requiredField(fields, FORM_FIELDS.category);
  const reasonType = requiredField(fields, FORM_FIELDS.reasonType);
  const reason = requiredField(fields, FORM_FIELDS.reason);
  const useCase = requiredField(fields, FORM_FIELDS.useCase);

  if (!CATEGORY_OPTIONS.has(category)) {
    throw new Error(`Unsupported category "${category}". Expected one of: ${[...CATEGORY_OPTIONS].join(', ')}`);
  }

  const requestedRepo = normalizeRepoInput(repoInput);
  const targetRepo = await githubJson(token, `https://api.github.com/repos/${requestedRepo}`);

  if (targetRepo.private) {
    throw new Error(`${targetRepo.full_name} is private and cannot be published.`);
  }

  if (targetRepo.archived) {
    throw new Error(`${targetRepo.full_name} is archived. Please review manually before publishing.`);
  }

  const seedsUrl = new URL('../src/data/project-seeds.json', import.meta.url);
  const seeds = JSON.parse(await readFile(seedsUrl, 'utf8'));
  const existingSeed = seeds.find(
    (seed) => seed.repo.toLowerCase() === targetRepo.full_name.toLowerCase(),
  );

  if (existingSeed) {
    await writeOutputs({
      skipped: 'false',
      changed: 'false',
      already_exists: 'true',
      repo: existingSeed.repo,
      repo_slug: toBranchSlug(existingSeed.repo),
    });
    console.log(`${existingSeed.repo} is already in src/data/project-seeds.json.`);
    return;
  }

  const nextSeed = {
    repo: targetRepo.full_name,
    category,
    highlight: buildHighlight({ reasonType, reason, useCase, repoName: targetRepo.full_name }),
  };

  seeds.push(nextSeed);
  await writeFile(seedsUrl, `${JSON.stringify(seeds, null, 2)}\n`);

  await writeOutputs({
    skipped: 'false',
    changed: 'true',
    already_exists: 'false',
    repo: nextSeed.repo,
    repo_slug: toBranchSlug(nextSeed.repo),
    category: nextSeed.category,
    highlight: nextSeed.highlight,
  });

  console.log(`Prepared ${nextSeed.repo} for publication.`);
}

export function parseIssueForm(body) {
  const sections = new Map();
  let currentHeading = null;
  let currentLines = [];

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^###\s+(.+?)\s*$/);
    if (match) {
      flushSection(sections, currentHeading, currentLines);
      currentHeading = match[1].trim();
      currentLines = [];
      continue;
    }

    if (currentHeading) currentLines.push(line);
  }

  flushSection(sections, currentHeading, currentLines);
  return sections;
}

function flushSection(sections, heading, lines) {
  if (!heading) return;

  const value = lines
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  sections.set(heading, value);
}

function requiredField(fields, label) {
  const value = fields.get(label);
  if (!value) throw new Error(`Missing required issue form field: ${label}`);
  return value.trim();
}

export function normalizeRepoInput(value) {
  const token = value.trim().replace(/^<|>$/g, '').split(/\s+/)[0]?.replace(/\/+$/, '');
  if (!token) throw new Error('GitHub repo is empty.');

  const urlMatch = token.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#].*)?$/i);
  const shorthandMatch = token.match(/^([^/\s]+)\/([^/\s#?]+)$/);
  const match = urlMatch || shorthandMatch;

  if (!match) {
    throw new Error(`Invalid GitHub repo value: ${value}`);
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');

  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`Invalid GitHub repo owner/name: ${value}`);
  }

  return `${owner}/${repo}`;
}

export function buildHighlight({ reasonType, reason, useCase, repoName }) {
  const firstUsefulLine =
    [...reason.split(/\r?\n/), ...useCase.split(/\r?\n/)]
      .map(stripInlineMarkdown)
      .find(Boolean) || `${repoName} 值得追蹤`;

  return ensureSentence(truncateGraphemes(`${reasonType}：${firstUsefulLine}`, 92));
}

function stripInlineMarkdown(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateGraphemes(value, maxLength) {
  const chars = Array.from(value);
  if (chars.length <= maxLength) return value;
  return `${chars.slice(0, maxLength - 1).join('')}…`;
}

function ensureSentence(value) {
  if (/[。.!?！？…]$/.test(value)) return value;
  return `${value}。`;
}

function toBranchSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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
