/**
 * Lightweight image-to-ASCII dissolve engine.
 * Converts an image to ASCII by sampling pixel brightness,
 * then renders a blend between the original image and its ASCII form.
 */

const CHAR_RAMP = " .:-=+*#%@";
const FONT = "Courier New, monospace";

interface AsciiGrid {
  chars: string[];
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
}

function computeGrid(
  imageData: ImageData,
  width: number,
  height: number,
  fontSize: number
): AsciiGrid {
  const cellW = fontSize * 0.6;
  const cellH = fontSize;
  const cols = Math.floor(width / cellW);
  const rows = Math.floor(height / cellH);
  const chars: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sampleX = Math.floor((col / cols) * width);
      const sampleY = Math.floor((row / rows) * height);
      const i = (sampleY * width + sampleX) * 4;

      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      const charIndex = Math.floor(
        (brightness / 255) * (CHAR_RAMP.length - 1)
      );
      chars.push(CHAR_RAMP[charIndex]);
    }
  }

  return { chars, cols, rows, cellW, cellH };
}

export interface DissolveState {
  grid: AsciiGrid;
  image: HTMLImageElement;
  width: number;
  height: number;
  fontSize: number;
}

export function prepareDissolve(
  image: HTMLImageElement,
  width: number,
  height: number,
  fontSize = 10
): DissolveState {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.drawImage(image, 0, 0, width, height);
  const imageData = offCtx.getImageData(0, 0, width, height);
  const grid = computeGrid(imageData, width, height, fontSize);

  return { grid, image, width, height, fontSize };
}

export function renderDissolve(
  ctx: CanvasRenderingContext2D,
  state: DissolveState,
  progress: number
): void {
  const { grid, image, width, height, fontSize } = state;
  const p = Math.max(0, Math.min(1, progress));

  ctx.clearRect(0, 0, width, height);

  // Draw original image with fading opacity
  if (p < 1) {
    ctx.globalAlpha = 1 - p;
    ctx.drawImage(image, 0, 0, width, height);
  }

  // Draw ASCII overlay with increasing opacity
  if (p > 0) {
    ctx.globalAlpha = p;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const char = grid.chars[row * grid.cols + col];
        if (char !== " ") {
          ctx.fillText(char, col * grid.cellW, row * grid.cellH);
        }
      }
    }
  }

  ctx.globalAlpha = 1;
}
