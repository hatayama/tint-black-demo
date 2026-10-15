import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGES, PRESETS } from '../src/presets.js';
import { LANGUAGES, t } from '../src/i18n.js';

/** どのプリセットを選んでも、どの言語でも名前と説明文が表示できること */
test('every preset has a name and a note in every language', () => {
  for (const lang of LANGUAGES) {
    for (const preset of PRESETS) {
      assert.doesNotThrow(() => t(lang, `preset.${preset.id}`), `${lang}: preset.${preset.id}`);
      assert.doesNotThrow(() => t(lang, `presetNote.${preset.id}`), `${lang}: presetNote.${preset.id}`);
    }
  }
});

test('every preset refers to an existing image', () => {
  const imageIds = IMAGES.map((image) => image.id);
  for (const preset of PRESETS) {
    assert.ok(imageIds.includes(preset.image), `${preset.id} uses unknown image ${preset.image}`);
  }
});

/** 単色塗りつぶしは Dark・Light・グラデーション両端がすべて同じ色でないと、塗りつぶしにならない */
test('solid fill preset uses one color everywhere', () => {
  const fill = PRESETS.find((preset) => preset.id === 'solidFill');
  assert.ok(fill, 'solidFill preset exists');
  assert.equal(fill.dark, fill.light);
  for (const stop of fill.gradient.stops) {
    assert.equal(stop.color, fill.light);
  }
});
