import vertexSource from "./shaders/vertex.glsl";
import fragmentSource from "./shaders/fragment.glsl";

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

export interface AsciiRenderer {
  render: () => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
}

export function createAsciiRenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): AsciiRenderer {
  const glOrNull = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!glOrNull) throw new Error("WebGL not supported");
  const gl: WebGLRenderingContext = glOrNull;

  const program = createProgram(gl, vertexSource, fragmentSource);

  // Fullscreen quad: two triangles covering [-1, 1]
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "aPosition");
  const uVideo = gl.getUniformLocation(program, "uVideo");
  const uResolution = gl.getUniformLocation(program, "uResolution");

  // Video texture
  const videoTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let videoReady = false;
  let playing = false;
  let timeUpdated = false;

  const onPlaying = () => {
    playing = true;
    if (timeUpdated) videoReady = true;
  };
  const onTimeUpdate = () => {
    timeUpdated = true;
    if (playing) videoReady = true;
  };

  video.addEventListener("playing", onPlaying);
  video.addEventListener("timeupdate", onTimeUpdate);

  let animFrameId = 0;

  function render() {
    if (videoReady) {
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
      );
    }

    gl.useProgram(program);
    gl.uniform1i(uVideo, 0);
    gl.uniform2f(uResolution, canvas.width, canvas.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animFrameId = requestAnimationFrame(render);
  }

  function resize(width: number, height: number) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("timeupdate", onTimeUpdate);
    gl.deleteTexture(videoTex);
    gl.deleteBuffer(posBuffer);
    gl.deleteProgram(program);
  }

  // Start render loop
  animFrameId = requestAnimationFrame(render);

  return { render, resize, destroy };
}
