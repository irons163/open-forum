import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const args = process.argv.slice(2);
const repoArg = args.find((arg) => !arg.startsWith('--'));
const categoryArg = args.find((arg, index) => index > 0 && !arg.startsWith('--')) || 'General';
const shouldWrite = args.includes('--write');

if (!repoArg) {
  console.error('Usage: npm run setup:giscus -- <owner>/<repo> [category-name] [--write]');
  process.exit(1);
}

if (!token) {
  console.error('Missing GITHUB_TOKEN or GH_TOKEN. Provide a GitHub token before running this script.');
  process.exit(1);
}

const [owner, name] = repoArg.split('/');

if (!owner || !name) {
  console.error('Repository must be in the format <owner>/<repo>.');
  process.exit(1);
}

const query = `
  query GetDiscussionConfig($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      hasDiscussionsEnabled
      discussionCategories(first: 20) {
        nodes {
          id
          name
          emoji
        }
      }
    }
  }
`;

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'open-forum-giscus-setup',
  },
  body: JSON.stringify({
    query,
    variables: { owner, name },
  }),
});

const payload = await response.json();

if (!response.ok || payload.errors?.length) {
  console.error(JSON.stringify(payload.errors || payload, null, 2));
  process.exit(1);
}

const repository = payload.data?.repository;

if (!repository) {
  console.error(`Repository ${repoArg} was not found.`);
  process.exit(1);
}

if (!repository.hasDiscussionsEnabled) {
  console.error(`Repository ${repoArg} does not have GitHub Discussions enabled yet.`);
  process.exit(1);
}

const availableCategories = repository.discussionCategories?.nodes || [];
const matchedCategory =
  availableCategories.find((category) => category.name === categoryArg) || availableCategories[0];

if (!matchedCategory) {
  console.error(`Repository ${repoArg} has no discussion categories yet.`);
  process.exit(1);
}

const lines = [
  `PUBLIC_SITE_REPO=https://github.com/${repoArg}`,
  `PUBLIC_DISCUSSIONS_URL=https://github.com/${repoArg}/discussions`,
  `PUBLIC_GISCUS_REPO=${repoArg}`,
  `PUBLIC_GISCUS_REPO_ID=${repository.id}`,
  `PUBLIC_GISCUS_CATEGORY=${matchedCategory.name}`,
  `PUBLIC_GISCUS_CATEGORY_ID=${matchedCategory.id}`,
];

console.log(lines.join('\n'));

if (shouldWrite) {
  const targetFile = new URL('../.env.local', import.meta.url);
  const existingContent = await readFile(targetFile, 'utf8').catch(() => '');
  const managedKeys = new Set(lines.map((line) => line.split('=')[0]));
  const preservedLines = existingContent
    .split('\n')
    .filter((line) => line.trim() && !managedKeys.has(line.split('=')[0]));

  const output = [...preservedLines, ...lines].join('\n');
  await writeFile(targetFile, `${output}\n`);
  console.error(`Wrote giscus configuration to ${targetFile.pathname}`);
}

if (availableCategories.length > 1) {
  console.error(
    `Available categories: ${availableCategories
      .map((category) => `${category.name}${category.name === matchedCategory.name ? ' (selected)' : ''}`)
      .join(', ')}`,
  );
}
