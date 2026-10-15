import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToSrgb,
  srgbToHex,
  srgbToLinear,
  linearToSrgb,
  evaluateGradient,
  bakeGradient,
  normalizeLevels,
} from '../src/color.js';

const EPS = 1e-4;

function assertColorClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) < EPS, `channel ${i}: ${actual[i]} !== ${expected[i]}`);
  }
}

/** カラーピッカーの #rrggbb を 0〜1 の sRGB 値に変換できること */
test('hexToSrgb parses #rrggbb', () => {
  assertColorClose(hexToSrgb('#ff8000'), [1, 128 / 255, 0]);
});

/** 不正な色文字列は黙って黒にせず拒否すること */
test('hexToSrgb rejects malformed input', () => {
  assert.throws(() => hexToSrgb('ff8000'), RangeError);
  assert.throws(() => hexToSrgb('#ff80'), RangeError);
  assert.throws(() => hexToSrgb('#gg0000'), RangeError);
});

test('srgbToHex round-trips hexToSrgb', () => {
  assert.equal(srgbToHex(hexToSrgb('#12abef')), '#12abef');
});

/** sRGB の中間値 0.5 が linear で約 0.214 になる（Unity の linear プロジェクトと同じ変換） */
test('srgbToLinear matches the exact sRGB curve', () => {
  assert.ok(Math.abs(srgbToLinear(0.5) - 0.214041) < EPS);
  assert.equal(srgbToLinear(0), 0);
  assert.equal(srgbToLinear(1), 1);
});

test('linearToSrgb inverts srgbToLinear', () => {
  for (const v of [0, 0.01, 0.2, 0.5, 0.9, 1]) {
    assert.ok(Math.abs(linearToSrgb(srgbToLinear(v)) - v) < EPS);
  }
});

const BLACK = [0, 0, 0];
const WHITE = [1, 1, 1];

/** Blend モードは sRGB 値のままキー間を直線補間する（Unity の Gradient 既定と同じ） */
test('evaluateGradient blends between keys in sRGB space', () => {
  const stops = [{ time: 0, color: BLACK }, { time: 1, color: WHITE }];
  assertColorClose(evaluateGradient(stops, 'blend', 0.25), [0.25, 0.25, 0.25]);
});

test('evaluateGradient clamps to the first and last keys outside their range', () => {
  const stops = [{ time: 0.2, color: BLACK }, { time: 0.8, color: WHITE }];
  assertColorClose(evaluateGradient(stops, 'blend', 0), BLACK);
  assertColorClose(evaluateGradient(stops, 'blend', 1), WHITE);
});

/** キーの並び順に依存せず評価できること */
test('evaluateGradient accepts unsorted keys', () => {
  const stops = [{ time: 1, color: WHITE }, { time: 0, color: BLACK }];
  assertColorClose(evaluateGradient(stops, 'blend', 0.5), [0.5, 0.5, 0.5]);
});

/** Fixed モードは補間せず、t 以上で最初のキーの色を返す（Unity の GradientMode.Fixed と同じ） */
test('evaluateGradient in fixed mode uses the first key at or after t', () => {
  const purple = [0.6, 0.25, 0.95];
  const orange = [0.95, 0.5, 0.25];
  const cream = [1, 0.95, 0.75];
  const stops = [{ time: 0.55, color: purple }, { time: 0.8, color: orange }, { time: 1, color: cream }];
  assertColorClose(evaluateGradient(stops, 'fixed', 0.3), purple);
  assertColorClose(evaluateGradient(stops, 'fixed', 0.55), purple);
  assertColorClose(evaluateGradient(stops, 'fixed', 0.6), orange);
  assertColorClose(evaluateGradient(stops, 'fixed', 0.9), cream);
});

test('evaluateGradient rejects an empty key list and unknown modes', () => {
  assert.throws(() => evaluateGradient([], 'blend', 0.5), RangeError);
  assert.throws(() => evaluateGradient([{ time: 0, color: BLACK }], 'smooth', 0.5), RangeError);
});

/** シェーダーに渡す横長テクスチャの両端がグラデーションの両端の色になること */
test('bakeGradient writes RGBA8 pixels from left to right', () => {
  const pixels = bakeGradient([{ time: 0, color: BLACK }, { time: 1, color: WHITE }], 'blend', 4);
  assert.equal(pixels.length, 16);
  assert.deepEqual([...pixels.slice(0, 4)], [0, 0, 0, 255]);
  assert.deepEqual([...pixels.slice(12, 16)], [255, 255, 255, 255]);
});

/** In White が In Black を追い越したら、動かした側を優先してもう一方を押し出す */
test('normalizeLevels keeps inWhite above inBlack, favoring the edited value', () => {
  assert.deepEqual(normalizeLevels({ inBlack: 0.7, inWhite: 0.6, gamma: 1 }, 'inBlack'), { inBlack: 0.7, inWhite: 0.71, gamma: 1 });
  assert.deepEqual(normalizeLevels({ inBlack: 0.7, inWhite: 0.6, gamma: 1 }, 'inWhite'), { inBlack: 0.59, inWhite: 0.6, gamma: 1 });
});

test('normalizeLevels leaves valid levels untouched', () => {
  assert.deepEqual(normalizeLevels({ inBlack: 0.2, inWhite: 0.8, gamma: 2 }, 'inBlack'), { inBlack: 0.2, inWhite: 0.8, gamma: 2 });
});

/** 端に寄せても 0〜1 の範囲と最小幅を保つ */
test('normalizeLevels stays within 0..1 at the edges', () => {
  assert.deepEqual(normalizeLevels({ inBlack: 1, inWhite: 1, gamma: 1 }, 'inBlack'), { inBlack: 0.99, inWhite: 1, gamma: 1 });
  assert.deepEqual(normalizeLevels({ inBlack: 0, inWhite: 0, gamma: 1 }, 'inWhite'), { inBlack: 0, inWhite: 0.01, gamma: 1 });
});
