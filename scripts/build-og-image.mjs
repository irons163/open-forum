import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/**
 * Renders the social sharing card to public/og.png. The PNG is committed, so this
 * only needs re-running when the wording or palette changes:
 *   npm run build:og
 *
 * The preview card on the right uses the current top mover and its real star
 * history, so the image shows what the site actually does.
 */
const width = 1200;
const height = 630;

const palette = {
  page: '#f6f4f0',
  panel: '#ffffff',
  sunken: '#f2efe9',
  ink: '#17150f',
  inkSoft: '#6c6557',
  inkFaint: '#97907f',
  accent: '#c2410c',
  data: '#0f766e',
  line: 'rgba(23, 21, 15, 0.09)',
};

const sans = 'Helvetica, Arial, sans-serif';

const [{ default: history }, { default: projects }] = await Promise.all([
  import('../data/history.json', { with: { type: 'json' } }),
  import('../src/data/projects.generated.json', { with: { type: 'json' } }),
]);

const topMover = [...projects].sort((left, right) => right.delta7d - left.delta7d)[0];
const series = (history[topMover.fullName] ?? []).slice(-45).map((entry) => entry.stars);

function buildTrendPath(values, boxWidth, boxHeight) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = boxWidth / (values.length - 1);

  return values
    .map((value, index) => {
      const x = (index * step).toFixed(1);
      const y = (boxHeight - ((value - min) / range) * boxHeight).toFixed(1);
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
}

const trendWidth = 336;
const trendHeight = 104;
const trendPath = series.length > 1 ? buildTrendPath(series, trendWidth, trendHeight) : '';
const starLabel = `${(topMover.stars / 1000).toFixed(1)}k stars`;
const deltaLabel = `7d +${topMover.delta7d.toLocaleString('en-US')}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="warm" cx="10%" cy="0%" r="62%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.11" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="cool" cx="94%" cy="4%" r="58%">
      <stop offset="0%" stop-color="${palette.data}" stop-opacity="0.1" />
      <stop offset="100%" stop-color="${palette.data}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.data}" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${palette.data}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="${palette.page}" />
  <rect width="${width}" height="${height}" fill="url(#warm)" />
  <rect width="${width}" height="${height}" fill="url(#cool)" />

  <g transform="translate(80, 76)">
    <circle cx="13" cy="13" r="12" fill="none" stroke="${palette.accent}" stroke-width="2.5" />
    <circle cx="13" cy="13" r="4.5" fill="${palette.accent}" />
    <text x="42" y="21" font-family="${sans}" font-size="26" font-weight="700" fill="${palette.ink}">Open Forum</text>
    <text x="203" y="21" font-family="${sans}" font-size="20" fill="${palette.inkFaint}">開源專案雷達</text>
  </g>

  <text x="80" y="276" font-family="${sans}" font-size="60" font-weight="700" fill="${palette.ink}">追蹤開源專案熱度</text>
  <text x="80" y="354" font-family="${sans}" font-size="60" font-weight="700" fill="${palette.ink}">不只看 star 總數</text>

  <text x="80" y="416" font-family="${sans}" font-size="24" fill="${palette.inkSoft}">每日同步 GitHub 指標</text>
  <text x="80" y="452" font-family="${sans}" font-size="24" fill="${palette.inkSoft}">看 7 天增量、相對增幅與 45 天走勢</text>

  <g transform="translate(80, 500)">
    <rect x="0" y="0" width="146" height="44" rx="22" fill="${palette.panel}" stroke="${palette.line}" />
    <text x="24" y="29" font-family="${sans}" font-size="19" font-weight="600" fill="${palette.ink}">每日熱度榜</text>
    <rect x="162" y="0" width="128" height="44" rx="22" fill="${palette.panel}" stroke="${palette.line}" />
    <text x="186" y="29" font-family="${sans}" font-size="19" font-weight="600" fill="${palette.ink}">編輯精選</text>
    <rect x="326" y="0" width="128" height="44" rx="22" fill="${palette.panel}" stroke="${palette.line}" />
    <text x="350" y="29" font-family="${sans}" font-size="19" font-weight="600" fill="${palette.ink}">社群推薦</text>
  </g>

  <g transform="translate(720, 192)">
    <rect x="0" y="0" width="400" height="294" rx="24" fill="${palette.panel}" stroke="${palette.line}" />

    <rect x="32" y="34" width="58" height="30" rx="15" fill="${palette.sunken}" />
    <text x="47" y="54" font-family="${sans}" font-size="16" font-weight="600" fill="${palette.inkSoft}">${topMover.category}</text>
    <text x="104" y="54" font-family="${sans}" font-size="16" font-weight="600" fill="${palette.data}">${deltaLabel}</text>

    <text x="32" y="98" font-family="${sans}" font-size="27" font-weight="700" fill="${palette.ink}">${topMover.fullName}</text>
    <text x="32" y="130" font-family="${sans}" font-size="17" fill="${palette.inkFaint}">${starLabel}・45 天樣本</text>

    ${
      trendPath
        ? `<g transform="translate(32, 152)">
      <path d="${trendPath} L${trendWidth} ${trendHeight} L0 ${trendHeight} Z" fill="url(#trendFill)" />
      <path d="${trendPath}" fill="none" stroke="${palette.data}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    </g>`
        : ''
    }
  </g>
</svg>
`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

await writeFile(new URL('../public/og.png', import.meta.url), png);

console.log(
  `Wrote public/og.png (${width}x${height}, ${(png.length / 1024).toFixed(1)} kB) featuring ${topMover.fullName}`,
);
