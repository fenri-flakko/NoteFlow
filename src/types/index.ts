export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text' | 'pan';

export type PaperTemplate = 'blank' | 'ruled' | 'grid' | 'dotted';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  points: Point[];
  // For highlighter: snapped horizontal line coords
  isHorizontalSnap?: boolean;
  horizontalBounds?: {
    startX: number;
    endX: number;
    y: number;
    height: number;
  };
  opacity?: number;
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  width?: number;
}

export interface PageAnnotation {
  pageIndex: number;
  strokes: Stroke[];
  textBoxes?: TextBox[];
  undoStack: { strokes: Stroke[]; textBoxes?: TextBox[] }[];
  redoStack: { strokes: Stroke[]; textBoxes?: TextBox[] }[];
}

export interface DocItem {
  id: string;
  title: string;
  type: 'pdf' | 'notebook';
  paperTemplate?: PaperTemplate;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  pdfData?: Uint8Array; // Original PDF bytes
  pagesAnnotations: Record<number, PageAnnotation>;
  thumbnail?: string; // base64 preview
}
