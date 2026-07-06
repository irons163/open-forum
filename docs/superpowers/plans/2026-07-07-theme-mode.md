# Theme Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add light/dark theme support that follows system preference, can be toggled from the header, persists the visitor's choice, and keeps giscus in sync.

**Architecture:** Keep the site static and dependency-free. Put shared theme constants and pure mapping helpers in `src/lib/theme.ts`, use `Layout.astro` for early document theme bootstrap, use `SiteHeader.astro` for the interactive toggle, keep visual values in `src/styles/global.css`, and let `GiscusComments.astro` create/configure giscus with the current page theme.

**Tech Stack:** Astro 6, TypeScript, Vitest, CSS custom properties, browser `localStorage`, `matchMedia`, and giscus `postMessage` config updates.

---

## File Structure

- Create `src/lib/theme.ts`: shared theme names, storage key, browser chrome colors, giscus theme names, and pure helper functions.
- Create `src/lib/theme.test.ts`: unit coverage for theme validation, fallback resolution, opposite-theme mapping, browser chrome colors, and giscus theme names.
- Modify `src/layouts/Layout.astro`: import theme constants, set the default `data-theme`, update `theme-color`, and add an early inline bootstrap script.
- Modify `src/components/SiteHeader.astro`: add the header toggle button and a small inline controller script.
- Modify `src/components/GiscusComments.astro`: replace the static giscus script tag with a small loader that reads the current theme and synchronizes on theme changes.
- Modify `src/styles/global.css`: add dark tokens, replace theme-sensitive hard-coded colors with variables, style the toggle, and keep the header stable on mobile.

---

### Task 1: Theme Helper Module

**Files:**
- Create: `src/lib/theme.ts`
- Create: `src/lib/theme.test.ts`

- [ ] **Step 1: Write failing tests for theme helpers**

Create `src/lib/theme.test.ts`:

```ts
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
    expect(themeColors.light).toBe('#f57f17');
    expect(themeColors.dark).toBe('#15110d');
    expect(getThemeColor('light')).toBe('#f57f17');
    expect(getThemeColor('dark')).toBe('#15110d');
  });

  it('maps site themes to giscus themes', () => {
    expect(getGiscusTheme('light')).toBe('light_protanopia');
    expect(getGiscusTheme('dark')).toBe('dark_protanopia');
  });
});
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run:

```bash
npm run test -- src/lib/theme.test.ts
```

Expected: fail because `src/lib/theme.ts` does not exist.

- [ ] **Step 3: Implement the helper module**

Create `src/lib/theme.ts`:

```ts
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
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm run test -- src/lib/theme.test.ts
```

Expected: pass with 5 tests.

---

### Task 2: Early Theme Bootstrap

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Import theme constants**

Add this import beside the existing `baseUrl` import:

```ts
import { themeColors, themeStorageKey } from '../lib/theme';
```

- [ ] **Step 2: Set a default root theme and use shared theme color**

Change:

```astro
<html lang="zh-Hant">
```

to:

```astro
<html lang="zh-Hant" data-theme="light">
```

Change:

```astro
<meta name="theme-color" content="#f57f17" />
```

to:

```astro
<meta name="theme-color" content={themeColors.light} />
```

- [ ] **Step 3: Add the early inline bootstrap in the document head**

Insert this script immediately after the `theme-color` meta tag:

```astro
    <script is:inline define:vars={{ themeStorageKey, themeColors }}>
      (() => {
        const root = document.documentElement;
        const systemTheme = () =>
          window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const storedTheme = (() => {
          try {
            const value = window.localStorage?.getItem(themeStorageKey);
            return value === 'light' || value === 'dark' ? value : '';
          } catch {
            return '';
          }
        })();
        const theme = storedTheme || systemTheme();

        root.dataset.theme = theme;
        root.style.colorScheme = theme;

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', themeColors[theme]);
        }
      })();
    </script>
```

- [ ] **Step 4: Run Astro check**

Run:

```bash
npm run check
```

Expected: 0 errors, 0 warnings, 0 hints.

---

### Task 3: Header Theme Toggle

**Files:**
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Import theme constants in the header**

Add this import near the existing imports:

```ts
import { themeColors, themeStorageKey } from '../lib/theme';
```

- [ ] **Step 2: Add the toggle button to the header links**

Inside `<div class="header-links">`, after the optional Repo link, add:

```astro
      <button
        class="theme-toggle"
        type="button"
        data-theme-toggle
        aria-label="切換到深色模式"
        aria-pressed="false"
        title="切換到深色模式"
      >
        <span class="theme-toggle-icon" data-theme-toggle-icon aria-hidden="true">☀</span>
        <span class="visually-hidden" data-theme-toggle-label>切換到深色模式</span>
      </button>
```

- [ ] **Step 3: Add the header controller script**

Add this script after `</header>`:

```astro
<script is:inline define:vars={{ themeStorageKey, themeColors }}>
  (() => {
    const button = document.querySelector('[data-theme-toggle]');
    if (!button) return;

    const root = document.documentElement;
    const icon = button.querySelector('[data-theme-toggle-icon]');
    const label = button.querySelector('[data-theme-toggle-label]');
    const meta = document.querySelector('meta[name="theme-color"]');

    const getTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

    const updateButton = (theme) => {
      const nextLabel = theme === 'dark' ? '切換到淺色模式' : '切換到深色模式';

      button.setAttribute('aria-label', nextLabel);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute('title', nextLabel);

      if (icon) {
        icon.textContent = theme === 'dark' ? '☾' : '☀';
      }

      if (label) {
        label.textContent = nextLabel;
      }
    };

    const setTheme = (theme, persist) => {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;

      if (meta) {
        meta.setAttribute('content', themeColors[theme]);
      }

      if (persist) {
        try {
          window.localStorage?.setItem(themeStorageKey, theme);
        } catch {
          // Storage can be unavailable in strict browser contexts.
        }
      }

      updateButton(theme);
      window.dispatchEvent(new CustomEvent('open-forum-theme-change', { detail: { theme } }));
    };

    updateButton(getTheme());

    button.addEventListener('click', () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
    });
  })();
</script>
```

- [ ] **Step 4: Add accessible toggle CSS**

Add these rules in `src/styles/global.css` near the other header/button rules:

```css
.theme-toggle {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--control-bg);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.theme-toggle:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

.theme-toggle-icon {
  line-height: 1;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 5: Run Astro check**

Run:

```bash
npm run check
```

Expected: 0 errors, 0 warnings, 0 hints.

---

### Task 4: Light and Dark CSS Tokens

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Extend light theme tokens**

Replace the current `:root` color block with this expanded block while preserving radius, width, and font tokens:

```css
:root {
  color-scheme: light;
  --bg: #fff9f1;
  --bg-soft: #fff2da;
  --panel: rgba(255, 255, 255, 0.82);
  --panel-strong: rgba(255, 255, 255, 0.94);
  --line: rgba(52, 37, 17, 0.12);
  --text: #24180b;
  --text-soft: #6f6252;
  --accent: #ef6c00;
  --accent-strong: #c25500;
  --accent-mint: #0f9d8a;
  --focus-ring: rgba(15, 157, 138, 0.35);
  --body-bg:
    radial-gradient(circle at top left, rgba(245, 127, 23, 0.22), transparent 35%),
    radial-gradient(circle at top right, rgba(15, 157, 138, 0.18), transparent 30%),
    linear-gradient(180deg, #fffaf4 0%, #fff3e1 40%, #f6efe5 100%);
  --grid-line: rgba(36, 24, 11, 0.03);
  --header-bg: rgba(255, 249, 241, 0.72);
  --header-border: rgba(52, 37, 17, 0.08);
  --control-bg: rgba(255, 255, 255, 0.84);
  --chip-bg: rgba(255, 255, 255, 0.55);
  --chip-strong-bg: rgba(255, 255, 255, 0.72);
  --ghost-bg: rgba(255, 255, 255, 0.7);
  --active-bg: linear-gradient(135deg, rgba(245, 127, 23, 0.18), rgba(15, 157, 138, 0.14));
  --active-border: rgba(239, 108, 0, 0.24);
  --button-shadow: 0 14px 30px rgba(239, 108, 0, 0.24);
  --panel-sheen: linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 35%);
  --announcement-bg: linear-gradient(135deg, rgba(185, 255, 227, 0.78), rgba(255, 249, 241, 0.78));
  --card-band-bg: radial-gradient(circle, rgba(239, 108, 0, 0.24), transparent 65%);
  --rank-number-bg: linear-gradient(135deg, rgba(239, 108, 0, 0.18), rgba(15, 157, 138, 0.18));
  --notice-border: rgba(239, 108, 0, 0.28);
  --trend-tracking-bg: rgba(73, 86, 102, 0.14);
  --trend-tracking-text: #425466;
  --trend-surging-bg: rgba(239, 108, 0, 0.14);
  --trend-surging-text: #b45309;
  --trend-rising-bg: rgba(15, 157, 138, 0.16);
  --trend-rising-text: #0f766e;
  --trend-steady-bg: rgba(70, 88, 156, 0.12);
  --trend-steady-text: #475569;
  --trend-cooling-bg: rgba(119, 82, 54, 0.14);
  --trend-cooling-text: #7c5a3a;
  --shadow: 0 28px 90px rgba(78, 43, 8, 0.12);
  --radius-xl: 28px;
  --radius-lg: 20px;
  --radius-md: 14px;
  --max-width: 1160px;
  --font-display: 'Space Grotesk', 'Noto Sans TC', sans-serif;
  --font-body: 'Noto Sans TC', sans-serif;
}
```

- [ ] **Step 2: Add dark theme token overrides**

Add this block immediately after `:root`:

```css
:root[data-theme='dark'] {
  color-scheme: dark;
  --bg: #15110d;
  --bg-soft: #211914;
  --panel: rgba(32, 25, 20, 0.84);
  --panel-strong: rgba(39, 31, 25, 0.94);
  --line: rgba(255, 233, 204, 0.14);
  --text: #fff7ec;
  --text-soft: #d5c3ae;
  --accent: #ff9d42;
  --accent-strong: #ffb36a;
  --accent-mint: #55d6c5;
  --focus-ring: rgba(85, 214, 197, 0.42);
  --body-bg:
    radial-gradient(circle at top left, rgba(239, 108, 0, 0.22), transparent 34%),
    radial-gradient(circle at top right, rgba(15, 157, 138, 0.18), transparent 32%),
    linear-gradient(180deg, #15110d 0%, #1f1712 44%, #100d0a 100%);
  --grid-line: rgba(255, 233, 204, 0.045);
  --header-bg: rgba(21, 17, 13, 0.78);
  --header-border: rgba(255, 233, 204, 0.12);
  --control-bg: rgba(39, 31, 25, 0.86);
  --chip-bg: rgba(255, 247, 236, 0.08);
  --chip-strong-bg: rgba(255, 247, 236, 0.11);
  --ghost-bg: rgba(255, 247, 236, 0.08);
  --active-bg: linear-gradient(135deg, rgba(255, 157, 66, 0.18), rgba(85, 214, 197, 0.13));
  --active-border: rgba(255, 157, 66, 0.32);
  --button-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
  --panel-sheen: linear-gradient(180deg, rgba(255, 247, 236, 0.07), transparent 38%);
  --announcement-bg: linear-gradient(135deg, rgba(85, 214, 197, 0.14), rgba(255, 157, 66, 0.1));
  --card-band-bg: radial-gradient(circle, rgba(255, 157, 66, 0.22), transparent 65%);
  --rank-number-bg: linear-gradient(135deg, rgba(255, 157, 66, 0.2), rgba(85, 214, 197, 0.16));
  --notice-border: rgba(255, 157, 66, 0.32);
  --trend-tracking-bg: rgba(148, 163, 184, 0.16);
  --trend-tracking-text: #d7e0ea;
  --trend-surging-bg: rgba(255, 157, 66, 0.18);
  --trend-surging-text: #ffd2a4;
  --trend-rising-bg: rgba(85, 214, 197, 0.18);
  --trend-rising-text: #b6fff4;
  --trend-steady-bg: rgba(125, 155, 255, 0.16);
  --trend-steady-text: #d7defe;
  --trend-cooling-bg: rgba(211, 178, 140, 0.17);
  --trend-cooling-text: #edd2b4;
  --shadow: 0 28px 90px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 3: Replace theme-sensitive hard-coded colors with tokens**

Apply these replacements in `src/styles/global.css`:

```css
body {
  background: var(--body-bg);
}

.page-backdrop {
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
}

.site-header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

.header-search-input,
.search-input {
  border: 1px solid var(--line);
  background: var(--control-bg);
  color: var(--text);
}

.nav-link,
.pill,
.tag,
.chip {
  background: var(--chip-bg);
}

.nav-link.is-active,
.filter-pills button[data-active='true'] {
  background: var(--active-bg);
  border-color: var(--active-border);
}

.button {
  box-shadow: var(--button-shadow);
}

.button.ghost {
  background: var(--ghost-bg);
}

.section-panel::after {
  background: var(--panel-sheen);
}

.announcement-strip {
  background:
    var(--announcement-bg),
    var(--panel);
}

.pill.subtle,
.tag {
  background: var(--chip-strong-bg);
}

.card-band {
  background: var(--card-band-bg);
}

.rank-number {
  background: var(--rank-number-bg);
}

.notice {
  border: 1px dashed var(--notice-border);
  background: var(--ghost-bg);
}

.site-footer {
  border-top: 1px solid var(--header-border);
  background: var(--header-bg);
}
```

- [ ] **Step 4: Replace trend badge hard-coded colors**

Change the five trend badge rules to:

```css
.trend-tracking {
  background: var(--trend-tracking-bg);
  color: var(--trend-tracking-text);
}

.trend-surging {
  background: var(--trend-surging-bg);
  color: var(--trend-surging-text);
}

.trend-rising {
  background: var(--trend-rising-bg);
  color: var(--trend-rising-text);
}

.trend-steady {
  background: var(--trend-steady-bg);
  color: var(--trend-steady-text);
}

.trend-cooling {
  background: var(--trend-cooling-bg);
  color: var(--trend-cooling-text);
}
```

- [ ] **Step 5: Run Astro check**

Run:

```bash
npm run check
```

Expected: 0 errors, 0 warnings, 0 hints.

---

### Task 5: Giscus Theme Synchronization

**Files:**
- Modify: `src/components/GiscusComments.astro`

- [ ] **Step 1: Import giscus theme constants**

Add this import in the frontmatter:

```ts
import { giscusThemes } from '../lib/theme';
```

- [ ] **Step 2: Replace the static giscus script with a data-driven host**

Replace the current `<div class="giscus-host" data-giscus-host>` block and nested external `<script>` with:

```astro
        <div
          class="giscus-host"
          data-giscus-host
          data-repo={repo}
          data-repo-id={repoId}
          data-category={category}
          data-category-id={categoryId}
          data-mapping={mapping}
          data-term={term}
        ></div>
```

- [ ] **Step 3: Replace the giscus inline script**

Replace the existing inline script inside the ready branch with:

```astro
        <script is:inline define:vars={{ giscusThemes }}>
          (() => {
            const host = document.querySelector('[data-giscus-host]');
            const fallback = document.querySelector('[data-giscus-fallback]');
            if (!host || !fallback) return;

            const getTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
            const getGiscusTheme = () => giscusThemes[getTheme()];

            const showFallback = () => {
              host.setAttribute('hidden', '');
              fallback.removeAttribute('hidden');
            };

            const syncGiscusTheme = () => {
              const frame = document.querySelector('iframe.giscus-frame');
              if (!frame?.contentWindow) return;

              frame.contentWindow.postMessage(
                {
                  giscus: {
                    setConfig: {
                      theme: getGiscusTheme(),
                    },
                  },
                },
                'https://giscus.app',
              );
            };

            const loadGiscus = () => {
              const script = document.createElement('script');
              script.src = 'https://giscus.app/client.js';
              script.async = true;
              script.crossOrigin = 'anonymous';
              script.setAttribute('data-repo', host.getAttribute('data-repo') || '');
              script.setAttribute('data-repo-id', host.getAttribute('data-repo-id') || '');
              script.setAttribute('data-category', host.getAttribute('data-category') || '');
              script.setAttribute('data-category-id', host.getAttribute('data-category-id') || '');
              script.setAttribute('data-mapping', host.getAttribute('data-mapping') || 'pathname');
              script.setAttribute('data-term', host.getAttribute('data-term') || '');
              script.setAttribute('data-strict', '0');
              script.setAttribute('data-reactions-enabled', '1');
              script.setAttribute('data-emit-metadata', '0');
              script.setAttribute('data-input-position', 'top');
              script.setAttribute('data-theme', getGiscusTheme());
              script.setAttribute('data-lang', 'zh-TW');
              script.setAttribute('data-loading', 'lazy');
              host.appendChild(script);
            };

            const observer = new MutationObserver(syncGiscusTheme);
            observer.observe(host, { childList: true, subtree: true });

            window.addEventListener('open-forum-theme-change', syncGiscusTheme);
            window.addEventListener('message', (event) => {
              if (event.origin !== 'https://giscus.app') return;
              const error = event.data?.giscus?.error;

              if (typeof error === 'string') {
                if (/not installed on this repository/i.test(error) || /Bad credentials/i.test(error)) {
                  showFallback();
                }
                return;
              }

              syncGiscusTheme();
            });

            loadGiscus();
          })();
        </script>
```

- [ ] **Step 4: Run Astro check**

Run:

```bash
npm run check
```

Expected: 0 errors, 0 warnings, 0 hints.

---

### Task 6: Verification and Visual Inspection

**Files:**
- Verify all modified files

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm run test
```

Expected: all test files pass, including `src/lib/theme.test.ts`.

- [ ] **Step 2: Run coverage**

Run:

```bash
npm run coverage
```

Expected: coverage passes configured thresholds for `src/lib/**/*.ts`.

- [ ] **Step 3: Run Astro check**

Run:

```bash
npm run check
```

Expected: 0 errors, 0 warnings, 0 hints.

- [ ] **Step 4: Build the static site**

Run:

```bash
npm run build
```

Expected: build completes and writes the static site to `dist/`.

- [ ] **Step 5: Inspect the production build locally**

Run:

```bash
npm run preview -- --host 127.0.0.1
```

Expected: Astro preview serves `dist/` and prints a localhost URL.

In a browser, verify:

- The first page load follows system light mode when no `localStorage.open-forum-theme` exists.
- The first page load follows system dark mode when no `localStorage.open-forum-theme` exists.
- The header toggle switches between light and dark without visible layout shift.
- Refresh keeps the manually selected theme.
- The community page comments host loads with a giscus theme matching the page theme when giscus env vars are configured.
- Desktop and mobile widths keep the header, search input, nav, and toggle from overlapping.

- [ ] **Step 6: Check git diff**

Run:

```bash
git diff -- src/lib/theme.ts src/lib/theme.test.ts src/layouts/Layout.astro src/components/SiteHeader.astro src/components/GiscusComments.astro src/styles/global.css
```

Expected: diff is limited to theme support, giscus theme sync, and tests.
