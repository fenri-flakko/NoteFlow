import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import type { DocItem } from '../types';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set up local worker source (no external CDN dependency)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface PdfPageDimensions {
  width: number;
  height: number;
}

export async function loadPdfDoc(data: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  // Clone data because PDF.js transfers the ArrayBuffer to its web worker,
  // which detaches the original buffer if not cloned!
  const clone = new Uint8Array(data.byteLength);
  clone.set(data);

  const loadingTask = pdfjsLib.getDocument({
    data: clone,
    useSystemFonts: true,
  });
  return await loadingTask.promise;
}

const activeRenderTasks = new WeakMap<HTMLCanvasElement, pdfjsLib.RenderTask>();

export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<PdfPageDimensions> {
  // Cancel previous render task on this canvas if one was already running (e.g. React StrictMode)
  const existingTask = activeRenderTasks.get(canvas);
  if (existingTask) {
    try {
      existingTask.cancel();
    } catch {
      // Ignored
    }
    activeRenderTasks.delete(canvas);
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Handle devicePixelRatio for super crisp rendering on iPad Retina displays
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  activeRenderTasks.set(canvas, renderTask);

  try {
    await renderTask.promise;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'RenderingCancelledException') {
      return {
        width: viewport.width,
        height: viewport.height,
      };
    }
    throw err;
  } finally {
    if (activeRenderTasks.get(canvas) === renderTask) {
      activeRenderTasks.delete(canvas);
    }
  }

  return {
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Exports the edited PDF or Notebook with all annotations merged.
 */
export async function exportPdfWithAnnotations(
  doc: DocItem,
  renderPageToDataUrl: (pageIndex: number) => Promise<string | null>
): Promise<Uint8Array> {
  if (doc.type === 'pdf' && doc.pdfData) {
    // Load original PDF to preserve pure vector text and structure
    const pdfDoc = await PDFDocument.load(doc.pdfData);
    const pageCount = pdfDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const dataUrl = await renderPageToDataUrl(i);
      
      if (dataUrl) {
        // Convert dataUrl to png bytes
        const base64Data = dataUrl.split(',')[1];
        const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(pngBytes);
        
        const { width, height } = page.getSize();
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
    }

    return await pdfDoc.save();
  } else {
    // Notebook mode: create fresh PDF
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < doc.pageCount; i++) {
      const dataUrl = await renderPageToDataUrl(i);
      // Standard A4 aspect ratio in points: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1];
        const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(pngBytes);

        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }

    return await pdfDoc.save();
  }
}

export function downloadBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
