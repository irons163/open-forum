import type { Project } from './projects';

/**
 * Repository descriptions come from the GitHub API, so a `</script>` inside one
 * would otherwise break out of the JSON-LD block. Escaping `<` is the standard
 * mitigation and stays valid JSON.
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildWebSiteSchema(siteUrl: string, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url: siteUrl,
    inLanguage: 'zh-Hant',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildProjectSchema(project: Project, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.fullName,
    description: project.description,
    url: pageUrl,
    codeRepository: project.repoUrl,
    programmingLanguage: project.language ?? undefined,
    license: project.license ?? undefined,
    keywords: project.topics.length ? project.topics.join(', ') : undefined,
    author: {
      '@type': 'Organization',
      name: project.owner,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: project.stars,
    },
  };
}

export function buildBreadcrumbSchema(trail: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: step.url,
    })),
  };
}

export function buildRankingSchema(
  projectList: Project[],
  buildUrl: (project: Project) => string,
  limit = 20,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '開源專案熱度榜',
    numberOfItems: Math.min(projectList.length, limit),
    itemListElement: projectList.slice(0, limit).map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: project.fullName,
      url: buildUrl(project),
    })),
  };
}
