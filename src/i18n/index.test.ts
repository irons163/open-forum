import { describe, expect, it } from 'vitest';
import { baseUrl } from '../lib/site';
import {
  categoryLabel,
  getLocaleFromUrl,
  giscusLang,
  htmlLang,
  localePath,
  ogLocale,
  switchLocalePath,
  t,
} from './index';

function siteUrl(path: string) {
  const root = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return new URL(`https://example.com${root}${path}`);
}

describe('i18n helpers', () => {
  it('detects locale from the URL path', () => {
    expect(getLocaleFromUrl(siteUrl('/'))).toBe('zh-Hant');
    expect(getLocaleFromUrl(siteUrl('/rankings/'))).toBe('zh-Hant');
    expect(getLocaleFromUrl(siteUrl('/en/'))).toBe('en');
    expect(getLocaleFromUrl(siteUrl('/en/rankings/'))).toBe('en');
  });

  it('builds localized paths with the site base', () => {
    expect(localePath('zh-Hant')).toBe(baseUrl);
    expect(localePath('zh-Hant', 'rankings')).toBe(`${baseUrl}rankings/`);
    expect(localePath('en')).toBe(`${baseUrl}en/`);
    expect(localePath('en', 'projects/foo')).toBe(`${baseUrl}en/projects/foo/`);
  });

  it('switches locale while keeping the rest of the path', () => {
    const zhRankings = siteUrl('/rankings/?sort=stars');
    const enHome = siteUrl('/en/');

    expect(switchLocalePath(zhRankings, 'en')).toBe(`${baseUrl}en/rankings/?sort=stars`);
    expect(switchLocalePath(enHome, 'zh-Hant')).toBe(baseUrl);
  });

  it('interpolates translation variables', () => {
    expect(t('en', 'search.count', { visible: 2, total: 10 })).toBe('Showing 2 / 10');
    expect(t('zh-Hant', 'fmt.updatedDays', { days: 3 })).toBe('3 天前更新');
  });

  it('maps category labels and locale metadata', () => {
    expect(categoryLabel('zh-Hant', '前端')).toBe('前端');
    expect(categoryLabel('en', '前端')).toBe('Frontend');
    expect(categoryLabel('en', '未知')).toBe('未知');
    expect(htmlLang('en')).toBe('en');
    expect(ogLocale('zh-Hant')).toBe('zh_Hant_TW');
    expect(giscusLang('en')).toBe('en');
  });
});
