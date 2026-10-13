import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Trash2 } from 'lucide-react';
import type { Stroke, Point, ToolType, PaperTemplate, PageAnnotation, TextBox } from '../types';
import { renderPdfPage } from '../utils/pdfHelper';
import { renderPaperBackground } from '../utils/paperBackground';
import { drawStroke, drawLiveSegment, redrawCanvas } from '../utils/canvasRender';

interface CanvasPageProps {
  pageIndex: number;
  pdfDoc?: pdfjsLib.PDFDocumentProxy | null;
  isNotebook: boolean;
  paperTemplate?: PaperTemplate;
  annotation: PageAnnotation;
  onUpdateAnnotation: (newAnnotation: PageAnnotation) => void;
  tool: ToolType;
  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  eraserWidth: number;
  zoom: number;
  fingerScrollOnly: boolean;
  setRenderCallback?: (pageIdx: number, fn: () => Promise<string | null>) => void;
}

export const CanvasPage: React.FC<CanvasPageProps> = ({
  pageIndex,
  pdfDoc,
  isNotebook,
  paperTemplate = 'blank',
  annotation,
  onUpdateAnnotation,
  tool,
  penColor,
  penWidth,
  highlighterColor,
  highlighterWidth,
  eraserWidth,
  zoom,
  fingerScrollOnly,
  setRenderCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1100,
  });

  const [activeTextBoxId, setActiveTextBoxId] = useState<string | null>(null);

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const pointerStartRef = useRef<Point | null>(null);

  // 1. Render Background (PDF or Notebook Paper)
  useEffect(() => {
    let isCancelled = false;

    const renderBackground = async () => {
      const bgCanvas = bgCanvasRef.current;
      if (!bgCanvas) return;

      const dpr = window.devicePixelRatio || 1;

      if (pdfDoc) {
        try {
          const dims = await renderPdfPage(pdfDoc, pageIndex + 1, bgCanvas, 1.4);
          if (!isCancelled) {
            setDimensions(dims);
          }
        } catch (err) {
          console.error('Error rendering PDF page:', err);
        }
      } else {
        const width = 800;
        const height = 1130;
        if (!isCancelled) {
          setDimensions({ width, height });
        }

        bgCanvas.width = width * dpr;
        bgCanvas.height = height * dpr;
        bgCanvas.style.width = `${width}px`;
        bgCanvas.style.height = `${height}px`;

        const ctx = bgCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          renderPaperBackground(ctx, width, height, paperTemplate);
        }
      }
    };

    renderBackground();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageIndex, isNotebook, paperTemplate]);

  // 2. Adjust size for layer canvases when dimensions change
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const canvases = [drawingCanvasRef.current, liveCanvasRef.current];

    canvases.forEach((c) => {
      if (!c) return;
      c.width = dimensions.width * dpr;
      c.height = dimensions.height * dpr;
      c.style.width = `${dimensions.width}px`;
      c.style.height = `${dimensions.height}px`;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });

    renderAllStrokes();
  }, [dimensions]);

  // 3. Render strokes to the main drawing canvas
  const renderAllStrokes = useCallback(() => {
    const dCanvas = drawingCanvasRef.current;
    if (!dCanvas) return;
    const ctx = dCanvas.getContext('2d');
    if (!ctx) return;

    redrawCanvas(ctx, dimensions.width, dimensions.height, annotation.strokes);
  }, [annotation.strokes, dimensions]);

  useEffect(() => {
    renderAllStrokes();
  }, [renderAllStrokes]);

  // 4. Expose renderPageToDataUrl for PDF export
  useEffect(() => {
    if (!setRenderCallback) return;

    const exportPageSnapshot = async (): Promise<string | null> => {
      const dpr = window.devicePixelRatio || 1;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = dimensions.width * dpr;
      exportCanvas.height = dimensions.height * dpr;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return null;

      exportCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (isNotebook) {
        renderPaperBackground(exportCtx, dimensions.width, dimensions.height, paperTemplate);
      }

      redrawCanvas(
        exportCtx,
        dimensions.width,
        dimensions.height,
        annotation.strokes,
        annotation.textBoxes
      );

      return exportCanvas.toDataURL('image/png');
    };

    setRenderCallback(pageIndex, exportPageSnapshot);
  }, [
    pageIndex,
    setRenderCallback,
    dimensions,
    isNotebook,
    paperTemplate,
    annotation.strokes,
    annotation.textBoxes,
  ]);

  // 5. Pointer Event Handlers
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If finger scrolling is enabled and touch is detected: do NOT draw, let finger scroll naturally!
    if (fingerScrollOnly && e.pointerType === 'touch') {
      return;
    }

    if (tool === 'pan') return;

    const pt = getCanvasCoordinates(e);

    // Text box creation
    if (tool === 'text') {
      const newBox: TextBox = {
        id: `tb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: Math.max(10, Math.min(pt.x, dimensions.width - 200)),
        y: Math.max(10, Math.min(pt.y, dimensions.height - 60)),
        text: '',
        fontSize: 18,
        color: penColor,
      };

      const updatedTextBoxes = [...(annotation.textBoxes || []), newBox];
      const newUndoStack = [
        ...annotation.undoStack,
        { strokes: annotation.strokes, textBoxes: annotation.textBoxes },
      ];

      onUpdateAnnotation({
        ...annotation,
        textBoxes: updatedTextBoxes,
        undoStack: newUndoStack,
        redoStack: [],
      });

      setActiveTextBoxId(newBox.id);
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    isDrawingRef.current = true;
    pointerStartRef.current = pt;
    lastPointRef.current = pt;

    if (tool === 'pen') {
      currentStrokeRef.current = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: 'pen',
        color: penColor,
        width: penWidth,
        points: [pt],
      };
    } else if (tool === 'highlighter') {
      currentStrokeRef.current = {
        id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: 'highlighter',
        color: highlighterColor,
        width: highlighterWidth,
        points: [pt],
        isHorizontalSnap: true,
        horizontalBounds: {
          startX: pt.x,
          endX: pt.x,
          y: pt.y,
          height: highlighterWidth,
        },
      };
    } else if (tool === 'eraser') {
      // Procreate brush eraser
      currentStrokeRef.current = {
        id: `eraser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: 'eraser',
        color: '#000000',
        width: eraserWidth,
        points: [pt],
      };

      // Erase directly on drawing canvas for instant zero-lag feedback
      const dCanvas = drawingCanvasRef.current;
      if (dCanvas) {
        const dCtx = dCanvas.getContext('2d');
        if (dCtx) {
          drawLiveSegment(dCtx, pt, pt, 'eraser', '#000000', eraserWidth);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (fingerScrollOnly && e.pointerType === 'touch') return;

    const nativeEvt = e.nativeEvent as unknown as { getCoalescedEvents?: () => React.PointerEvent<HTMLCanvasElement>[] };
    const events = nativeEvt.getCoalescedEvents ? nativeEvt.getCoalescedEvents() : [e];

    for (const evt of events) {
      const pt = getCanvasCoordinates(evt);
      const stroke = currentStrokeRef.current;
      if (!stroke) continue;

      stroke.points.push(pt);
      const prevPt = lastPointRef.current || pt;
      lastPointRef.current = pt;

      if (tool === 'pen') {
        // Draw incremental segment on live canvas with zero latency
        const liveCanvas = liveCanvasRef.current;
        if (liveCanvas) {
          const liveCtx = liveCanvas.getContext('2d');
          if (liveCtx) {
            drawLiveSegment(liveCtx, prevPt, pt, 'pen', penColor, penWidth);
          }
        }
      } else if (tool === 'eraser') {
        // Erase directly on the drawing canvas in real time like Procreate
        const dCanvas = drawingCanvasRef.current;
        if (dCanvas) {
          const dCtx = dCanvas.getContext('2d');
          if (dCtx) {
            drawLiveSegment(dCtx, prevPt, pt, 'eraser', '#000000', eraserWidth);
          }
        }
      } else if (tool === 'highlighter') {
        // Horizontal straight line preview
        const liveCanvas = liveCanvasRef.current;
        if (liveCanvas) {
          const liveCtx = liveCanvas.getContext('2d');
          if (liveCtx) {
            const startPt = pointerStartRef.current || pt;
            stroke.horizontalBounds = {
              startX: startPt.x,
              endX: pt.x,
              y: startPt.y, // Pure horizontal
              height: highlighterWidth,
            };
            liveCtx.clearRect(0, 0, dimensions.width, dimensions.height);
            drawStroke(liveCtx, stroke);
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const liveCanvas = liveCanvasRef.current;
    if (liveCanvas) {
      const liveCtx = liveCanvas.getContext('2d');
      if (liveCtx) {
        liveCtx.clearRect(0, 0, dimensions.width, dimensions.height);
      }
    }

    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    pointerStartRef.current = null;
    lastPointRef.current = null;

    if (stroke && (stroke.points.length > 0 || stroke.horizontalBounds)) {
      const newStrokes = [...annotation.strokes, stroke];
      const newUndoStack = [
        ...annotation.undoStack,
        { strokes: annotation.strokes, textBoxes: annotation.textBoxes },
      ];

      onUpdateAnnotation({
        ...annotation,
        strokes: newStrokes,
        undoStack: newUndoStack,
        redoStack: [],
      });
    }
  };

  // Text Box Handlers
  const handleUpdateTextBox = (id: string, newText: string, fontSize?: number, color?: string) => {
    const updated = (annotation.textBoxes || []).map((tb) =>
      tb.id === id
        ? {
            ...tb,
            text: newText,
            fontSize: fontSize !== undefined ? fontSize : tb.fontSize,
            color: color !== undefined ? color : tb.color,
          }
        : tb
    );

    onUpdateAnnotation({
      ...annotation,
      textBoxes: updated,
    });
  };

  const handleDeleteTextBox = (id: string) => {
    const updated = (annotation.textBoxes || []).filter((tb) => tb.id !== id);
    const newUndoStack = [
      ...annotation.undoStack,
      { strokes: annotation.strokes, textBoxes: annotation.textBoxes },
    ];

    onUpdateAnnotation({
      ...annotation,
      textBoxes: updated,
      undoStack: newUndoStack,
      redoStack: [],
    });
    setActiveTextBoxId(null);
  };

  return (
    <div
      ref={containerRef}
      id={`canvas-page-${pageIndex}`}
      className="relative mx-auto my-5 bg-white shadow-lg rounded-sm overflow-hidden select-none transition-transform duration-75 ease-out"
      style={{
        width: `${dimensions.width * zoom}px`,
        height: `${dimensions.height * zoom}px`,
      }}
    >
      {/* Page number badge */}
      <div className="absolute top-2 left-2 z-30 bg-black/50 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none">
        Pág. {pageIndex + 1}
      </div>

      <div
        className="relative origin-top-left"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          transform: `scale(${zoom})`,
        }}
      >
        {/* Layer 1: PDF or Paper Background */}
        <canvas
          ref={bgCanvasRef}
          className="absolute top-0 left-0 pointer-events-none block"
        />

        {/* Layer 2: Main Drawing Canvas (Strokes + Destination-out Eraser) */}
        <canvas
          ref={drawingCanvasRef}
          className="absolute top-0 left-0 pointer-events-none block"
        />

        {/* Layer 3: Live Drawing Stroke (Incremental, ultra-smooth) */}
        <canvas
          ref={liveCanvasRef}
          className="absolute top-0 left-0 pointer-events-none block"
          style={tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
        />

        {/* Layer 4: Text Boxes Overlay */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
          {(annotation.textBoxes || []).map((tb) => {
            const isActive = activeTextBoxId === tb.id;
            return (
              <div
                key={tb.id}
                style={{
                  position: 'absolute',
                  left: `${tb.x}px`,
                  top: `${tb.y}px`,
                }}
                className={`pointer-events-auto transition-shadow ${
                  isActive
                    ? 'ring-2 ring-blue-500 rounded-lg bg-white/90 p-1.5 shadow-xl'
                    : 'cursor-pointer hover:ring-1 hover:ring-slate-300 rounded p-1'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTextBoxId(tb.id);
                }}
              >
                {isActive ? (
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-200">
                      {/* Font size presets */}
                      <div className="flex items-center gap-1 text-[11px]">
                        {[14, 18, 24, 32].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleUpdateTextBox(tb.id, tb.text, s)}
                            className={`px-1.5 py-0.5 rounded ${
                              tb.fontSize === s
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTextBox(tb.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Eliminar texto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      autoFocus
                      rows={Math.max(2, tb.text.split('\n').length)}
                      value={tb.text}
                      onChange={(e) => handleUpdateTextBox(tb.id, e.target.value)}
                      onBlur={() => {
                        if (!tb.text.trim()) {
                          handleDeleteTextBox(tb.id);
                        } else {
                          setActiveTextBoxId(null);
                        }
                      }}
                      placeholder="Escribe aquí..."
                      style={{
                        fontSize: `${tb.fontSize}px`,
                        color: tb.color,
                        lineHeight: 1.3,
                      }}
                      className="w-full bg-transparent border-0 outline-none resize-none font-sans"
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: `${tb.fontSize}px`,
                      color: tb.color,
                      lineHeight: 1.3,
                      whiteSpace: 'pre-wrap',
                    }}
                    className="font-sans min-w-[20px]"
                  >
                    {tb.text || 'Texto vacío'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Layer 5: Interactive Event Capture */}
        <canvas
          className="absolute top-0 left-0 w-full h-full drawing-canvas z-10"
          style={{
            touchAction: fingerScrollOnly ? 'pan-y pan-x' : 'none',
            cursor:
              tool === 'pan'
                ? 'grab'
                : tool === 'text'
                ? 'text'
                : tool === 'eraser'
                ? 'crosshair'
                : 'crosshair',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
};
