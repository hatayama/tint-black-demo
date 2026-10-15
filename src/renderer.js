// 1 枚の画像に乗算・Tint Black・グラデーションマップを掛けて 2D canvas へ描き出す WebGL2 レンダラー。
// 計算は Unity 版のシェーダーと同じく linear 色空間で行い、閾値と輝度の参照位置は sRGB の値で扱う。

export const EffectMode = Object.freeze({
  original: 0,
  multiply: 1,
  tintBlack: 2,
  gradientMap: 3,
});

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  // 画像の 1 行目を上端に表示するため、v を上下反転する
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_image;     // premultiplied alpha, sRGB bytes
uniform sampler2D u_gradient;  // SRGB8_ALPHA8 なので sampling 結果は linear
uniform int u_mode;
uniform vec3 u_light;          // linear
uniform vec3 u_dark;           // linear
uniform vec3 u_levels;         // inBlack, inWhite, gamma（sRGB の値）

vec3 toLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec4 tex = texture(u_image, v_uv);
  if (tex.a <= 0.0) {
    outColor = vec4(0.0);
    return;
  }

  // 透明部分の黒が縁ににじまないよう premultiplied で補間したあと、straight に戻す
  vec3 srgb = tex.rgb / tex.a;
  vec3 lin = toLinear(srgb);
  vec3 color = lin;

  if (u_mode == 1) {
    color = lin * u_light;
  } else if (u_mode == 2) {
    float range = max(u_levels.y - u_levels.x, 1e-4);
    vec3 remapped = pow(clamp((srgb - u_levels.x) / range, 0.0, 1.0), vec3(1.0 / max(u_levels.z, 1e-4)));
    vec3 weight = toLinear(remapped);
    color = weight * u_light + (1.0 - weight) * u_dark;
  } else if (u_mode == 3) {
    float luma = dot(lin, vec3(0.2126, 0.7152, 0.0722));
    float t = toSrgb(vec3(luma)).x;
    color = texture(u_gradient, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb;
  }

  outColor = vec4(toSrgb(clamp(color, 0.0, 1.0)) * tex.a, tex.a);
}`;

/**
 * 効果を掛けた画像を描くレンダラーを作る。
 * setImage で元画像、setGradient でグラデーションを渡し、draw で指定 canvas に描く。
 */
export function createEffectRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) {
    throw new Error('WebGL2 is not available in this browser.');
  }

  const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const uniforms = {
    image: gl.getUniformLocation(program, 'u_image'),
    gradient: gl.getUniformLocation(program, 'u_gradient'),
    mode: gl.getUniformLocation(program, 'u_mode'),
    light: gl.getUniformLocation(program, 'u_light'),
    dark: gl.getUniformLocation(program, 'u_dark'),
    levels: gl.getUniformLocation(program, 'u_levels'),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const imageTexture = createTexture(gl);
  const gradientTexture = createTexture(gl);
  let hasImage = false;
  let hasGradient = false;

  return {
    /** 元画像を差し替える。描画解像度は画像と同じになる。 */
    setImage(source) {
      canvas.width = source.width;
      canvas.height = source.height;
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      // ブラウザの色管理で値が変わると Unity 版と結果がずれるため変換させない
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      hasImage = true;
    },

    /** bakeGradient で焼いた 1 行の RGBA8 を渡す。fixed は境界をにじませないよう補間しない。 */
    setGradient(pixels, mode) {
      gl.bindTexture(gl.TEXTURE_2D, gradientTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, pixels.length / 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const filter = mode === 'fixed' ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      hasGradient = true;
    },

    /**
     * mode の効果を掛けて target（2D canvas）に描く。
     * params: { light: [r,g,b] linear, dark: [r,g,b] linear, levels: { inBlack, inWhite, gamma } }
     */
    draw(mode, params, target) {
      if (!hasImage || !hasGradient) {
        throw new Error('setImage and setGradient must be called before draw.');
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.uniform1i(uniforms.image, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gradientTexture);
      gl.uniform1i(uniforms.gradient, 1);

      gl.uniform1i(uniforms.mode, mode);
      gl.uniform3fv(uniforms.light, params.light);
      gl.uniform3fv(uniforms.dark, params.dark);
      gl.uniform3f(uniforms.levels, params.levels.inBlack, params.levels.inWhite, params.levels.gamma);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // preserveDrawingBuffer なしでも、描画と同じタスク内ならバッファを読み出せる
      target.width = canvas.width;
      target.height = canvas.height;
      const ctx = target.getContext('2d');
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(canvas, 0, 0);
    },
  };
}

function createTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function linkProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`shader link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}
