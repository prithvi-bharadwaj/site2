/**
 * Lightweight image-to-ASCII dissolve engine.
 * Converts an image to ASCII by sampling pixel brightness.
 * Supports mouse-local radial dissolve — only the area near
 * the cursor dissolves into ASCII characters.
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

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Render with a radial dissolve around the pointer.
 * Cells near the mouse show ASCII; cells far away show the original image.
 */
export function renderRadialDissolve(
  ctx: CanvasRenderingContext2D,
  state: DissolveState,
  pointer: PointerState,
  radius = 60
): void {
  const { grid, image, width, height, fontSize } = state;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  if (!pointer.active) return;

  ctx.font = `${fontSize}px ${FONT}`;
  ctx.textBaseline = "top";

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cx = col * grid.cellW + grid.cellW / 2;
      const cy = row * grid.cellH + grid.cellH / 2;

      const dx = cx - pointer.x;
      const dy = cy - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) continue;

      // Smooth falloff: 1 at center, 0 at edge
      const strength = 1 - dist / radius;
      const alpha = strength * strength; // ease-in curve

      // Erase the image pixels for this cell
      ctx.clearRect(col * grid.cellW, row * grid.cellH, grid.cellW, grid.cellH);

      // Draw background
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(col * grid.cellW, row * grid.cellH, grid.cellW, grid.cellH);

      // Draw the original image behind at reduced opacity
      if (alpha < 1) {
        ctx.globalAlpha = 1 - alpha;
        ctx.drawImage(
          image,
          col * grid.cellW, row * grid.cellH, grid.cellW, grid.cellH,
          col * grid.cellW, row * grid.cellH, grid.cellW, grid.cellH
        );
      }

      // Draw ASCII char
      const char = grid.chars[row * grid.cols + col];
      if (char !== " ") {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(char, col * grid.cellW, row * grid.cellH);
      }

      ctx.globalAlpha = 1;
    }
  }
}
