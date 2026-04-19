import { projects } from '../lib/projects';

const site = import.meta.env.SITE;
const baseUrl = import.meta.env.BASE_URL;

function absoluteUrl(pathname: string) {
  if (!site) {
    return `https://example.com${pathname}`;
  }

  return new URL(pathname, site).toString();
}

export const prerender = true;

export function GET() {
  const staticPages = [
    { pathname: baseUrl, lastmod: new Date().toISOString() },
    { pathname: `${baseUrl}rankings/`, lastmod: new Date().toISOString() },
    { pathname: `${baseUrl}community/`, lastmod: new Date().toISOString() },
  ];

  const projectPages = projects.map((project) => ({
    pathname: `${baseUrl}projects/${project.slug}/`,
    lastmod: project.syncedAt,
  }));

  const urls = [...staticPages, ...projectPages]
    .map(
      (entry) => `<url>
  <loc>${absoluteUrl(entry.pathname)}</loc>
  <lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>
</url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
