// デモで選べる画像と、Unity 版の比較シーンと同じ条件を再現するプリセット。

export const IMAGES = Object.freeze([
  { id: 'slime', src: 'assets/slime.png' },
  { id: 'colorSlimes', src: 'assets/color-slimes.png' },
  { id: 'buttonOk', src: 'assets/button-ok.png' },
  { id: 'testPattern', src: 'assets/test-pattern.png' },
]);

const SKY = '#8cd9ff';
const MAGENTA = '#f21abf';
const YELLOW = '#fff259';
const ORANGE = '#f28040';
const PURPLE = '#9940f2';
const CREAM = '#fff2bf';
const WHITE = '#ffffff';
const RED = '#cc0000';

const DEFAULT_LEVELS = Object.freeze({ inBlack: 0, inWhite: 1, gamma: 1 });

export const PRESETS = Object.freeze([
  {
    id: 'grayscale',
    image: 'slime',
    light: SKY,
    dark: MAGENTA,
    levels: DEFAULT_LEVELS,
    gradient: { mode: 'blend', stops: [{ time: 0, color: MAGENTA }, { time: 1, color: SKY }] },
  },
  {
    id: 'colored',
    image: 'colorSlimes',
    light: SKY,
    dark: MAGENTA,
    levels: DEFAULT_LEVELS,
    gradient: { mode: 'blend', stops: [{ time: 0, color: MAGENTA }, { time: 1, color: SKY }] },
  },
  {
    id: 'threeColors',
    image: 'slime',
    light: YELLOW,
    dark: MAGENTA,
    levels: DEFAULT_LEVELS,
    gradient: { mode: 'blend', stops: [{ time: 0, color: MAGENTA }, { time: 0.5, color: ORANGE }, { time: 1, color: YELLOW }] },
  },
  {
    id: 'toonSteps',
    image: 'slime',
    light: CREAM,
    dark: PURPLE,
    levels: { inBlack: 0.6, inWhite: 0.65, gamma: 1 },
    gradient: { mode: 'fixed', stops: [{ time: 0.55, color: PURPLE }, { time: 0.8, color: ORANGE }, { time: 1, color: CREAM }] },
  },
  {
    id: 'whiteFlash',
    image: 'slime',
    light: WHITE,
    dark: WHITE,
    levels: DEFAULT_LEVELS,
    gradient: { mode: 'blend', stops: [{ time: 0, color: WHITE }, { time: 1, color: WHITE }] },
  },
  {
    id: 'damage',
    image: 'buttonOk',
    light: WHITE,
    dark: RED,
    levels: DEFAULT_LEVELS,
    gradient: { mode: 'blend', stops: [{ time: 0, color: RED }, { time: 1, color: WHITE }] },
  },
]);
