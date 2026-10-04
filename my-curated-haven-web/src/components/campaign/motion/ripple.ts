const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * A soft lens under the pointer with a few slow rings around it, like looking
 * at the plate through a glass of water. Texture coordinates repeat the
 * <img>'s object-fit: cover crop, so at rest the canvas matches the photo.
 */
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_size;
uniform vec2 u_scale;
uniform vec2 u_offset;
uniform vec2 u_pointer;
uniform float u_strength;
uniform float u_time;
varying vec2 v_uv;
void main() {
  vec2 aspect = vec2(u_size.x / u_size.y, 1.0);
  vec2 delta = (v_uv - u_pointer) * aspect;
  float distance = length(delta);
  float lens = smoothstep(0.36, 0.0, distance);
  vec2 direction = delta / max(distance, 0.0001);
  float rings = sin(distance * 30.0 - u_time * 3.2) * 0.007 * lens;
  vec2 shift = (-delta * lens * 0.24 + direction * rings) * u_strength / aspect;
  vec2 uv = (v_uv + shift) * u_scale + u_offset;
  gl_FragColor = texture2D(u_texture, clamp(uv, 0.0, 1.0));
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** "48% 40%" → [0.48, 0.4]. Keywords and anything else fall back to the centre. */
function focus(position: string): [number, number] {
  const parts = position.split(/\s+/).map((part) => (part.endsWith("%") ? parseFloat(part) / 100 : 0.5));
  return [Number.isFinite(parts[0]) ? parts[0] : 0.5, Number.isFinite(parts[1]) ? parts[1] : 0.5];
}

/**
 * Draws the hero photo through WebGL while a mouse is over it, then hands
 * back to the <img>. Large screens with a mouse and motion allowed only; if
 * WebGL, the shaders or the image fail, nothing changes.
 */
export function setupRipple(arch: HTMLElement): () => void {
  const image = arch.querySelector("img");
  if (!image) return () => {};

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return () => {};

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return () => {};
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    size: uniform("u_size"),
    scale: uniform("u_scale"),
    offset: uniform("u_offset"),
    pointer: uniform("u_pointer"),
    strength: uniform("u_strength"),
    time: uniform("u_time"),
  };

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let ready = false;
  let naturalWidth = 1;
  let naturalHeight = 1;
  let frame = 0;
  let hovering = false;
  let strength = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;
  const started = performance.now();

  const fit = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = arch.clientWidth;
    const height = arch.clientHeight;
    if (!width || !height) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // object-fit: cover, positioned like the <img>.
    const cover = Math.max(width / naturalWidth, height / naturalHeight);
    const drawnWidth = naturalWidth * cover;
    const drawnHeight = naturalHeight * cover;
    const [fx, fy] = focus(getComputedStyle(image).objectPosition);
    gl.uniform2f(u.size, width, height);
    gl.uniform2f(u.scale, width / drawnWidth, height / drawnHeight);
    gl.uniform2f(u.offset, (-(width - drawnWidth) * fx) / drawnWidth, (-(height - drawnHeight) * fy) / drawnHeight);
  };

  const draw = () => {
    frame = 0;
    strength += ((hovering ? 1 : 0) - strength) * 0.08;
    pointerX += (targetX - pointerX) * 0.12;
    pointerY += (targetY - pointerY) * 0.12;
    gl.uniform2f(u.pointer, pointerX, pointerY);
    gl.uniform1f(u.strength, strength);
    gl.uniform1f(u.time, (performance.now() - started) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (hovering || strength > 0.004) frame = requestAnimationFrame(draw);
    else arch.removeAttribute("data-rippling");
  };

  const source = new Image();
  source.decoding = "async";
  source.onload = () => {
    naturalWidth = source.naturalWidth || 1;
    naturalHeight = source.naturalHeight || 1;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    fit();
    ready = true;
  };
  // The <img> already holds this file, so this is a cache hit.
  source.src = image.currentSrc || image.src;

  const aim = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    targetX = (event.clientX - box.left) / box.width;
    targetY = (event.clientY - box.top) / box.height;
  };
  const enter = (event: PointerEvent) => {
    if (!ready || event.pointerType !== "mouse") return;
    aim(event);
    if (!hovering) {
      pointerX = targetX;
      pointerY = targetY;
    }
    hovering = true;
    arch.setAttribute("data-rippling", "");
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const move = (event: PointerEvent) => {
    if (!hovering) return enter(event);
    aim(event);
  };
  const leave = () => {
    hovering = false;
  };
  const lost = (event: Event) => {
    event.preventDefault();
    hovering = false;
    ready = false;
    arch.removeAttribute("data-rippling");
  };

  arch.appendChild(canvas);
  arch.addEventListener("pointerenter", enter);
  arch.addEventListener("pointermove", move);
  arch.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", lost);
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => ready && fit());
  resize?.observe(arch);

  return () => {
    cancelAnimationFrame(frame);
    resize?.disconnect();
    arch.removeEventListener("pointerenter", enter);
    arch.removeEventListener("pointermove", move);
    arch.removeEventListener("pointerleave", leave);
    canvas.removeEventListener("webglcontextlost", lost);
    arch.removeAttribute("data-rippling");
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
