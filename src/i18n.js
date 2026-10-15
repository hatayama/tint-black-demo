// 画面の文言（日本語 / 英語）と、data-i18n 属性を持つ要素への反映。

const STRINGS = {
  ja: {
    title: 'Tint Black とグラデーションマップ',
    lead: '同じ画像に「乗算」「Tint Black」「グラデーションマップ」を掛けて比べるデモです。色や閾値を動かすと、その場で結果が変わります。',
    imageHeading: '画像',
    'image.slime': 'スライム（白黒）',
    'image.colorSlimes': 'スライム（赤・緑・青）',
    'image.buttonOk': 'OK ボタン',
    'image.testPattern': 'テストパターン',
    upload: '自分の画像を使う',
    uploadNote: '画像はブラウザ内だけで処理され、どこにも送信されません。',
    presetHeading: 'プリセット',
    'preset.grayscale': '白黒画像・2色',
    'preset.colored': '色付き画像・2色',
    'preset.threeColors': '3色',
    'preset.toonSteps': 'トゥーン調の段階',
    'preset.whiteFlash': '白フラッシュ',
    'preset.damage': '黒い文字だけ赤に',
    'panel.original': 'オリジナル',
    'panel.multiply': '乗算',
    'panel.tintBlack': 'Tint Black',
    'panel.gradientMap': 'グラデーションマップ',
    'caption.original': '元の画像',
    'caption.multiply': '通常のティント（Image.color）。指定は Light の 1 色。',
    'caption.tintBlack': '2 色ティント。指定は Dark と Light の 2 色。',
    'caption.gradientMap': '明るさだけを見て、グラデーションの色で塗り直す。',
    light: 'Light',
    dark: 'Dark',
    levelsHeading: '入力レベル（閾値）',
    inBlack: 'In Black',
    inWhite: 'In White',
    gamma: 'Gamma',
    resetLevels: 'リセット',
    gradientHeading: 'グラデーション',
    'mode.blend': 'Blend（なめらか）',
    'mode.fixed': 'Fixed（段階）',
    addStop: '+ キーを追加',
    removeStop: '削除',
    explainHeading: '仕組み',
    'explain.multiply.title': '乗算',
    'explain.multiply.body': '出力 = 元の色 × Light。白は Light 色になりますが、黒は何を掛けても黒のまま残ります。',
    'explain.tintBlack.title': 'Tint Black',
    'explain.tintBlack.body': 'RGB のチャンネルごとに、黒を Dark 色、白を Light 色へ置き換えて間を補間します。出力 = 元の色 × Light + (1 − 元の色) × Dark。黒にも色が付き、元の色の違いも残ります。',
    'explain.levels.title': '入力レベル（Tint Black）',
    'explain.levels.body': '元の値が In Black 以下なら完全に Dark、In White 以上なら完全に Light になります。2 つを近づけるとくっきり 2 色に分かれ、トゥーン調になります。Gamma は中間を Dark 寄り（1 未満）か Light 寄り（1 より大きい）にします。',
    'explain.gradientMap.title': 'グラデーションマップ',
    'explain.gradientMap.body': '元の色を明るさ（輝度）1 つの値にまとめ、その位置にあるグラデーションの色で塗ります。元の色相は捨てるので、明るさが同じなら赤も緑も同じ色になります。色はいくつでも置けます。',
    'explain.fixed.title': 'Fixed モード',
    'explain.fixed.body': 'グラデーションのキーの間を補間せず、色を切り替えます。キーを増やせば何段階でも塗り分けられます（Tint Black の入力レベルでは 2 段階まで）。',
    footerImages: '画像はこのデモのためにプログラムで生成したものです。',
    footerSpine: 'Spine の Tint Black（スロットの説明）',
    webglError: 'このブラウザでは WebGL2 が使えないため、デモを表示できません。',
  },
  en: {
    title: 'Tint Black and Gradient Map',
    lead: 'Compare "Multiply", "Tint Black" and "Gradient Map" on the same image. Change the colors and thresholds to see the result update live.',
    imageHeading: 'Image',
    'image.slime': 'Slime (grayscale)',
    'image.colorSlimes': 'Slimes (red, green, blue)',
    'image.buttonOk': 'OK button',
    'image.testPattern': 'Test pattern',
    upload: 'Use your own image',
    uploadNote: 'Images are processed in your browser only and never uploaded.',
    presetHeading: 'Presets',
    'preset.grayscale': 'Grayscale, 2 colors',
    'preset.colored': 'Colored source, 2 colors',
    'preset.threeColors': '3 colors',
    'preset.toonSteps': 'Toon steps',
    'preset.whiteFlash': 'White flash',
    'preset.damage': 'Turn only black text red',
    'panel.original': 'Original',
    'panel.multiply': 'Multiply',
    'panel.tintBlack': 'Tint Black',
    'panel.gradientMap': 'Gradient Map',
    'caption.original': 'Source image',
    'caption.multiply': 'Regular tint (Image.color). One color: Light.',
    'caption.tintBlack': 'Two-color tint. Two colors: Dark and Light.',
    'caption.gradientMap': 'Repaints by brightness only, using the gradient colors.',
    light: 'Light',
    dark: 'Dark',
    levelsHeading: 'Input levels (thresholds)',
    inBlack: 'In Black',
    inWhite: 'In White',
    gamma: 'Gamma',
    resetLevels: 'Reset',
    gradientHeading: 'Gradient',
    'mode.blend': 'Blend (smooth)',
    'mode.fixed': 'Fixed (steps)',
    addStop: '+ Add key',
    removeStop: 'Remove',
    explainHeading: 'How it works',
    'explain.multiply.title': 'Multiply',
    'explain.multiply.body': 'Output = source × Light. White becomes the Light color, but black stays black no matter what you multiply it by.',
    'explain.tintBlack.title': 'Tint Black',
    'explain.tintBlack.body': 'Per RGB channel, black is replaced by the Dark color and white by the Light color, interpolating in between. Output = source × Light + (1 − source) × Dark. Black gets colored, and differences between source colors are kept.',
    'explain.levels.title': 'Input levels (Tint Black)',
    'explain.levels.body': 'Values at or below In Black become fully Dark, values at or above In White become fully Light. Bring them close together for a hard two-tone, toon-like look. Gamma pushes the midtones toward Dark (below 1) or Light (above 1).',
    'explain.gradientMap.title': 'Gradient Map',
    'explain.gradientMap.body': 'The source color is reduced to a single brightness (luminance) value, then painted with the gradient color at that position. Hue is discarded, so red and green of equal brightness end up the same color. Any number of colors can be used.',
    'explain.fixed.title': 'Fixed mode',
    'explain.fixed.body': 'Switches colors at each gradient key instead of blending between them. Add keys for as many steps as you like (Tint Black input levels can only make two).',
    footerImages: 'The images were generated programmatically for this demo.',
    footerSpine: 'Tint Black in Spine (slots documentation)',
    webglError: 'This browser does not support WebGL2, so the demo cannot be shown.',
  },
};

const SPINE_DOC_URL = {
  ja: 'https://ja.esotericsoftware.com/spine-slots#%E3%83%86%E3%82%A3%E3%83%B3%E3%83%88%E3%83%96%E3%83%A9%E3%83%83%E3%82%AF',
  en: 'https://esotericsoftware.com/spine-slots#Tint-black',
};

export const LANGUAGES = Object.freeze(Object.keys(STRINGS));

/** 保存済みの選択、なければブラウザの言語から初期言語を決める。 */
export function initialLanguage(saved, browserLanguage) {
  if (LANGUAGES.includes(saved)) {
    return saved;
  }
  return browserLanguage.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function t(lang, key) {
  const value = STRINGS[lang][key];
  if (value === undefined) {
    throw new RangeError(`missing string "${key}" for "${lang}"`);
  }
  return value;
}

/** data-i18n 属性を持つ要素の文言と、Spine へのリンク先を言語に合わせて差し替える。 */
export function applyLanguage(root, lang) {
  root.documentElement.lang = lang;
  root.title = t(lang, 'title');
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(lang, el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-spine-link]')) {
    el.href = SPINE_DOC_URL[lang];
  }
}
