# Tint Black / Gradient Map Demo

同じ画像に「乗算」「Tint Black（2 色ティント）」「グラデーションマップ」を掛けて比べる、ブラウザで動くインタラクティブなデモです。

An interactive browser demo that compares Multiply, Tint Black (two-color tint) and Gradient Map on the same image.

**Demo:** https://hatayama.github.io/tint-black-demo/

## 計算式 / Formulas

| 効果 / Effect | 出力 / Output |
|---|---|
| 乗算 / Multiply | `src × Light` |
| Tint Black | `src × Light + (1 − src) × Dark`（RGB チャンネルごと / per RGB channel） |
| グラデーションマップ / Gradient Map | `gradient(luminance(src))` |

- 計算は linear 色空間で行います。Tint Black の入力レベル（In Black / In White / Gamma）とグラデーションの参照位置は sRGB の値で扱います。
- Blending is done in linear color space. Tint Black input levels and the gradient lookup position use sRGB values.

## ローカルで動かす / Run locally

ES modules を使うため、HTTP サーバー経由で開いてください。
ES modules require serving over HTTP.

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

## テスト / Tests

```sh
node --test
```

## 画像 / Images

`assets/` の画像はこのデモのためにプログラムで生成したものです。
The images in `assets/` were generated programmatically for this demo.

## ライセンス / License

[MIT](LICENSE)
