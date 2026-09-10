import { baseUrl } from '../lib/site';
import { defaultLocale, isLocale, type Locale } from './locales';
import { ui, type UiKey } from './ui';

export { defaultLocale, isLocale, locales, type Locale } from './locales';
export type { UiKey } from './ui';

const allCategoryToken = '__all__';

export function getLocaleFromUrl(url: URL): Locale {
  const pathname = stripBasePath(url.pathname);
  const first = pathname.split('/').filter(Boolean)[0];

  if (first === 'en') {
    return 'en';
  }

  return defaultLocale;
}

export function stripBasePath(pathname: string) {
  const basePath = baseUrl.replace(/\/$/, '') || '';

  if (!basePath || basePath === '') {
    return pathname;
  }

  if (pathname === basePath || pathname === `${basePath}/`) {
    return '/';
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || '/';
  }

  return pathname;
}

/** Build a localized site path. `path` is without leading slash, e.g. `rankings` or `projects/foo`. */
export function localePath(locale: Locale, path = '') {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = locale === defaultLocale ? '' : `${locale}/`;
  const suffix = clean ? `${clean}/` : '';

  return `${baseUrl}${prefix}${suffix}`;
}

/** Swap locale while preserving the rest of the path (and query/hash if present on the URL). */
export function switchLocalePath(url: URL, target: Locale) {
  let pathname = stripBasePath(url.pathname);
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'en' || (segments[0] && isLocale(segments[0]) && segments[0] !== defaultLocale)) {
    segments.shift();
  }

  const rest = segments.join('/');
  const nextPath = localePath(target, rest);
  const query = url.search || '';
  const hash = url.hash || '';

  return `${nextPath}${query}${hash}`;
}

export function t(locale: Locale, key: UiKey, vars?: Record<string, string | number>) {
  let message = ui[locale][key] ?? ui[defaultLocale][key] ?? key;

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
  }

  return message;
}

export function categoryLabel(locale: Locale, category: string) {
  const key = `category.${category}` as UiKey;

  if (key in ui[locale]) {
    return t(locale, key);
  }

  return category;
}

export function htmlLang(locale: Locale) {
  return locale === 'en' ? 'en' : 'zh-Hant';
}

export function ogLocale(locale: Locale) {
  return locale === 'en' ? 'en_US' : 'zh_Hant_TW';
}

export function giscusLang(locale: Locale) {
  return locale === 'en' ? 'en' : 'zh-TW';
}

export function dateLocale(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'zh-TW';
}

export { allCategoryToken };
