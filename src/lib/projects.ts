import rawProjects from '../data/projects.generated.json';

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
  delta1d: number;
  delta7d: number;
  trendScore: number;
  lastPushedAt: string;
  updatedAt: string;
  syncedAt: string;
  avatarUrl: string;
};

const typedProjects = rawProjects as Project[];
const dayInMs = 1000 * 60 * 60 * 24;

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / dayInMs));
}

export const projects = [...typedProjects].sort((a, b) => b.trendScore - a.trendScore);
export const categories = Array.from(new Set(projects.map((project) => project.category)));
export const featuredProjects = projects.slice(0, 6);
export const trendingProjects = [...projects]
  .sort((a, b) => b.delta7d - a.delta7d || b.trendScore - a.trendScore)
  .slice(0, 6);
export const recentlyUpdatedProjects = [...projects]
  .sort((a, b) => +new Date(b.lastPushedAt) - +new Date(a.lastPushedAt))
  .slice(0, 5);
export const totalStars = projects.reduce((sum, project) => sum + project.stars, 0);
export const activeProjects = projects.filter((project) => daysSince(project.lastPushedAt) <= 30).length;
export const lastSyncedAt = projects[0]?.syncedAt ?? new Date().toISOString();
export const categorySummaries = categories.map((category) => {
  const categoryProjects = projects.filter((project) => project.category === category);

  return {
    name: category,
    count: categoryProjects.length,
    stars: categoryProjects.reduce((sum, project) => sum + project.stars, 0),
    activeCount: categoryProjects.filter((project) => daysSince(project.lastPushedAt) <= 30).length,
    leadProject: categoryProjects[0] ?? null,
  };
});

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

export function formatMomentum(project: Pick<Project, 'delta1d' | 'delta7d'>) {
  if (project.delta7d > 0) {
    return `7d +${formatCompactNumber(project.delta7d)}`;
  }

  if (project.delta1d > 0) {
    return `1d +${formatCompactNumber(project.delta1d)}`;
  }

  return '剛開始追蹤';
}
