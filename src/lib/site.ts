export const baseUrl = import.meta.env.BASE_URL;

const repoFromActions = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : '';

export const siteRepoUrl = import.meta.env.PUBLIC_SITE_REPO || repoFromActions;
export const discussionsUrl =
  import.meta.env.PUBLIC_DISCUSSIONS_URL || (siteRepoUrl ? `${siteRepoUrl}/discussions` : '');
export const recommendIssueUrl = siteRepoUrl
  ? `${siteRepoUrl}/issues/new?template=recommend-project.yml`
  : '';
