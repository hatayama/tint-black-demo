// 色空間の変換、Unity の Gradient と同じ規則での評価、入力レベルの補正をまとめた純粋関数群。
// 色はすべて 0〜1 の [r, g, b] 配列で扱う。

const MIN_LEVEL_RANGE = 0.01;

/** カラーピッカーの "#rrggbb" を sRGB の [r, g, b] に変換する。 */
export function hexToSrgb(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new RangeError(`expected #rrggbb but got "${hex}"`);
  }
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

/** sRGB の [r, g, b] をカラーピッカー用の "#rrggbb" に変換する。 */
export function srgbToHex(color) {
  return `#${color.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

/**
 * Unity の Gradient と同じ規則で時刻 t の色を返す。
 * blend はキー間を sRGB 値のまま直線補間し、fixed は t 以上で最初のキーの色を返す。
 */
export function evaluateGradient(stops, mode, t) {
  if (stops.length === 0) {
    throw new RangeError('gradient needs at least one key');
  }
  if (mode !== 'blend' && mode !== 'fixed') {
    throw new RangeError(`unknown gradient mode "${mode}"`);
  }

  const sorted = [...stops].sort((a, b) => a.time - b.time);
  const next = sorted.findIndex((s) => s.time >= t);
  if (next === -1) {
    return [...sorted[sorted.length - 1].color];
  }
  if (next === 0 || mode === 'fixed') {
    return [...sorted[next].color];
  }

  const a = sorted[next - 1];
  const b = sorted[next];
  const k = (t - a.time) / (b.time - a.time);
  return a.color.map((v, i) => v + (b.color[i] - v) * k);
}

/** グラデーションを幅 width の 1 行 RGBA8 画素列に焼く（シェーダーで輝度から色を引くためのテクスチャ）。 */
export function bakeGradient(stops, mode, width) {
  const pixels = new Uint8Array(width * 4);
  for (let x = 0; x < width; x++) {
    const color = evaluateGradient(stops, mode, x / (width - 1));
    pixels.set([...color.map((v) => Math.round(clamp01(v) * 255)), 255], x * 4);
  }
  return pixels;
}

/**
 * In Black < In White を保つよう補正する。
 * スライダーは個別に動くため、追い越されたら動かした側（edited）を優先し、もう一方を押し出す。
 */
export function normalizeLevels(levels, edited) {
  const { inBlack, inWhite, gamma } = levels;
  if (inWhite - inBlack >= MIN_LEVEL_RANGE) {
    return { inBlack, inWhite, gamma };
  }

  if (edited === 'inWhite') {
    const white = Math.max(inWhite, MIN_LEVEL_RANGE);
    return { inBlack: round4(white - MIN_LEVEL_RANGE), inWhite: round4(white), gamma };
  }

  const black = Math.min(inBlack, 1 - MIN_LEVEL_RANGE);
  return { inBlack: round4(black), inWhite: round4(black + MIN_LEVEL_RANGE), gamma };
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// スライダーの刻み（0.01）に揃え、浮動小数の誤差で 0.70999… のような値を UI に出さないため
function round4(v) {
  return Math.round(v * 10000) / 10000;
}
