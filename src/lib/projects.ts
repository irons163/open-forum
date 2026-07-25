import rawProjects from '../data/projects.generated.json';
import rawEditorialNotes from '../data/editorial-notes.json';
import rawWeeklyBrief from '../data/weekly-brief.json';

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
  syncedAt: string;
  avatarUrl: string;
};

const typedProjects = rawProjects as Project[];
const editorialNotes = rawEditorialNotes as {
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
export const weeklyBrief = rawWeeklyBrief as {
  weekLabel: string;
  headline: string;
  summary: string;
  signals: Array<{
    label: string;
    text: string;
  }>;
};
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

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return `${value}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function relativeDays(value: string) {
  const diff = daysSince(value);

  if (diff === 0) {
    return '今天有更新';
  }

  if (diff === 1) {
    return '1 天前更新';
  }

  return `${diff} 天前更新`;
}

export function formatMomentum(project: Pick<Project, 'historyDays' | 'delta1d' | 'delta7d' | 'delta30d'>) {
  if (project.historyDays < 7) {
    return '剛開始追蹤';
  }

  if (project.delta7d > 0) {
    return `7d +${formatCompactNumber(project.delta7d)}`;
  }

  if (project.delta1d > 0) {
    return `1d +${formatCompactNumber(project.delta1d)}`;
  }

  if (project.delta30d > 0) {
    return `30d +${formatCompactNumber(project.delta30d)}`;
  }

  return '暫時持平';
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

export function buildTrendState(project: Pick<Project, 'historyDays' | 'delta1d' | 'delta7d' | 'delta30d' | 'growthRate7d' | 'lastPushedAt'>) {
  const inactiveDays = daysSince(project.lastPushedAt);

  if (project.historyDays < 7) {
    return {
      label: '觀察中',
      tone: 'tracking',
      description: '資料還在累積，先建立基準線。',
    };
  }

  if (project.delta7d >= 250 || project.growthRate7d >= 4) {
    return {
      label: '強勢上升',
      tone: 'surging',
      description: '近期增星明顯，值得放在榜單前段。',
    };
  }

  if (project.delta7d >= 50 || project.delta1d >= 10 || project.growthRate7d >= 1.2) {
    return {
      label: '正在升溫',
      tone: 'rising',
      description: '已經出現穩定動能，適合持續觀察。',
    };
  }

  if (project.delta30d > 0 && inactiveDays <= 14) {
    return {
      label: '穩定活躍',
      tone: 'steady',
      description: '不是爆衝型，但更新和增長都穩定。',
    };
  }

  if (inactiveDays > 14) {
    return {
      label: '熱度放緩',
      tone: 'cooling',
      description: '近期更新放慢，適合放到次級觀察區。',
    };
  }

  return {
    label: '持續觀察',
    tone: 'steady',
    description: '目前沒有明顯波峰，但仍保持活躍。',
  };
}

export function discoveryScore(project: Pick<Project, 'stars' | 'trendScore' | 'lastPushedAt'>) {
  const freshnessBoost = Math.max(1, 31 - daysSince(project.lastPushedAt));
  return Number((project.trendScore / Math.sqrt(Math.max(1, project.stars)) + freshnessBoost).toFixed(2));
}
