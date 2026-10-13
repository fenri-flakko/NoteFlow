import React from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Type,
  Hand,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  Trash2,
  Maximize2,
  Smartphone
} from 'lucide-react';
import type { ToolType, PaperTemplate } from '../types';

interface ToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  color: string;
  setColor: (c: string) => void;
  penWidth: number;
  setPenWidth: (w: number) => void;
  highlighterWidth: number;
  setHighlighterWidth: (w: number) => void;
  highlighterColor: string;
  setHighlighterColor: (c: string) => void;
  eraserWidth: number;
  setEraserWidth: (w: number) => void;
  fingerScrollOnly: boolean;
  setFingerScrollOnly: (fn: (v: boolean) => boolean) => void;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  onExport: () => void;
  onBackToLibrary: () => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  onFitWidth: () => void;
  title: string;
  isNotebook: boolean;
  paperTemplate?: PaperTemplate;
  onChangePaperTemplate?: (tpl: PaperTemplate) => void;
}

// Preset color palettes
const PEN_COLORS = [
  '#0f172a', // Slate black
  '#3b82f6', // Ocean Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#64748b', // Gray
];

const HIGHLIGHTER_COLORS = [
  '#fef08a', // Pastel Yellow
  '#bbf7d0', // Pastel Green
  '#bfdbfe', // Pastel Blue
  '#fbcfe8', // Pastel Pink
  '#e9d5ff', // Pastel Purple
  '#fed7aa', // Pastel Orange
];

const PEN_WIDTH_PRESETS = [2, 4, 8, 14];
const HIGHLIGHTER_WIDTH_PRESETS = [16, 24, 32, 44];
const ERASER_WIDTH_PRESETS = [8, 16, 28, 48];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  color,
  setColor,
  penWidth,
  setPenWidth,
  highlighterWidth,
  setHighlighterWidth,
  highlighterColor,
  setHighlighterColor,
  eraserWidth,
  setEraserWidth,
  fingerScrollOnly,
  setFingerScrollOnly,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  onExport,
  onBackToLibrary,
  zoom,
  setZoom,
  onFitWidth,
  title,
  isNotebook,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm select-none">
      {/* Top Bar: Title, Page controls, Zoom, Export */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
            title="Volver a la biblioteca"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <h1 className="text-sm md:text-base font-semibold text-slate-800 truncate max-w-[140px] md:max-w-[280px]">
            {title}
          </h1>
        </div>

        {/* Center: Continuous Scroll Page Counter & Jump */}
        <div className="flex items-center gap-1 bg-slate-100/90 rounded-full px-2 py-1 shadow-inner text-xs md:text-sm font-medium text-slate-700">
          <button
            onClick={onPrevPage}
            disabled={currentPage <= 0}
            className="p-1 rounded-full hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono">
            Pág. {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPage >= totalPages - 1}
            className="p-1 rounded-full hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {isNotebook && (
            <button
              onClick={onAddPage}
              className="ml-1 p-1 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-sm transition-all"
              title="Añadir página"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right: Stylus mode toggle, Zoom & Export */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Finger Scroll / Stylus Mode Toggle */}
          <button
            onClick={() => setFingerScrollOnly((prev) => !prev)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              fingerScrollOnly
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Cuando está activo: los dedos solo desplazan la pantalla y solo el Apple Pencil o lápiz dibuja"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{fingerScrollOnly ? 'Dedo desplaza' : 'Dedo dibuja'}</span>
          </button>

          {/* Zoom controls */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-slate-600 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
              className="p-1 hover:bg-white rounded transition"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-11 text-center font-mono font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}
              className="p-1 hover:bg-white rounded transition"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitWidth}
              className="p-1 hover:bg-white rounded transition ml-0.5"
              title="Ajustar ancho"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm font-medium text-xs md:text-sm active:scale-95 transition-all"
            title="Descargar documento editado como PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Free Notes & Procreate Main Floating Toolbar */}
      <div className="border-t border-slate-100 bg-slate-50/80 px-3 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Tools Section (Pen, Highlighter, Eraser, Text, Pan) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200/70">
          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tool === 'pen'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Bolígrafo / Lápiz (con sensibilidad de presión)"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden md:inline">Bolígrafo</span>
            {tool === 'pen' && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white ml-0.5"
                style={{ backgroundColor: color }}
              />
            )}
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setTool('highlighter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Subrayador inteligente (recto horizontal sin inclinación, no tapa el texto)"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden md:inline">Subrayador</span>
            {tool === 'highlighter' && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white ml-0.5"
                style={{ backgroundColor: highlighterColor }}
              />
            )}
          </button>

          {/* Eraser (Procreate brush eraser) */}
          <button
            onClick={() => setTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tool === 'eraser'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Borrador tipo pincel Procreate (borra exactamente donde pasas)"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden md:inline">Borrador</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setTool('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tool === 'text'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Cuadro de texto (toca en cualquier parte de la página para escribir)"
          >
            <Type className="w-4 h-4" />
            <span className="hidden md:inline">Texto</span>
          </button>

          {/* Pan / Hand */}
          <button
            onClick={() => setTool('pan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tool === 'pan'
                ? 'bg-slate-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Mano para desplazar libremente"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden md:inline">Mover</span>
          </button>
        </div>

        {/* Dynamic Tool Options: Colors & Thickness */}
        <div className="flex items-center gap-3">
          {tool === 'pen' && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/70">
              {/* Quick color dots */}
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      color.toLowerCase() === c.toLowerCase()
                        ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                        : 'hover:scale-105 opacity-90'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                {/* Custom Color Input */}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-5 h-5 rounded-full border-0 cursor-pointer overflow-hidden p-0"
                  title="Color personalizado"
                />
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-1" />

              {/* Pen Thickness Presets */}
              <div className="flex items-center gap-1">
                {PEN_WIDTH_PRESETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setPenWidth(w)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition ${
                      penWidth === w
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={`Grosor: ${w}px`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{
                        width: `${Math.min(12, Math.max(3, w * 1.5))}px`,
                        height: `${Math.min(12, Math.max(3, w * 1.5))}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === 'highlighter' && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/70">
              {/* Highlighter color dots */}
              <div className="flex items-center gap-1.5">
                {HIGHLIGHTER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setHighlighterColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      highlighterColor.toLowerCase() === c.toLowerCase()
                        ? 'ring-2 ring-amber-500 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-1" />

              {/* Highlighter Width Presets */}
              <div className="flex items-center gap-1">
                {HIGHLIGHTER_WIDTH_PRESETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setHighlighterWidth(w)}
                    className={`px-2 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition ${
                      highlighterWidth === w
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={`Ancho del subrayador: ${w}px`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === 'eraser' && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/70">
              <span className="text-xs text-slate-500 font-medium">Tamaño del borrador:</span>
              <div className="flex items-center gap-1">
                {ERASER_WIDTH_PRESETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setEraserWidth(w)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition ${
                      eraserWidth === w
                        ? 'bg-rose-100 text-rose-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={`Pincel de goma: ${w}px`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{
                        width: `${Math.min(14, Math.max(4, w * 0.3))}px`,
                        height: `${Math.min(14, Math.max(4, w * 0.3))}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <button
                onClick={onClearPage}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium transition"
                title="Limpiar trazos de esta página"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar página
              </button>
            </div>
          )}

          {tool === 'text' && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/70">
              <span className="text-xs text-purple-700 font-medium">
                Toca en cualquier parte de la página para añadir un cuadro de texto
              </span>
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200/70">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
