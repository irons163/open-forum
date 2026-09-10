import rawProjects from '../data/projects.generated.json';
import rawEditorialNotes from '../data/editorial-notes.json';
import rawEditorialNotesEn from '../data/editorial-notes.en.json';
import rawWeeklyBrief from '../data/weekly-brief.json';
import rawWeeklyBriefEn from '../data/weekly-brief.en.json';
import { dateLocale, defaultLocale, t, type Locale } from '../i18n';

export type Project = {
  slug: string;
  name: string;
  owner: string;
  fullName: string;
  repoUrl: string;
  homepage: string | null;
  description: string;
  category: string;
  highlight: string;
  topics: string[];
  language: string | null;
  license: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  historyDays: number;
  delta1d: number;
  delta7d: number;
  delta30d: number;
  growthRate7d: number;
  starVelocity7d: number;
  trendScore: number;
  lastPushedAt: string;
  updatedAt: string;
  archived?: boolean;
  /** Last time GitHub actually answered for this repo, unlike the site-wide syncedAt. */
  fetchedAt?: string;
  syncedAt: string;
  avatarUrl: string;
};

const typedProjects = rawProjects as Project[];

type EditorialNotes = {
  featured: Array<{
    repo: string;
    kicker: string;
    angle: string;
    summary: string;
    whyNow: string;
  }>;
  watchlist: Array<{
    title: string;
    description: string;
  }>;
};

type WeeklyBrief = {
  weekLabel: string;
  headline: string;
  summary: string;
  signals: Array<{
    label: string;
    text: string;
  }>;
};

const editorialNotesByLocale: Record<Locale, EditorialNotes> = {
  'zh-Hant': rawEditorialNotes as EditorialNotes,
  en: rawEditorialNotesEn as EditorialNotes,
};

const weeklyBriefByLocale: Record<Locale, WeeklyBrief> = {
  'zh-Hant': rawWeeklyBrief as WeeklyBrief,
  en: rawWeeklyBriefEn as WeeklyBrief,
};

const editorialNotes = editorialNotesByLocale[defaultLocale];
export const weeklyBrief = weeklyBriefByLocale[defaultLocale];

export function getWeeklyBrief(locale: Locale = defaultLocale) {
  return weeklyBriefByLocale[locale];
}

export function getEditorialNotes(locale: Locale = defaultLocale) {
  return editorialNotesByLocale[locale];
}

const dayInMs = 1000 * 60 * 60 * 24;

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / dayInMs));
}

export type EditorialEntry = (typeof editorialNotes.featured)[number];

export function sortByTrendScore(projectList: Project[]) {
  return [...projectList].sort((a, b) => b.trendScore - a.trendScore);
}

export function getTrendingProjects(projectList: Project[], limit = 6) {
  return [...projectList]
    .sort((a, b) => b.delta7d - a.delta7d || b.trendScore - a.trendScore)
    .slice(0, limit);
}

export function getBreakoutProjects(projectList: Project[], limit = 6) {
  return [...projectList]
    .sort((a, b) => b.growthRate7d - a.growthRate7d || b.delta7d - a.delta7d || b.trendScore - a.trendScore)
    .slice(0, limit);
}

export function getScaleLeaderProjects(projectList: Project[], limit = 6) {
  return [...projectList]
    .sort((a, b) => b.stars - a.stars || b.trendScore - a.trendScore)
    .slice(0, limit);
}

export function getDiscoveryProjects(projectList: Project[], limit = 6) {
  return [...projectList]
    .sort((a, b) => discoveryScore(b) - discoveryScore(a) || b.trendScore - a.trendScore)
    .slice(0, limit);
}

export function getRecentlyUpdatedProjects(projectList: Project[], limit = 5) {
  return [...projectList]
    .sort((a, b) => +new Date(b.lastPushedAt) - +new Date(a.lastPushedAt))
    .slice(0, limit);
}

export function getLastSyncedAt(projectList: Project[], fallback = new Date().toISOString()) {
  return projectList[0]?.syncedAt ?? fallback;
}

export function buildCategorySummaries(projectList: Project[], categoryList: string[]) {
  return categoryList.map((category) => {
    const categoryProjects = projectList.filter((project) => project.category === category);

    return {
      name: category,
      count: categoryProjects.length,
      stars: categoryProjects.reduce((sum, project) => sum + project.stars, 0),
      activeCount: categoryProjects.filter((project) => daysSince(project.lastPushedAt) <= 30).length,
      leadProject: categoryProjects[0] ?? null,
    };
  });
}

export function buildEditorialFeaturedProjects(entries: EditorialEntry[], projectList: Project[]) {
  return entries
    .map((entry) => {
      const project = projectList.find((candidate) => candidate.fullName === entry.repo);

      if (!project) {
        return null;
      }

      return {
        ...entry,
        project,
      };
    })
    .filter(Boolean) as Array<EditorialEntry & { project: Project }>;
}

export const projects = sortByTrendScore(typedProjects);
export const categories = Array.from(new Set(projects.map((project) => project.category)));
export const featuredProjects = projects.slice(0, 6);
export const trendingProjects = getTrendingProjects(projects);
export const breakoutProjects = getBreakoutProjects(projects);
export const scaleLeaderProjects = getScaleLeaderProjects(projects);
export const discoveryProjects = getDiscoveryProjects(projects);
export const recentlyUpdatedProjects = getRecentlyUpdatedProjects(projects);
export const totalStars = projects.reduce((sum, project) => sum + project.stars, 0);
export const activeProjects = projects.filter((project) => daysSince(project.lastPushedAt) <= 30).length;
export const lastSyncedAt = getLastSyncedAt(projects);
export const categorySummaries = buildCategorySummaries(projects, categories);
export const editorialFeaturedProjects = buildEditorialFeaturedProjects(editorialNotes.featured, projects);
export const editorialWatchlist = editorialNotes.watchlist;

export function getEditorialFeaturedProjects(locale: Locale = defaultLocale) {
  return buildEditorialFeaturedProjects(getEditorialNotes(locale).featured, projects);
}

export function getEditorialWatchlist(locale: Locale = defaultLocale) {
  return getEditorialNotes(locale).watchlist;
}

/** Prefer curated Chinese highlight; on English pages fall back to the GitHub description. */
export function projectBlurb(project: Pick<Project, 'highlight' | 'description'>, locale: Locale = defaultLocale) {
  if (locale === 'en') {
    return project.description || project.highlight;
  }

  return project.highlight || project.description;
}

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return `${value}`;
}

export function formatDate(value: string, locale: Locale = defaultLocale) {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function relativeDays(value: string, locale: Locale = defaultLocale) {
  const diff = daysSince(value);

  if (diff === 0) {
    return t(locale, 'fmt.updatedToday');
  }

  if (diff === 1) {
    return t(locale, 'fmt.updatedOneDay');
  }

  return t(locale, 'fmt.updatedDays', { days: diff });
}

export function formatMomentum(
  project: Pick<Project, 'historyDays' | 'delta1d' | 'delta7d' | 'delta30d'>,
  locale: Locale = defaultLocale,
) {
  if (project.historyDays < 7) {
    return t(locale, 'fmt.trackingStart');
  }

  if (project.delta7d > 0) {
    return t(locale, 'fmt.growth7d', { value: formatCompactNumber(project.delta7d) });
  }

  if (project.delta1d > 0) {
    return t(locale, 'fmt.growth1d', { value: formatCompactNumber(project.delta1d) });
  }

  if (project.delta30d > 0) {
    return t(locale, 'fmt.growth30d', { value: formatCompactNumber(project.delta30d) });
  }

  return t(locale, 'fmt.flat');
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

/**
 * The weekly brief is hand-written, so it goes stale while the metrics keep
 * updating. Expose its age so the UI can stop calling old notes "this week".
 */
export function getBriefFreshness(weekLabel: string) {
  const parsed = new Date(weekLabel.replace(/\s*\/\s*/g, '-'));

  if (Number.isNaN(parsed.getTime())) {
    return { ageDays: null, isCurrent: false };
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / dayInMs));

  return { ageDays, isCurrent: ageDays <= 14 };
}

export function formatDelta(value: number) {
  if (value > 0) {
    return `+${formatCompactNumber(value)}`;
  }

  if (value < 0) {
    return `-${formatCompactNumber(Math.abs(value))}`;
  }

  return '0';
}

export function buildTrendState(
  project: Pick<Project, 'historyDays' | 'delta1d' | 'delta7d' | 'delta30d' | 'growthRate7d' | 'lastPushedAt' | 'archived'>,
  locale: Locale = defaultLocale,
) {
  const inactiveDays = daysSince(project.lastPushedAt);

  if (project.archived) {
    return {
      label: t(locale, 'trend.archived.label'),
      tone: 'archived',
      description: t(locale, 'trend.archived.description'),
    };
  }

  if (project.historyDays < 7) {
    return {
      label: t(locale, 'trend.tracking.label'),
      tone: 'tracking',
      description: t(locale, 'trend.tracking.description'),
    };
  }

  if (project.delta7d >= 250 || project.growthRate7d >= 4) {
    return {
      label: t(locale, 'trend.surging.label'),
      tone: 'surging',
      description: t(locale, 'trend.surging.description'),
    };
  }

  if (project.delta7d >= 50 || project.delta1d >= 10 || project.growthRate7d >= 1.2) {
    return {
      label: t(locale, 'trend.rising.label'),
      tone: 'rising',
      description: t(locale, 'trend.rising.description'),
    };
  }

  if (project.delta30d > 0 && inactiveDays <= 14) {
    return {
      label: t(locale, 'trend.steady.label'),
      tone: 'steady',
      description: t(locale, 'trend.steady.description'),
    };
  }

  if (inactiveDays > 14) {
    return {
      label: t(locale, 'trend.cooling.label'),
      tone: 'cooling',
      description: t(locale, 'trend.cooling.description'),
    };
  }

  return {
    label: t(locale, 'trend.watch.label'),
    tone: 'steady',
    description: t(locale, 'trend.watch.description'),
  };
}

export const staleThresholdDays = 2;

export type DataHealth = {
  status: 'ok' | 'stale' | 'archived';
  staleDays: number;
  label: string | null;
  description: string | null;
};

/**
 * A repo that was deleted, went private or got archived keeps rendering its last
 * known numbers, which silently looks like live data. Derive that state from
 * fetchedAt so the page can say so instead of quietly lying.
 */
export function getDataHealth(
  project: Pick<Project, 'archived' | 'fetchedAt'>,
  locale: Locale = defaultLocale,
): DataHealth {
  const staleDays = project.fetchedAt ? daysSince(project.fetchedAt) : 0;

  if (project.archived) {
    return {
      status: 'archived',
      staleDays,
      label: t(locale, 'health.archived.label'),
      description: t(locale, 'health.archived.description'),
    };
  }

  if (staleDays >= staleThresholdDays) {
    return {
      status: 'stale',
      staleDays,
      label: t(locale, 'health.stale.label', { days: staleDays }),
      description: t(locale, 'health.stale.description', { days: staleDays }),
    };
  }

  return { status: 'ok', staleDays, label: null, description: null };
}

export const unhealthyProjects = projects.filter(
  (project) => getDataHealth(project).status !== 'ok',
);

export function discoveryScore(project: Pick<Project, 'stars' | 'trendScore' | 'lastPushedAt'>) {
  const freshnessBoost = Math.max(1, 31 - daysSince(project.lastPushedAt));
  return Number((project.trendScore / Math.sqrt(Math.max(1, project.stars)) + freshnessBoost).toFixed(2));
}
