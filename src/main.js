// デモ画面の状態管理と UI の結線。状態が変わるたびに 4 つのパネルを描き直す。
import { bakeGradient, evaluateGradient, hexToSrgb, normalizeLevels, srgbToHex, srgbToLinear } from './color.js';
import { createEffectRenderer, EffectMode } from './renderer.js';
import { IMAGES, PRESETS } from './presets.js';
import { applyLanguage, initialLanguage, t } from './i18n.js';

const GRADIENT_WIDTH = 256;
const MAX_STOPS = 8;
const MAX_UPLOAD_SIZE = 1024;
const LANG_STORAGE_KEY = 'tint-black-demo.lang';

const $ = (id) => document.getElementById(id);

const state = {
  lang: initialLanguage(localStorage.getItem(LANG_STORAGE_KEY), navigator.language || 'en'),
  imageId: 'slime',
  light: '#ffffff',
  dark: '#000000',
  levels: { inBlack: 0, inWhite: 1, gamma: 1 },
  gradient: { mode: 'blend', stops: [] },
};

const sources = new Map();
let renderer;
let renderQueued = false;

main().catch((error) => {
  console.error(error);
  $('error').hidden = false;
});

async function main() {
  applyLanguage(document, state.lang);
  renderer = createEffectRenderer();
  await loadImages();
  buildImageButtons();
  buildPresetButtons();
  bindControls();
  applyPreset(PRESETS[0]);
}

async function loadImages() {
  await Promise.all(IMAGES.map(async ({ id, src }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    sources.set(id, img);
  }));
}

function buildImageButtons() {
  const container = $('image-buttons');
  for (const { id } of IMAGES) {
    const button = makeButton(`image.${id}`, () => {
      selectImage(id);
      clearActivePreset();
    });
    button.dataset.imageId = id;
    container.append(button);
  }
}

function buildPresetButtons() {
  const container = $('preset-buttons');
  for (const preset of PRESETS) {
    const button = makeButton(`preset.${preset.id}`, () => applyPreset(preset));
    button.dataset.presetId = preset.id;
    container.append(button);
  }
}

function makeButton(i18nKey, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.i18n = i18nKey;
  button.textContent = t(state.lang, i18nKey);
  button.addEventListener('click', onClick);
  return button;
}

function bindControls() {
  for (const lang of ['ja', 'en']) {
    $(`lang-${lang}`).addEventListener('click', () => setLanguage(lang));
  }
  syncLanguageButtons();

  for (const id of ['mul-light', 'tb-light']) {
    $(id).addEventListener('input', (e) => {
      state.light = e.target.value;
      syncColorInputs();
      onManualChange();
    });
  }
  $('tb-dark').addEventListener('input', (e) => {
    state.dark = e.target.value;
    onManualChange();
  });

  for (const key of ['inBlack', 'inWhite', 'gamma']) {
    $(key).addEventListener('input', (e) => {
      state.levels = normalizeLevels({ ...state.levels, [key]: Number(e.target.value) }, key);
      syncLevelInputs();
      onManualChange();
    });
  }
  $('reset-levels').addEventListener('click', () => {
    state.levels = { inBlack: 0, inWhite: 1, gamma: 1 };
    syncLevelInputs();
    onManualChange();
  });

  for (const mode of ['blend', 'fixed']) {
    $(`mode-${mode}`).addEventListener('change', () => {
      state.gradient.mode = mode;
      onManualChange();
    });
  }
  $('add-stop').addEventListener('click', addStop);

  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    sources.set('upload', await fitImage(await createImageBitmap(file)));
    selectImage('upload');
    clearActivePreset();
    e.target.value = '';
  });
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyLanguage(document, lang);
  syncLanguageButtons();
  buildStopList();
}

function syncLanguageButtons() {
  for (const lang of ['ja', 'en']) {
    $(`lang-${lang}`).setAttribute('aria-pressed', String(state.lang === lang));
  }
}

function applyPreset(preset) {
  state.light = preset.light;
  state.dark = preset.dark;
  state.levels = { ...preset.levels };
  state.gradient = { mode: preset.gradient.mode, stops: preset.gradient.stops.map((s) => ({ ...s })) };
  selectImage(preset.image);
  syncColorInputs();
  syncLevelInputs();
  syncModeInputs();
  buildStopList();
  for (const button of $('preset-buttons').children) {
    button.setAttribute('aria-pressed', String(button.dataset.presetId === preset.id));
  }
  showPresetNote(preset.id);
  requestRender();
}

// 手で値を変えたあとも、最後に選んだプリセットの意図は読めるよう説明は残す
function showPresetNote(presetId) {
  const note = $('preset-note');
  note.dataset.i18n = `presetNote.${presetId}`;
  note.textContent = t(state.lang, note.dataset.i18n);
  note.hidden = false;
}

function onManualChange() {
  clearActivePreset();
  requestRender();
}

function clearActivePreset() {
  for (const button of $('preset-buttons').children) {
    button.setAttribute('aria-pressed', 'false');
  }
}

function selectImage(id) {
  const source = sources.get(id);
  if (!source) {
    throw new RangeError(`unknown image "${id}"`);
  }
  state.imageId = id;
  renderer.setImage(source);
  for (const button of $('image-buttons').children) {
    button.setAttribute('aria-pressed', String(button.dataset.imageId === id));
  }
  requestRender();
}

function syncColorInputs() {
  $('mul-light').value = state.light;
  $('tb-light').value = state.light;
  $('tb-dark').value = state.dark;
}

function syncLevelInputs() {
  for (const key of ['inBlack', 'inWhite', 'gamma']) {
    $(key).value = String(state.levels[key]);
    $(`${key}-value`).textContent = state.levels[key].toFixed(2);
  }
}

function syncModeInputs() {
  $(`mode-${state.gradient.mode}`).checked = true;
}

// キーの追加・削除・プリセット適用のときだけ一覧を作り直す。色や位置の変更では作り直さず、ドラッグ中のフォーカスを保つ
function buildStopList() {
  const list = $('stops');
  list.replaceChildren();
  state.gradient.stops.sort((a, b) => a.time - b.time);
  state.gradient.stops.forEach((stop, index) => {
    const row = document.createElement('li');

    const color = document.createElement('input');
    color.type = 'color';
    color.value = stop.color;
    color.setAttribute('aria-label', `${t(state.lang, 'gradientHeading')} ${index + 1}`);
    color.addEventListener('input', (e) => {
      stop.color = e.target.value;
      onManualChange();
    });

    const time = document.createElement('input');
    time.type = 'range';
    time.min = '0';
    time.max = '1';
    time.step = '0.01';
    time.value = String(stop.time);
    const timeValue = document.createElement('output');
    timeValue.textContent = stop.time.toFixed(2);
    time.addEventListener('input', (e) => {
      stop.time = Number(e.target.value);
      timeValue.textContent = stop.time.toFixed(2);
      onManualChange();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = t(state.lang, 'removeStop');
    remove.setAttribute('aria-label', t(state.lang, 'removeStop'));
    // グラデーションは最低 1 キー必要なので、最後の 1 つは消せない
    remove.disabled = state.gradient.stops.length <= 1;
    remove.addEventListener('click', () => {
      state.gradient.stops.splice(index, 1);
      buildStopList();
      onManualChange();
    });

    row.append(color, time, timeValue, remove);
    list.append(row);
  });
  $('add-stop').disabled = state.gradient.stops.length >= MAX_STOPS;
}

// 一番広く空いている区間の中央に、その位置の今の色でキーを足す（見た目を変えずに編集点だけ増やす）
function addStop() {
  const times = [0, ...state.gradient.stops.map((s) => s.time).sort((a, b) => a - b), 1];
  let best = 0;
  for (let i = 1; i < times.length - 1; i++) {
    if (times[i + 1] - times[i] > times[best + 1] - times[best]) {
      best = i;
    }
  }
  const time = Math.round(((times[best] + times[best + 1]) / 2) * 100) / 100;
  const color = srgbToHex(evaluateGradient(srgbStops(), state.gradient.mode, time));
  state.gradient.stops.push({ time, color });
  buildStopList();
  onManualChange();
}

function srgbStops() {
  return state.gradient.stops.map((s) => ({ time: s.time, color: hexToSrgb(s.color) }));
}

function requestRender() {
  if (renderQueued) {
    return;
  }
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  const pixels = bakeGradient(srgbStops(), state.gradient.mode, GRADIENT_WIDTH);
  renderer.setGradient(pixels, state.gradient.mode);
  drawGradientPreview(pixels);

  const params = {
    light: hexToSrgb(state.light).map(srgbToLinear),
    dark: hexToSrgb(state.dark).map(srgbToLinear),
    levels: state.levels,
  };
  renderer.draw(EffectMode.original, params, $('canvas-original'));
  renderer.draw(EffectMode.multiply, params, $('canvas-multiply'));
  renderer.draw(EffectMode.tintBlack, params, $('canvas-tintBlack'));
  renderer.draw(EffectMode.gradientMap, params, $('canvas-gradientMap'));
}

function drawGradientPreview(pixels) {
  const canvas = $('gradient-preview');
  canvas.width = GRADIENT_WIDTH;
  canvas.height = 1;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels), GRADIENT_WIDTH, 1), 0, 0);
}

// 大きすぎる画像は描画が重くなるため、長辺を MAX_UPLOAD_SIZE に縮める
async function fitImage(bitmap) {
  const scale = Math.min(1, MAX_UPLOAD_SIZE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    return bitmap;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}
