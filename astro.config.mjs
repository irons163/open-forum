// @ts-check
import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repo = ''] = repository.split('/');
const isUserSite = owner && repo === `${owner}.github.io`;
const site = process.env.SITE_URL ?? (owner ? `https://${owner}.github.io` : 'https://example.com');
const base = process.env.BASE_PATH ?? (repo && !isUserSite ? `/${repo}/` : '/');

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
});
