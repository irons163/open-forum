import { describe, expect, it } from 'vitest';
import {
  getGiscusTheme,
  getOppositeTheme,
  getThemeColor,
  isThemeName,
  resolveThemePreference,
  themeColors,
  themeStorageKey,
} from './theme';

describe('theme helpers', () => {
  it('recognizes supported theme names', () => {
    expect(isThemeName('light')).toBe(true);
    expect(isThemeName('dark')).toBe(true);
    expect(isThemeName('system')).toBe(false);
    expect(isThemeName(null)).toBe(false);
  });

  it('resolves stored preferences before system preference', () => {
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
    expect(resolveThemePreference('', true)).toBe('dark');
    expect(resolveThemePreference('', false)).toBe('light');
  });

  it('maps themes to their opposite state', () => {
    expect(getOppositeTheme('light')).toBe('dark');
    expect(getOppositeTheme('dark')).toBe('light');
  });

  it('exposes stable browser chrome colors', () => {
    expect(themeStorageKey).toBe('open-forum-theme');
    expect(themeColors.light).toBe('#f6f4f0');
    expect(themeColors.dark).toBe('#0b0e13');
    expect(getThemeColor('light')).toBe('#f6f4f0');
    expect(getThemeColor('dark')).toBe('#0b0e13');
  });

  it('maps site themes to giscus themes', () => {
    expect(getGiscusTheme('light')).toBe('light');
    expect(getGiscusTheme('dark')).toBe('dark_dimmed');
  });
});
