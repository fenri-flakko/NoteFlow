import type { PaperTemplate } from '../types';

export function renderPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PaperTemplate = 'blank'
) {
  // Base paper color (warm white like premium notebook paper)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (template === 'blank') return;

  ctx.save();

  if (template === 'ruled') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const lineSpacing = 32;
    const startY = 48;

    // Draw header/top margin line
    ctx.beginPath();
    for (let y = startY; y < height - 20; y += lineSpacing) {
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
    }
    ctx.stroke();

    // Subtle red or pink vertical margin line on left
    ctx.strokeStyle = '#fca5a5';
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, height);
    ctx.stroke();
  } else if (template === 'grid') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 24;

    ctx.beginPath();
    // Vertical lines
    for (let x = gridSize; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    // Horizontal lines
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (template === 'dotted') {
    ctx.fillStyle = '#94a3b8';
    const dotSpacing = 24;
    const dotRadius = 1.2;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
