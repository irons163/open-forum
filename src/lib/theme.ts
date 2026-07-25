export type ThemeName = 'light' | 'dark';

export const themeStorageKey = 'open-forum-theme';

export const themeColors = {
  light: '#f8f6f2',
  dark: '#0e1117',
} as const satisfies Record<ThemeName, string>;

export const giscusThemes = {
  light: 'light',
  dark: 'dark_dimmed',
} as const satisfies Record<ThemeName, string>;

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'light' || value === 'dark';
}

export function resolveThemePreference(storedTheme: unknown, prefersDark: boolean): ThemeName {
  if (isThemeName(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? 'dark' : 'light';
}

export function getOppositeTheme(theme: ThemeName): ThemeName {
  return theme === 'dark' ? 'light' : 'dark';
}

export function getThemeColor(theme: ThemeName) {
  return themeColors[theme];
}

export function getGiscusTheme(theme: ThemeName) {
  return giscusThemes[theme];
}
