export interface DisplacementConfig {
  repelForce: number;
  repelRadius: number; // in normalized screen coords
  spring: number;
  damping: number;
}

interface Cell {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}

export class DisplacementField {
  private cells: Cell[] = [];
  private cols = 0;
  private rows = 0;
  private cellW = 0;
  private cellH = 0;
  private canvasW = 0;
  private canvasH = 0;
  private textureData: Uint8Array = new Uint8Array(0);

  get textureCols() { return this.cols; }
  get textureRows() { return this.rows; }

  init(canvasW: number, canvasH: number, cellW: number, cellH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.cellW = cellW;
    this.cellH = cellH;
    this.cols = Math.max(1, Math.floor(canvasW / cellW));
    this.rows = Math.max(1, Math.floor(canvasH / cellH));

    const count = this.cols * this.rows;
    this.cells = [];
    for (let i = 0; i < count; i++) {
      this.cells.push({ dx: 0, dy: 0, vx: 0, vy: 0 });
    }
    // RGBA texture: R = dx, G = dy (encoded as 0-255 where 128 = 0 displacement)
    this.textureData = new Uint8Array(this.cols * this.rows * 4);
  }

  repel(
    pointerX: number, // normalized 0-1
    pointerY: number,
    cfg: DisplacementConfig,
    mode: "repel" | "attract" = "repel"
  ) {
    const radiusCols = (cfg.repelRadius * this.canvasW) / this.cellW;
    const radiusRows = (cfg.repelRadius * this.canvasH) / this.cellH;

    // Pointer position in cell-grid coordinates
    const pCol = pointerX * this.cols;
    const pRow = pointerY * this.rows;

    // Only iterate cells within repel radius
    const minCol = Math.max(0, Math.floor(pCol - radiusCols));
    const maxCol = Math.min(this.cols - 1, Math.ceil(pCol + radiusCols));
    const minRow = Math.max(0, Math.floor(pRow - radiusRows));
    const maxRow = Math.min(this.rows - 1, Math.ceil(pRow + radiusRows));

    const radiusPxSq = (cfg.repelRadius * this.canvasW) ** 2;

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellCenterX = (col + 0.5) * this.cellW;
        const cellCenterY = (row + 0.5) * this.cellH;
        const px = pointerX * this.canvasW;
        const py = pointerY * this.canvasH;

        const ddx = cellCenterX - px;
        const ddy = cellCenterY - py;
        const distSq = ddx * ddx + ddy * ddy;

        if (distSq < radiusPxSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const radiusPx = cfg.repelRadius * this.canvasW;
          const strength = cfg.repelForce * (1 - dist / radiusPx);
          const nx = ddx / dist;
          const ny = ddy / dist;

          const sign = mode === "attract" ? -1 : 1;
          const cell = this.cells[row * this.cols + col];
          cell.vx += sign * nx * strength;
          cell.vy += sign * ny * strength;
        }
      }
    }
  }

  update(dt: number, cfg: DisplacementConfig) {
    const clamped = Math.min(dt, 1 / 30);

    for (const cell of this.cells) {
      // Spring toward home (0,0)
      const ax = -cell.dx * cfg.spring;
      const ay = -cell.dy * cfg.spring;

      cell.vx = (cell.vx + ax * clamped) * cfg.damping;
      cell.vy = (cell.vy + ay * clamped) * cfg.damping;

      cell.dx += cell.vx * clamped;
      cell.dy += cell.vy * clamped;

      // Clamp to prevent explosion
      const maxDisp = 60;
      cell.dx = Math.max(-maxDisp, Math.min(maxDisp, cell.dx));
      cell.dy = Math.max(-maxDisp, Math.min(maxDisp, cell.dy));
    }
  }

  /** Pack displacement into RGBA texture. R=dx, G=dy (128=center, ±127 range mapped to ±maxPx). B=displacement magnitude for glow. */
  getTextureData(): Uint8Array {
    const maxPx = 60; // must match clamp above
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      const offset = i * 4;
      // Encode: 128 = no displacement, 0 = -maxPx, 255 = +maxPx
      this.textureData[offset] = Math.round(128 + (c.dx / maxPx) * 127);
      this.textureData[offset + 1] = Math.round(128 + (c.dy / maxPx) * 127);
      // B = displacement magnitude (0-255) for glow
      const mag = Math.sqrt(c.dx * c.dx + c.dy * c.dy) / maxPx;
      this.textureData[offset + 2] = Math.round(Math.min(1, mag) * 255);
      this.textureData[offset + 3] = 255;
    }
    return this.textureData;
  }
}
