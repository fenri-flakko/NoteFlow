import type { Stroke, Point, TextBox } from '../types';

/**
 * Draws a single stroke onto a Canvas 2D context.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.tool === 'highlighter') {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.isHorizontalSnap && stroke.horizontalBounds) {
      const { startX, endX, y } = stroke.horizontalBounds;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    } else if (stroke.points.length > 0) {
      const first = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, first.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (stroke.tool === 'eraser') {
    // Procreate-style brush eraser
    if (stroke.points.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      const r = stroke.width / 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const pts = stroke.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Pen tool: smooth quadratic spline with pressure modulation
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;

  if (stroke.points.length === 1) {
    const pt = stroke.points[0];
    const r = (stroke.width * (0.6 + 0.4 * (pt.pressure || 0.5))) / 2;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const pressure = p2.pressure !== undefined ? p2.pressure : 0.5;
    const currentWidth = Math.max(1, stroke.width * (0.6 + 0.8 * pressure));
    ctx.lineWidth = currentWidth;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(midX, midY);
    } else {
      const prevMidX = (pts[i - 1].x + p1.x) / 2;
      const prevMidY = (pts[i - 1].y + p1.y) / 2;
      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    ctx.stroke();
  }

  // Draw final segment
  if (pts.length > 2) {
    const pPrev = pts[pts.length - 2];
    const pLast = pts[pts.length - 1];
    const midX = (pPrev.x + pLast.x) / 2;
    const midY = (pPrev.y + pLast.y) / 2;

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(pLast.x, pLast.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Fast incremental segment drawing for ultra-responsive live stylus input (no lag).
 */
export function drawLiveSegment(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  tool: 'pen' | 'eraser',
  color: string,
  width: number
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = width;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    const pressure = p2.pressure !== undefined ? p2.pressure : 0.5;
    ctx.lineWidth = Math.max(1, width * (0.6 + 0.8 * pressure));
  }

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a text box onto the context
 */
export function drawTextBox(ctx: CanvasRenderingContext2D, tb: TextBox) {
  if (!tb.text.trim()) return;

  ctx.save();
  ctx.font = `${tb.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = tb.color;
  ctx.textBaseline = 'top';

  const lines = tb.text.split('\n');
  const lineHeight = tb.fontSize * 1.3;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tb.x, tb.y + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Redraws all strokes and text onto given context.
 * Renders in sequential order so eraser cuts out whatever was drawn before it.
 */
export function redrawCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Stroke[],
  textBoxes?: TextBox[]
) {
  ctx.clearRect(0, 0, width, height);

  // Group strokes: highlighters first (rendered with multiply), then pen and eraser in chronological order
  const highlighters = strokes.filter((s) => s.tool === 'highlighter');
  const otherStrokes = strokes.filter((s) => s.tool !== 'highlighter');

  // 1. Render highlighters
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (const h of highlighters) {
    drawStroke(ctx, h);
  }
  ctx.restore();

  // 2. Render pen & eraser strokes
  for (const s of otherStrokes) {
    drawStroke(ctx, s);
  }

  // 3. Render text boxes
  if (textBoxes) {
    for (const tb of textBoxes) {
      drawTextBox(ctx, tb);
    }
  }
}
