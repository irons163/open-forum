const site = import.meta.env.SITE;
const baseUrl = import.meta.env.BASE_URL;

function buildSitemapUrl() {
  if (!site) {
    return 'https://example.com/sitemap.xml';
  }

  return new URL('sitemap.xml', new URL(baseUrl, site)).toString();
}

export const prerender = true;

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${buildSitemapUrl()}`,
  ].join('\n');

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
