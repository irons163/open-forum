export type ThemeName = 'light' | 'dark';

export const themeStorageKey = 'open-forum-theme';

export const themeColors = {
  light: '#f57f17',
  dark: '#15110d',
} as const satisfies Record<ThemeName, string>;

export const giscusThemes = {
  light: 'light_protanopia',
  dark: 'dark_protanopia',
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
