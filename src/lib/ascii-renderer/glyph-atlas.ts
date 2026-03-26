export interface GlyphAtlas {
  texture: WebGLTexture;
  charWidth: number;
  charHeight: number;
  charCount: number;
}

export function createGlyphAtlas(
  gl: WebGLRenderingContext,
  characters: string,
  fontSize: number
): GlyphAtlas {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for glyph atlas");

  const font = `${fontSize}px "Courier New", Courier, monospace`;
  ctx.font = font;

  const metrics = ctx.measureText("M");
  const charWidth = Math.ceil(metrics.width);
  const charHeight = Math.ceil(fontSize * 1.2);

  canvas.width = charWidth * characters.length;
  canvas.height = charHeight;

  // Re-set font after canvas resize (resets context state)
  ctx.font = font;
  ctx.fillStyle = "white";
  ctx.textBaseline = "top";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < characters.length; i++) {
    ctx.fillText(characters[i], i * charWidth, 0);
  }

  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create glyph atlas texture");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return { texture, charWidth, charHeight, charCount: characters.length };
}
