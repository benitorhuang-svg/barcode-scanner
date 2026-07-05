import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

const FONT_DIR = 'src/assets/fonts';
const OUTPUT_CSS = 'src/styles/fonts.css';
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700&display=swap';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const INCLUDE_FULL_FONT_SET = process.argv.includes('--full');
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

function curl(args) {
  return execFileSync(CURL_BIN, ['-sS', '-L', '-A', USER_AGENT, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function loadRemoteCss() {
  return curl([FONT_CSS_URL]);
}

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function getRuntimeCodePoints() {
  const files = [
    'index.html',
    ...walkFiles('src').filter((file) => file.endsWith('.ts')),
  ];
  const text = files
    .filter((file) => existsSync(file) && statSync(file).isFile())
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  return new Set([...text].map((char) => char.codePointAt(0)));
}

function parseFontFaces(css) {
  return [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map((match) => {
    const body = match[1];
    const declaration = (name) =>
      new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1]?.trim();

    return {
      css: match[0],
      fontFamily: declaration('font-family'),
      fontStyle: declaration('font-style'),
      fontWeight: declaration('font-weight'),
      fontDisplay: declaration('font-display'),
      url: /url\((https:\/\/[^)]+)\)/.exec(body)?.[1],
      unicodeRange: declaration('unicode-range'),
    };
  });
}

function parseUnicodeSegment(segment) {
  const body = segment.trim().replace(/^U\+/i, '');
  if (body.includes('?')) {
    return [
      Number.parseInt(body.replaceAll('?', '0'), 16),
      Number.parseInt(body.replaceAll('?', 'F'), 16),
    ];
  }

  const [start, end = start] = body.split('-');
  return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
}

function unicodeRangeIntersects(unicodeRange, codePoints) {
  const ranges = unicodeRange.split(',').map(parseUnicodeSegment);
  return ranges.some(([start, end]) => {
    for (const codePoint of codePoints) {
      if (codePoint >= start && codePoint <= end) return true;
    }
    return false;
  });
}

function compactFontFaces(faces) {
  const groups = new Map();

  for (const face of faces) {
    const key = JSON.stringify([
      face.fontFamily,
      face.fontStyle,
      face.fontDisplay,
      face.url,
      face.unicodeRange,
    ]);
    const group = groups.get(key) ?? { ...face, weights: new Set() };
    group.weights.add(face.fontWeight);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function formatFontWeight(weights) {
  const values = [...weights].filter(Boolean);
  const numericValues = values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (numericValues.length === values.length && numericValues.length > 1) {
    return `${numericValues[0]} ${numericValues.at(-1)}`;
  }

  return values[0] ?? '400';
}

function buildFontFaceCss(face) {
  const fileName = basename(new URL(face.url).pathname);

  return [
    '@font-face {',
    `  font-family: ${face.fontFamily};`,
    `  font-style: ${face.fontStyle};`,
    `  font-weight: ${formatFontWeight(face.weights)};`,
    `  font-display: ${face.fontDisplay};`,
    `  src: url(../assets/fonts/${fileName}) format('woff2');`,
    `  unicode-range: ${face.unicodeRange};`,
    '}',
  ].join('\n');
}

mkdirSync(FONT_DIR, { recursive: true });

const remoteCss = loadRemoteCss();
const codePoints = getRuntimeCodePoints();
const selectedFaces = parseFontFaces(remoteCss).filter((face) => {
  const isComplete =
    typeof face.fontFamily === 'string' &&
    typeof face.fontStyle === 'string' &&
    typeof face.fontWeight === 'string' &&
    typeof face.fontDisplay === 'string' &&
    typeof face.url === 'string' &&
    typeof face.unicodeRange === 'string';

  if (!isComplete) return false;
  if (INCLUDE_FULL_FONT_SET) return true;

  return (
    unicodeRangeIntersects(face.unicodeRange, codePoints)
  );
});
const compactFaces = compactFontFaces(selectedFaces);
const urls = [...new Set(selectedFaces.map((face) => face.url))].sort();
const selectedFileNames = new Set(urls.map((url) => basename(new URL(url).pathname)));

for (const url of urls) {
  const fileName = basename(new URL(url).pathname);
  const outputPath = join(FONT_DIR, fileName);

  if (!existsSync(outputPath)) {
    execFileSync(CURL_BIN, ['-sS', '-L', url, '-o', outputPath], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  }

}

for (const fileName of readdirSync(FONT_DIR)) {
  if (fileName.endsWith('.woff2') && !selectedFileNames.has(fileName)) {
    rmSync(join(FONT_DIR, fileName));
  }
}

const header =
  '/* Self-hosted Google Fonts: Inter 300-800 and Noto Sans TC 300/400/500/700. */\n';
const outputCss =
  header +
  compactFaces.map(buildFontFaceCss).join('\n\n') +
  '\n';
writeFileSync(OUTPUT_CSS, outputCss);

try {
  const remoteSnapshot = join(FONT_DIR, 'google-fonts.remote.css');
  readFileSync(remoteSnapshot);
  rmSync(remoteSnapshot);
} catch {
  // The snapshot exists only during ad-hoc downloads.
}

console.log(
  `Prepared ${urls.length} local font files and ${compactFaces.length} @font-face rules in ${OUTPUT_CSS}`,
);
