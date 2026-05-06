import type { Book } from "@/types/library";
import bookCodex from "@/assets/book-codex.jpg";
import bookRed from "@/assets/book-red.jpg";
import bookStack from "@/assets/book-stack.jpg";
import bookCandle from "@/assets/book-candle.jpg";
import bookNeural from "@/assets/book-neural.jpg";
import curioModern from "@/assets/curio-modern.jpg";
import curioQuantum from "@/assets/curio-quantum.jpg";
import curioRare from "@/assets/curio-rare.jpg";
import curioStoic from "@/assets/curio-stoic.jpg";
import heroCosmos from "@/assets/hero-cosmos.jpg";
import trendGlobal from "@/assets/trend-global.jpg";
import trendHuman from "@/assets/trend-human.jpg";
import trendPhilosophy from "@/assets/trend-philosophy.jpg";

type CoverBook = Pick<Book, "title" | "cover_url" | "id"> & Partial<Pick<Book, "genre">>;

type GeneratedMotif = "garden" | "architecture" | "language" | "signal" | "cloud" | "hardware" | "glyphs" | "interface";

type GeneratedCoverPalette = {
  backgroundTop: string;
  backgroundBottom: string;
  panel: string;
  glow: string;
  accent: string;
  accentSoft: string;
  accentWarm: string;
  line: string;
};

type GeneratedCoverSpec = {
  motif: GeneratedMotif;
  palette: GeneratedCoverPalette;
};

const allCovers = [
  bookCodex.src,
  bookRed.src,
  bookStack.src,
  bookCandle.src,
  bookNeural.src,
  curioModern.src,
  curioQuantum.src,
  curioRare.src,
  curioStoic.src,
  heroCosmos.src,
  trendGlobal.src,
  trendHuman.src,
  trendPhilosophy.src,
];

/**
 * Generate a consistent hash for a string to ensure the same book always gets the same cover.
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return Math.abs(hash);
};

const pickFromPool = <T,>(pool: T[], seed: string) => pool[hashString(seed) % pool.length];

const seededValue = (seed: string, key: string, min: number, max: number) => {
  const ratio = (hashString(`${seed}:${key}`) % 10_000) / 10_000;
  return min + (max - min) * ratio;
};

const seededInt = (seed: string, key: string, min: number, max: number) =>
  Math.round(seededValue(seed, key, min, max));

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim())}`;

const generatedCoverCache = new Map<string, string>();

const palettes = {
  neuralGarden: {
    backgroundTop: "#060814",
    backgroundBottom: "#101224",
    panel: "#111a2d",
    glow: "#ff4fb8",
    accent: "#7cf1ff",
    accentSoft: "#a082ff",
    accentWarm: "#ffd27e",
    line: "#94efff",
  },
  neuralBlueprint: {
    backgroundTop: "#061120",
    backgroundBottom: "#111a30",
    panel: "#102038",
    glow: "#4f9fff",
    accent: "#78e4ff",
    accentSoft: "#9d87ff",
    accentWarm: "#ffe39d",
    line: "#8beeff",
  },
  languageDawn: {
    backgroundTop: "#08101c",
    backgroundBottom: "#19172b",
    panel: "#121b2f",
    glow: "#69ddff",
    accent: "#ffca72",
    accentSoft: "#b091ff",
    accentWarm: "#ffe8a8",
    line: "#8feaff",
  },
  humanSignal: {
    backgroundTop: "#080913",
    backgroundBottom: "#1a1428",
    panel: "#14192d",
    glow: "#ff579f",
    accent: "#5fe0ff",
    accentSoft: "#8e75ff",
    accentWarm: "#ffd59a",
    line: "#8deeff",
  },
  kindMachine: {
    backgroundTop: "#071221",
    backgroundBottom: "#142132",
    panel: "#112032",
    glow: "#5ad6ff",
    accent: "#7ce7df",
    accentSoft: "#a084ff",
    accentWarm: "#ffd67c",
    line: "#94efff",
  },
  cloudWorkshop: {
    backgroundTop: "#09111b",
    backgroundBottom: "#13253a",
    panel: "#102035",
    glow: "#65d8ff",
    accent: "#6ee7ff",
    accentSoft: "#b391ff",
    accentWarm: "#ffcb7b",
    line: "#8de9ff",
  },
  fragileHardware: {
    backgroundTop: "#060b16",
    backgroundBottom: "#121927",
    panel: "#101926",
    glow: "#58efce",
    accent: "#75ddff",
    accentSoft: "#9b8fff",
    accentWarm: "#ffd885",
    line: "#90efff",
  },
  afterInterface: {
    backgroundTop: "#050913",
    backgroundBottom: "#10182a",
    panel: "#121c30",
    glow: "#9f7cff",
    accent: "#69e2ff",
    accentSoft: "#ff8cd0",
    accentWarm: "#ffe0a0",
    line: "#8eeaff",
  },
  wanderingTongues: {
    backgroundTop: "#090c18",
    backgroundBottom: "#19182b",
    panel: "#151b30",
    glow: "#ffb06d",
    accent: "#78e8ff",
    accentSoft: "#b495ff",
    accentWarm: "#ffe0a7",
    line: "#9af0ff",
  },
  syntaxSilence: {
    backgroundTop: "#060a13",
    backgroundBottom: "#121824",
    panel: "#101723",
    glow: "#67deff",
    accent: "#ffd17b",
    accentSoft: "#9e8bff",
    accentWarm: "#fff1bf",
    line: "#96eeff",
  },
  borrowedAlphabets: {
    backgroundTop: "#0a0e17",
    backgroundBottom: "#1b1d31",
    panel: "#151d2f",
    glow: "#ff7aa7",
    accent: "#73e4ff",
    accentSoft: "#bd9cff",
    accentWarm: "#ffd77b",
    line: "#9af2ff",
  },
  borderNames: {
    backgroundTop: "#08101a",
    backgroundBottom: "#162234",
    panel: "#132031",
    glow: "#5adfff",
    accent: "#78ebff",
    accentSoft: "#a885ff",
    accentWarm: "#ffd8a1",
    line: "#97efff",
  },
} satisfies Record<string, GeneratedCoverPalette>;

const generatedTitleCoverMap: Array<{ match: RegExp; spec: GeneratedCoverSpec }> = [
  { match: /neural garden handbook/i, spec: { motif: "garden", palette: palettes.neuralGarden } },
  { match: /neural architectures/i, spec: { motif: "architecture", palette: palettes.neuralBlueprint } },
  { match: /language machines at dawn/i, spec: { motif: "language", palette: palettes.languageDawn } },
  { match: /human signal,? human noise/i, spec: { motif: "signal", palette: palettes.humanSignal } },
  { match: /protocols for kind machines/i, spec: { motif: "architecture", palette: palettes.kindMachine } },
  { match: /the cloud and the workshop/i, spec: { motif: "cloud", palette: palettes.cloudWorkshop } },
  { match: /hardware for fragile worlds/i, spec: { motif: "hardware", palette: palettes.fragileHardware } },
  { match: /after the interface/i, spec: { motif: "interface", palette: palettes.afterInterface } },
  { match: /grammar of wandering tongues/i, spec: { motif: "language", palette: palettes.wanderingTongues } },
  { match: /syntax of silence/i, spec: { motif: "signal", palette: palettes.syntaxSilence } },
  { match: /borrowed alphabets/i, spec: { motif: "glyphs", palette: palettes.borrowedAlphabets } },
  { match: /names across borders/i, spec: { motif: "language", palette: palettes.borderNames } },
];

const generatedGenreCoverPools: Record<string, GeneratedCoverSpec[]> = {
  AI: [
    { motif: "garden", palette: palettes.neuralGarden },
    { motif: "architecture", palette: palettes.neuralBlueprint },
    { motif: "language", palette: palettes.languageDawn },
    { motif: "signal", palette: palettes.humanSignal },
  ],
  Technology: [
    { motif: "architecture", palette: palettes.kindMachine },
    { motif: "cloud", palette: palettes.cloudWorkshop },
    { motif: "hardware", palette: palettes.fragileHardware },
    { motif: "interface", palette: palettes.afterInterface },
  ],
  Linguistics: [
    { motif: "language", palette: palettes.wanderingTongues },
    { motif: "signal", palette: palettes.syntaxSilence },
    { motif: "glyphs", palette: palettes.borrowedAlphabets },
    { motif: "language", palette: palettes.borderNames },
  ],
};

const genreCoverPools: Record<string, string[]> = {
  "Rare Archives": [curioRare.src, bookCodex.src, bookStack.src],
  Philosophy: [curioStoic.src, trendPhilosophy.src, bookCandle.src],
  History: [trendGlobal.src, bookStack.src, trendHuman.src],
  Anthropology: [trendHuman.src, curioModern.src, trendGlobal.src],
  "Quantum Physics": [curioQuantum.src, bookRed.src, heroCosmos.src],
  Cosmology: [heroCosmos.src, curioQuantum.src, bookRed.src],
  Mythology: [curioRare.src, heroCosmos.src, bookRed.src, bookCodex.src],
  Literature: [bookCandle.src, bookStack.src, curioModern.src],
  Poetry: [trendPhilosophy.src, heroCosmos.src, bookCandle.src],
  Psychology: [trendHuman.src, bookCandle.src, curioStoic.src],
  Economics: [trendGlobal.src, bookStack.src, curioModern.src],
  Design: [curioModern.src, bookNeural.src, trendGlobal.src],
  Ecology: [heroCosmos.src, trendHuman.src, bookStack.src],
  Mathematics: [bookRed.src, curioQuantum.src, heroCosmos.src],
  Biography: [trendHuman.src, curioRare.src, bookStack.src],
  Architecture: [curioModern.src, bookStack.src, heroCosmos.src],
  Spirituality: [bookCandle.src, curioStoic.src, heroCosmos.src],
};

const titleCoverMap: Array<{ match: RegExp; cover: string }> = [
  { match: /(alchemist|codex)/i, cover: bookCodex.src },
  { match: /(vellum|seal|sealed|archive|atlas of broken seals|rare archives)/i, cover: curioRare.src },
  { match: /(quietude|mind|meditation|consciousness)/i, cover: bookCandle.src },
  { match: /(stoic|lamps|inner freedom|resilience|grace)/i, cover: curioStoic.src },
  { match: /(ethics|threshold|responsibility|choice)/i, cover: trendPhilosophy.src },
  { match: /(rome|ancient|empire|civic|political)/i, cover: trendGlobal.src },
  { match: /(steppe|kinship|ritual|hospitality|oral|migration|human memory)/i, cover: trendHuman.src },
  { match: /(river|trade|caravan|salt|karakorum|silk road)/i, cover: bookStack.src },
  { match: /(quantum|measurement|entangled|uncertainty|physics)/i, cover: curioQuantum.src },
  { match: /(event horizon|black hole|paradox)/i, cover: bookRed.src },
  { match: /(orion|cosmos|dark matter|stardust|golden dust|lanterns|galax)/i, cover: heroCosmos.src },
  { match: /(myth|myths|firekeepers|first stars|legend|origin|trickster)/i, cover: curioRare.src },
  { match: /(novel|letters to|harbor|lantern street|homesick|literature)/i, cover: bookStack.src },
  { match: /(poetry|poem|psalms|sonnets|haiku|quiet names)/i, cover: trendPhilosophy.src },
  { match: /(habit|attention|grief|brain|psychology)/i, cover: trendHuman.src },
  { match: /(markets|price|paper money|commons|economics|port cities)/i, cover: trendGlobal.src },
  { match: /(design|type|interfaces|objects|courtyard|cities for slow feet|architecture)/i, cover: curioModern.src },
  { match: /(moss|rivers|forest|weather|ecology|watershed)/i, cover: heroCosmos.src },
  { match: /(proofs|infinity|geometry|number fields|mathematics)/i, cover: bookRed.src },
  { match: /(ada|curie|cartographer|biography|restless century)/i, cover: trendHuman.src },
  { match: /(pilgrim|monasteries|prayer|breath|desert bells|spirituality)/i, cover: bookCandle.src },
];

const renderGardenMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const terraces = Array.from({ length: 4 }, (_, index) => {
    const y = 835 + (index * 74) + seededValue(seed, `terrace:${index}`, -12, 12);
    const x = 110 - (index * 22);
    const width = 680 + (index * 58);
    const bend = 92 + (index * 10);
    return `<path d="M ${x} ${y} C ${x + (width * 0.24)} ${y - bend}, ${x + (width * 0.76)} ${y - bend}, ${x + width} ${y}" stroke="${palette.accentWarm}" stroke-opacity="${0.18 - (index * 0.03)}" stroke-width="${20 - (index * 3)}" stroke-linecap="round" />`;
  }).join("");

  const vines = Array.from({ length: 5 }, (_, index) => {
    const startX = seededValue(seed, `vine:${index}:start`, 180, 720);
    const endX = seededValue(seed, `vine:${index}:end`, 150, 760);
    const ctrlX1 = seededValue(seed, `vine:${index}:ctrlx1`, 120, 760);
    const ctrlX2 = seededValue(seed, `vine:${index}:ctrlx2`, 140, 780);
    const ctrlY1 = seededValue(seed, `vine:${index}:ctrly1`, 700, 930);
    const ctrlY2 = seededValue(seed, `vine:${index}:ctrly2`, 220, 540);
    const endY = seededValue(seed, `vine:${index}:endy`, 160, 360);
    return `<path d="M ${startX} 1038 C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${endX} ${endY}" stroke="${index % 2 === 0 ? palette.accent : palette.accentSoft}" stroke-opacity=".82" stroke-width="${11 - index}" stroke-linecap="round" fill="none" />`;
  }).join("");

  const nodes = Array.from({ length: 14 }, (_, index) => {
    const cx = seededValue(seed, `node:${index}:x`, 132, 770);
    const cy = seededValue(seed, `node:${index}:y`, 140, 820);
    const radius = seededValue(seed, `node:${index}:r`, 7, 18);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${index % 3 === 0 ? palette.accentWarm : palette.accent}" fill-opacity=".92" /><circle cx="${cx}" cy="${cy}" r="${radius + 18}" fill="${palette.glow}" fill-opacity=".08" />`;
  }).join("");

  return `${terraces}${vines}${nodes}`;
};

const renderArchitectureMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const columns = Array.from({ length: 7 }, (_, index) => {
    const x = 118 + (index * 102) + seededValue(seed, `col:${index}`, -18, 18);
    return `<line x1="${x}" y1="168" x2="${x}" y2="970" stroke="${palette.line}" stroke-opacity=".11" stroke-width="2" />`;
  }).join("");

  const rows = Array.from({ length: 8 }, (_, index) => {
    const y = 190 + (index * 96) + seededValue(seed, `row:${index}`, -16, 16);
    return `<line x1="94" y1="${y}" x2="806" y2="${y}" stroke="${palette.line}" stroke-opacity=".08" stroke-width="2" />`;
  }).join("");

  const frames = Array.from({ length: 3 }, (_, index) => {
    const x = 132 + (index * 60);
    const y = 230 + (index * 92);
    const width = 620 - (index * 120);
    const height = 540 - (index * 92);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="34" fill="none" stroke="${index === 1 ? palette.accentSoft : palette.accent}" stroke-opacity="${0.45 - (index * 0.08)}" stroke-width="${10 - (index * 2)}" />`;
  }).join("");

  const connectors = Array.from({ length: 12 }, (_, index) => {
    const x = seededValue(seed, `connector:${index}:x`, 180, 720);
    const y = seededValue(seed, `connector:${index}:y`, 250, 880);
    const dx = seededValue(seed, `connector:${index}:dx`, -140, 140);
    const dy = seededValue(seed, `connector:${index}:dy`, -120, 120);
    return `<path d="M ${x} ${y} L ${x + dx} ${y + dy}" stroke="${index % 2 === 0 ? palette.accentWarm : palette.line}" stroke-opacity=".4" stroke-width="4" stroke-linecap="round" /><circle cx="${x}" cy="${y}" r="7" fill="${palette.accent}" /><circle cx="${x + dx}" cy="${y + dy}" r="5" fill="${palette.accentSoft}" />`;
  }).join("");

  return `${columns}${rows}${frames}${connectors}`;
};

const renderLanguageMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const ribbons = Array.from({ length: 6 }, (_, index) => {
    const y = 228 + (index * 120) + seededValue(seed, `ribbon:${index}:y`, -18, 18);
    const c1 = seededValue(seed, `ribbon:${index}:c1`, 60, 170);
    const c2 = seededValue(seed, `ribbon:${index}:c2`, 40, 150);
    const c3 = seededValue(seed, `ribbon:${index}:c3`, 40, 150);
    const c4 = seededValue(seed, `ribbon:${index}:c4`, 60, 170);
    return `<path d="M 72 ${y} C 214 ${y - c1}, 318 ${y + c2}, 452 ${y} C 580 ${y - c3}, 690 ${y + c4}, 828 ${y}" stroke="${index % 2 === 0 ? palette.accent : palette.accentSoft}" stroke-opacity=".82" stroke-width="${14 - index}" stroke-linecap="round" fill="none" />`;
  }).join("");

  const glyphs = Array.from({ length: 16 }, (_, index) => {
    const x = seededValue(seed, `glyph:${index}:x`, 118, 744);
    const y = seededValue(seed, `glyph:${index}:y`, 190, 900);
    const width = seededValue(seed, `glyph:${index}:w`, 36, 82);
    const height = seededValue(seed, `glyph:${index}:h`, 12, 28);
    const rotation = seededValue(seed, `glyph:${index}:r`, -24, 24);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" transform="rotate(${rotation} ${x + (width / 2)} ${y + (height / 2)})" fill="${index % 4 === 0 ? palette.accentWarm : palette.line}" fill-opacity=".74" />`;
  }).join("");

  return `${ribbons}${glyphs}`;
};

const renderSignalMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const beam = `<path d="M 98 ${seededInt(seed, "beam:start", 320, 420)} C 250 250, 396 610, 540 544 C 656 492, 716 268, 814 ${seededInt(seed, "beam:end", 700, 780)}" stroke="${palette.accent}" stroke-opacity=".9" stroke-width="18" stroke-linecap="round" fill="none" />`;

  const bars = Array.from({ length: 10 }, (_, index) => {
    const x = 140 + (index * 64);
    const top = seededValue(seed, `bar:${index}:top`, 172, 540);
    const bottom = top + seededValue(seed, `bar:${index}:bottom`, 150, 440);
    return `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${index % 2 === 0 ? palette.accentSoft : palette.line}" stroke-opacity=".36" stroke-width="${index % 3 === 0 ? 10 : 6}" stroke-linecap="round" />`;
  }).join("");

  const noise = Array.from({ length: 34 }, (_, index) => {
    const cx = seededValue(seed, `noise:${index}:x`, 120, 780);
    const cy = seededValue(seed, `noise:${index}:y`, 150, 950);
    const radius = seededValue(seed, `noise:${index}:r`, 4, 10);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${index % 3 === 0 ? palette.glow : palette.accentWarm}" fill-opacity="${0.14 + ((index % 4) * 0.08)}" />`;
  }).join("");

  return `${bars}${beam}${noise}`;
};

const renderCloudMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const clouds = Array.from({ length: 6 }, (_, index) => {
    const cx = 180 + (index * 92) + seededValue(seed, `cloud:${index}:x`, -18, 18);
    const cy = 248 + seededValue(seed, `cloud:${index}:y`, -26, 26);
    const rx = seededValue(seed, `cloud:${index}:rx`, 58, 96);
    const ry = seededValue(seed, `cloud:${index}:ry`, 34, 56);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${index % 2 === 0 ? palette.accentSoft : palette.accent}" fill-opacity=".18" /><ellipse cx="${cx}" cy="${cy}" rx="${rx - 18}" ry="${ry - 12}" fill="${palette.glow}" fill-opacity=".18" />`;
  }).join("");

  const modules = Array.from({ length: 4 }, (_, index) => {
    const x = 148 + (index * 154) + seededValue(seed, `module:${index}:x`, -16, 16);
    const y = 560 + (index % 2 === 0 ? 0 : 88) + seededValue(seed, `module:${index}:y`, -12, 12);
    const width = seededValue(seed, `module:${index}:w`, 128, 156);
    const height = seededValue(seed, `module:${index}:h`, 108, 150);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" fill="${palette.panel}" fill-opacity=".52" stroke="${palette.line}" stroke-opacity=".24" stroke-width="4" /><path d="M ${x + 24} ${y + 34} H ${x + width - 26}" stroke="${palette.accentWarm}" stroke-opacity=".52" stroke-width="8" stroke-linecap="round" /><path d="M ${x + 24} ${y + height - 36} H ${x + width - 54}" stroke="${palette.accent}" stroke-opacity=".44" stroke-width="8" stroke-linecap="round" />`;
  }).join("");

  const links = Array.from({ length: 8 }, (_, index) => {
    const x1 = seededValue(seed, `link:${index}:x1`, 160, 760);
    const x2 = seededValue(seed, `link:${index}:x2`, 160, 760);
    const y1 = seededValue(seed, `link:${index}:y1`, 320, 520);
    const y2 = seededValue(seed, `link:${index}:y2`, 590, 920);
    return `<path d="M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" stroke="${palette.line}" stroke-opacity=".32" stroke-width="4" fill="none" />`;
  }).join("");

  return `${clouds}${modules}${links}`;
};

const renderHardwareMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const grid = Array.from({ length: 10 }, (_, index) => {
    const y = 148 + (index * 90) + seededValue(seed, `hardware-row:${index}`, -12, 12);
    return `<line x1="116" y1="${y}" x2="784" y2="${y}" stroke="${palette.line}" stroke-opacity=".08" stroke-width="2" />`;
  }).join("") + Array.from({ length: 7 }, (_, index) => {
    const x = 152 + (index * 96) + seededValue(seed, `hardware-col:${index}`, -10, 10);
    return `<line x1="${x}" y1="132" x2="${x}" y2="1008" stroke="${palette.line}" stroke-opacity=".08" stroke-width="2" />`;
  }).join("");

  const chip = `<rect x="228" y="360" width="444" height="364" rx="42" fill="${palette.panel}" fill-opacity=".58" stroke="${palette.accent}" stroke-opacity=".38" stroke-width="6" /><rect x="296" y="430" width="308" height="224" rx="26" fill="none" stroke="${palette.accentWarm}" stroke-opacity=".42" stroke-width="10" />`;

  const traces = Array.from({ length: 18 }, (_, index) => {
    const side = index % 4;
    const anchorX = side === 0 ? 228 : side === 1 ? 672 : seededValue(seed, `trace:${index}:x`, 288, 612);
    const anchorY = side === 2 ? 360 : side === 3 ? 724 : seededValue(seed, `trace:${index}:y`, 420, 664);
    const edgeX = side === 0 ? 88 : side === 1 ? 812 : anchorX;
    const edgeY = side === 2 ? 120 : side === 3 ? 1048 : anchorY;
    const midX = seededValue(seed, `trace:${index}:midX`, 180, 720);
    const midY = seededValue(seed, `trace:${index}:midY`, 210, 980);
    return `<path d="M ${anchorX} ${anchorY} C ${midX} ${anchorY}, ${midX} ${edgeY}, ${edgeX} ${edgeY}" stroke="${index % 3 === 0 ? palette.accentSoft : palette.line}" stroke-opacity=".48" stroke-width="${index % 2 === 0 ? 5 : 4}" fill="none" stroke-linecap="round" /><circle cx="${edgeX}" cy="${edgeY}" r="7" fill="${palette.accent}" fill-opacity=".9" />`;
  }).join("");

  return `${grid}${chip}${traces}`;
};

const renderGlyphMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const columns = Array.from({ length: 5 }, (_, index) => {
    const x = 146 + (index * 128) + seededValue(seed, `glyph-col:${index}`, -14, 14);
    const pieces = Array.from({ length: 6 }, (_, innerIndex) => {
      const y = 186 + (innerIndex * 128) + seededValue(seed, `glyph-piece:${index}:${innerIndex}`, -16, 16);
      const width = seededValue(seed, `glyph-piece:${index}:${innerIndex}:w`, 32, 92);
      const height = seededValue(seed, `glyph-piece:${index}:${innerIndex}:h`, 16, 36);
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${(innerIndex + index) % 2 === 0 ? palette.accent : palette.accentSoft}" fill-opacity=".78" />`;
    }).join("");
    return pieces;
  }).join("");

  const marks = Array.from({ length: 12 }, (_, index) => {
    const cx = seededValue(seed, `mark:${index}:x`, 156, 756);
    const cy = seededValue(seed, `mark:${index}:y`, 210, 938);
    const radius = seededValue(seed, `mark:${index}:r`, 6, 18);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${index % 2 === 0 ? palette.accentWarm : palette.line}" fill-opacity=".7" />`;
  }).join("");

  return `${columns}${marks}`;
};

const renderInterfaceMotif = (seed: string, palette: GeneratedCoverPalette) => {
  const panels = Array.from({ length: 5 }, (_, index) => {
    const x = 118 + (index * 86) + seededValue(seed, `panel:${index}:x`, -18, 18);
    const y = 176 + (index * 74) + seededValue(seed, `panel:${index}:y`, -18, 18);
    const width = seededValue(seed, `panel:${index}:w`, 280, 430);
    const height = seededValue(seed, `panel:${index}:h`, 118, 192);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="${palette.panel}" fill-opacity=".46" stroke="${index % 2 === 0 ? palette.line : palette.accentSoft}" stroke-opacity=".22" stroke-width="4" />`;
  }).join("");

  const sweeps = Array.from({ length: 5 }, (_, index) => {
    const startY = 708 + (index * 58);
    const bend = seededValue(seed, `sweep:${index}:bend`, 30, 110);
    return `<path d="M 92 ${startY} C 260 ${startY - bend}, 584 ${startY - bend}, 808 ${startY}" stroke="${index % 2 === 0 ? palette.accent : palette.accentWarm}" stroke-opacity=".34" stroke-width="${12 - index}" stroke-linecap="round" fill="none" />`;
  }).join("");

  const nodes = Array.from({ length: 18 }, (_, index) => {
    const cx = seededValue(seed, `interface-node:${index}:x`, 124, 772);
    const cy = seededValue(seed, `interface-node:${index}:y`, 180, 980);
    return `<circle cx="${cx}" cy="${cy}" r="${seededValue(seed, `interface-node:${index}:r`, 4, 11)}" fill="${index % 3 === 0 ? palette.accentWarm : palette.glow}" fill-opacity=".44" />`;
  }).join("");

  return `${panels}${sweeps}${nodes}`;
};

const renderGeneratedMotif = (seed: string, spec: GeneratedCoverSpec) => {
  switch (spec.motif) {
    case "garden":
      return renderGardenMotif(seed, spec.palette);
    case "architecture":
      return renderArchitectureMotif(seed, spec.palette);
    case "language":
      return renderLanguageMotif(seed, spec.palette);
    case "signal":
      return renderSignalMotif(seed, spec.palette);
    case "cloud":
      return renderCloudMotif(seed, spec.palette);
    case "hardware":
      return renderHardwareMotif(seed, spec.palette);
    case "glyphs":
      return renderGlyphMotif(seed, spec.palette);
    case "interface":
      return renderInterfaceMotif(seed, spec.palette);
    default:
      return renderArchitectureMotif(seed, spec.palette);
  }
};

const createGeneratedCover = (title: string, spec: GeneratedCoverSpec) => {
  const cacheKey = `${spec.motif}:${title}:${spec.palette.backgroundTop}:${spec.palette.backgroundBottom}`;
  const cached = generatedCoverCache.get(cacheKey);
  if (cached) return cached;

  const seed = `${title}:${spec.motif}`;
  const accentGlowX = seededInt(seed, "glow:x", 180, 730);
  const accentGlowY = seededInt(seed, "glow:y", 120, 360);
  const accentGlowR = seededInt(seed, "glow:r", 180, 310);
  const emberX = seededInt(seed, "ember:x", 220, 700);
  const emberY = seededInt(seed, "ember:y", 220, 920);
  const emberR = seededInt(seed, "ember:r", 110, 220);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" fill="none">
      <defs>
        <linearGradient id="bg" x1="112" y1="0" x2="796" y2="1200" gradientUnits="userSpaceOnUse">
          <stop stop-color="${spec.palette.backgroundTop}" />
          <stop offset="1" stop-color="${spec.palette.backgroundBottom}" />
        </linearGradient>
        <radialGradient id="mist" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${accentGlowX} ${accentGlowY}) rotate(120) scale(${accentGlowR} ${Math.round(accentGlowR * 0.78)})">
          <stop stop-color="${spec.palette.glow}" stop-opacity=".58" />
          <stop offset="1" stop-color="${spec.palette.glow}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="ember" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${emberX} ${emberY}) rotate(120) scale(${emberR} ${Math.round(emberR * 0.82)})">
          <stop stop-color="${spec.palette.accentWarm}" stop-opacity=".26" />
          <stop offset="1" stop-color="${spec.palette.accentWarm}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="veil" x1="450" y1="0" x2="450" y2="1200">
          <stop stop-color="#FFFFFF" stop-opacity=".04" />
          <stop offset=".56" stop-color="#FFFFFF" stop-opacity="0" />
          <stop offset="1" stop-color="#000000" stop-opacity=".4" />
        </linearGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="46" />
        </filter>
      </defs>

      <rect width="900" height="1200" rx="72" fill="url(#bg)" />
      <circle cx="${accentGlowX}" cy="${accentGlowY}" r="${accentGlowR}" fill="url(#mist)" filter="url(#softBlur)" />
      <circle cx="${emberX}" cy="${emberY}" r="${emberR}" fill="url(#ember)" filter="url(#softBlur)" />
      <rect x="38" y="38" width="824" height="1124" rx="54" fill="${spec.palette.panel}" fill-opacity=".22" stroke="${spec.palette.line}" stroke-opacity=".12" />
      ${renderGeneratedMotif(seed, spec)}
      <rect width="900" height="1200" rx="72" fill="url(#veil)" />
    </svg>
  `;

  const dataUri = svgToDataUri(svg);
  generatedCoverCache.set(cacheKey, dataUri);
  return dataUri;
};

export const getBookCover = (book: CoverBook, index = 0) => {
  if (book.cover_url) return book.cover_url;

  const title = book.title.trim();
  const generatedTitleMatch = generatedTitleCoverMap.find(({ match }) => match.test(title));
  if (generatedTitleMatch) {
    return createGeneratedCover(title, generatedTitleMatch.spec);
  }

  const identifier = `${book.genre ?? "unknown"}:${book.id || title}:${title}`;
  const generatedGenrePool = book.genre ? generatedGenreCoverPools[book.genre] : undefined;
  if (generatedGenrePool?.length) {
    return createGeneratedCover(title, pickFromPool(generatedGenrePool, identifier));
  }

  const mapped = titleCoverMap.find(({ match }) => match.test(title));
  if (mapped) return mapped.cover;

  const genrePool = book.genre ? genreCoverPools[book.genre] : undefined;
  if (genrePool?.length) {
    return pickFromPool(genrePool, identifier);
  }

  const hash = hashString(identifier || `${index}`);
  return allCovers[hash % allCovers.length];
};

export const fallbackCovers = allCovers;
