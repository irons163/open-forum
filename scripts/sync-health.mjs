export const staleThresholdDays = 2;

export function staleDays(fetchedAt, now) {
  if (!fetchedAt) {
    return 0;
  }

  const dayInMs = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.floor((new Date(now).getTime() - new Date(fetchedAt).getTime()) / dayInMs));
}

export function findPreviousProject(projectList, seedName) {
  const wanted = seedName.toLowerCase();

  return projectList.find((project) => project.fullName.toLowerCase() === wanted) ?? null;
}

export function collectStaleProjects(projectList, now, threshold = staleThresholdDays) {
  return projectList.filter((project) => staleDays(project.fetchedAt, now) >= threshold);
}

/**
 * A failed fetch used to scroll past in the log while the site kept serving the
 * last known numbers. Format a job summary that makes the problem impossible to miss.
 */
export function buildHealthSummary({ failures, archived, stale, threshold = staleThresholdDays }) {
  const lines = ['## 資料同步健康度', ''];

  if (!failures.length && !archived.length && !stale.length) {
    lines.push('所有追蹤中的 repo 都成功更新。');
    return `${lines.join('\n')}\n`;
  }

  if (failures.length) {
    lines.push('### 抓取失敗', '', '| repo | 處理方式 | 原因 |', '| --- | --- | --- |');
    for (const failure of failures) {
      const detail = failure.keptStaleData ? '沿用舊資料' : '未收錄';
      lines.push(
        `| \`${failure.repo}\` | ${detail} | ${failure.reason.replace(/\|/g, '\\|').slice(0, 160)} |`,
      );
    }
    lines.push('');
  }

  if (archived.length) {
    lines.push('### 已在 GitHub 封存', '');
    for (const project of archived) {
      lines.push(`- \`${project.fullName}\``);
    }
    lines.push('');
  }

  if (stale.length) {
    lines.push(`### 超過 ${threshold} 天沒有成功更新`, '');
    for (const project of stale) {
      lines.push(`- \`${project.fullName}\`（最後成功：${project.fetchedAt ?? '未知'}）`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
