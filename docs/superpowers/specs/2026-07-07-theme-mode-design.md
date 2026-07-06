# Theme Mode Design

Date: 2026-07-07

## Goal

Add first-class light and dark theme support to the Open Forum static site. The site should respect the visitor's system preference on first load, allow a manual toggle from the header, remember the visitor's choice, and keep the embedded giscus comments theme in sync with the page.

## Scope

Included:

- Light and dark design tokens in the existing global CSS system.
- A small header control that toggles between light and dark modes.
- Early theme bootstrap in the document head to avoid a visible flash of the wrong theme.
- `localStorage` persistence for manual theme choice.
- `meta[name="theme-color"]` updates for browser chrome.
- giscus theme synchronization after load and after toggles.
- Verification through Astro check, build, coverage, and manual browser inspection of both themes.

Not included:

- A third "system" control state in the UI.
- A full visual redesign of the site.
- New dependencies or a client-side framework.
- Broad visual regression automation.

## UX

On first visit, the site uses `prefers-color-scheme`. The header shows one compact icon-style toggle with an accessible label. Activating it switches to the opposite theme and stores the explicit choice. Future visits use the stored choice until the visitor toggles again.

The dark theme should keep the existing warm editorial personality, but use darker surfaces, softer borders, and readable text contrast. Accent colors stay recognizable across both modes.

## Architecture

`Layout.astro` owns the initial document setup. It will set a tiny inline bootstrap script before styles render. The script reads `localStorage.theme`, falls back to `matchMedia('(prefers-color-scheme: dark)')`, and writes `data-theme="light"` or `data-theme="dark"` on `document.documentElement`.

`SiteHeader.astro` owns the toggle button markup. A small inline script attaches behavior, updates button state, writes the preference, updates the theme color meta tag, and emits a custom event so other components can react.

`global.css` owns theme tokens. Existing selectors should continue to use CSS variables; the dark mode work should mostly add variable overrides plus targeted fixes where hard-coded translucent colors need a token.

`GiscusComments.astro` will no longer hard-code a light giscus theme as a permanent state. It will pick the current page theme for initial script attributes and listen for the theme event to post the updated theme to the giscus iframe.

## Error Handling

Theme scripts should tolerate unavailable `localStorage`, missing toggle elements, missing meta tags, and absent giscus iframes. Failure should leave the site readable in its CSS default rather than breaking page behavior.

## Testing

Automated verification:

- `npm run check`
- `npm run build`
- `npm run coverage`

Manual verification:

- Load the site with no saved preference under light and dark system emulation.
- Toggle theme and refresh to confirm persistence.
- Visit a comments-enabled page and confirm the giscus theme updates when available.
- Check desktop and mobile header layout for no text overlap or layout shift.
