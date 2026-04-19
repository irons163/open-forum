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
export const breakoutProjects = [...projects]
  .sort((a, b) => b.growthRate7d - a.growthRate7d || b.delta7d - a.delta7d || b.trendScore - a.trendScore)
  .slice(0, 6);
export const scaleLeaderProjects = [...projects]
  .sort((a, b) => b.stars - a.stars || b.trendScore - a.trendScore)
  .slice(0, 6);
export const discoveryProjects = [...projects]
  .sort((a, b) => discoveryScore(b) - discoveryScore(a) || b.trendScore - a.trendScore)
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
