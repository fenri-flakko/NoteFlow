import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus } from 'lucide-react';
import type { DocItem, ToolType, PaperTemplate, PageAnnotation } from './types';
import { loadPdfDoc, exportPdfWithAnnotations, downloadBlob } from './utils/pdfHelper';
import { renderPaperBackground } from './utils/paperBackground';
import { redrawCanvas } from './utils/canvasRender';
import { saveDocument, getAllDocuments, deleteDocument } from './utils/storage';
import { Toolbar } from './components/Toolbar';
import { CanvasPage } from './components/CanvasPage';
import { DocumentLibrary } from './components/DocumentLibrary';

export const App: React.FC = () => {
  // State
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Tools state
  const [tool, setTool] = useState<ToolType>('pen');
  const [penColor, setPenColor] = useState<string>('#0f172a');
  const [penWidth, setPenWidth] = useState<number>(4);
  const [highlighterColor, setHighlighterColor] = useState<string>('#fef08a');
  const [highlighterWidth, setHighlighterWidth] = useState<number>(24);
  const [eraserWidth, setEraserWidth] = useState<number>(28);
  const [fingerScrollOnly, setFingerScrollOnly] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderCallbacks = useRef<Map<number, () => Promise<string | null>>>(new Map());

  // 1. Load initial documents from IndexedDB
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await getAllDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    };
    loadDocs();
  }, []);

  // 2. Load PDF Document Proxy when a PDF doc is selected
  useEffect(() => {
    let isCancelled = false;

    if (currentDoc && currentDoc.type === 'pdf' && currentDoc.pdfData) {
      loadPdfDoc(currentDoc.pdfData)
        .then((proxy) => {
          if (!isCancelled) {
            setPdfDocProxy(proxy);
          }
        })
        .catch((err) => {
          console.error('Error loading PDF proxy:', err);
        });
    } else {
      setPdfDocProxy(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentDoc?.id, currentDoc?.type, currentDoc?.pdfData]);

  // 3. Debounced auto-save so pen strokes never freeze the main thread
  useEffect(() => {
    if (!currentDoc) return;
    const timeout = setTimeout(() => {
      saveDocument(currentDoc).catch((err) =>
        console.warn('Auto-save warning:', err)
      );
    }, 1500);

    return () => clearTimeout(timeout);
  }, [currentDoc]);

  // 4. Update currentPage based on scroll position in continuous vertical scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentDoc) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const centerY = container.scrollTop + container.clientHeight / 2;
          for (let i = 0; i < currentDoc.pageCount; i++) {
            const el = document.getElementById(`canvas-page-${i}`);
            if (el) {
              const top = el.offsetTop;
              const bottom = top + el.offsetHeight;
              if (centerY >= top && centerY <= bottom) {
                setCurrentPage(i);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentDoc]);

  // Handle open document
  const handleOpenDocument = (doc: DocItem) => {
    setCurrentDoc(doc);
    setCurrentPage(0);
    setZoom(1);
    renderCallbacks.current.clear();
  };

  // Handle create blank notebook
  const handleCreateNotebook = async (title: string, template: PaperTemplate) => {
    const newDoc: DocItem = {
      id: `nb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      type: 'notebook',
      paperTemplate: template,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageCount: 1,
      pagesAnnotations: {
        0: {
          pageIndex: 0,
          strokes: [],
          undoStack: [],
          redoStack: [],
        },
      },
    };

    try {
      await saveDocument(newDoc);
    } catch {
      // Ignored
    }

    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDoc(newDoc);
    setCurrentPage(0);
    setZoom(1);
  };

  // Handle import PDF or Text document
  const handleImportPdf = async (file: File) => {
    setIsLoadingFile(true);
    try {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '') || 'Documento Importado';

      // 1. Text file import
      if (file.name.toLowerCase().endsWith('.txt') || file.type.startsWith('text/')) {
        const initialAnnotations: Record<number, PageAnnotation> = {
          0: {
            pageIndex: 0,
            strokes: [],
            undoStack: [],
            redoStack: [],
          },
        };

        const newDoc: DocItem = {
          id: `txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: cleanTitle,
          type: 'notebook',
          paperTemplate: 'ruled',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pageCount: 1,
          pagesAnnotations: initialAnnotations,
        };

        try {
          await saveDocument(newDoc);
        } catch (storageErr) {
          console.warn('Storage warning:', storageErr);
        }

        setDocuments((prev) => [newDoc, ...prev]);
        setCurrentDoc(newDoc);
        setCurrentPage(0);
        setZoom(1);
        return;
      }

      // 2. PDF file import
      const buffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(buffer);
      const proxy = await loadPdfDoc(pdfBytes);
      const numPages = proxy.numPages;

      if (numPages <= 0) {
        throw new Error('El PDF no contiene páginas legibles.');
      }

      const initialAnnotations: Record<number, PageAnnotation> = {};
      for (let i = 0; i < numPages; i++) {
        initialAnnotations[i] = {
          pageIndex: i,
          strokes: [],
          undoStack: [],
          redoStack: [],
        };
      }

      const newDoc: DocItem = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle,
        type: 'pdf',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: numPages,
        pdfData: pdfBytes,
        pagesAnnotations: initialAnnotations,
      };

      try {
        await saveDocument(newDoc);
      } catch (storageErr) {
        console.warn('Could not cache PDF in storage quota:', storageErr);
      }

      setPdfDocProxy(proxy);
      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentDoc(newDoc);
      setCurrentPage(0);
      setZoom(1);
    } catch (err: unknown) {
      console.error('Error importing file:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`No se pudo cargar el archivo: ${msg}\n\nPor favor asegúrate de seleccionar un archivo PDF o documento de texto válido.`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (currentDoc?.id === id) {
      setCurrentDoc(null);
    }
  };

  const handleUpdateAnnotationForPage = (pageIdx: number, newAnnotation: PageAnnotation) => {
    if (!currentDoc) return;
    setCurrentDoc({
      ...currentDoc,
      pagesAnnotations: {
        ...currentDoc.pagesAnnotations,
        [pageIdx]: newAnnotation,
      },
    });
  };

  // Scroll to page helper
  const scrollToPage = (pageIdx: number) => {
    const target = Math.max(0, Math.min(pageIdx, (currentDoc?.pageCount || 1) - 1));
    setCurrentPage(target);
    const el = document.getElementById(`canvas-page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Undo / Redo for current visible page
  const currentPageAnnotation: PageAnnotation =
    currentDoc?.pagesAnnotations[currentPage] || {
      pageIndex: currentPage,
      strokes: [],
      undoStack: [],
      redoStack: [],
    };

  const handleUndo = useCallback(() => {
    if (!currentDoc) return;
    const ann = currentPageAnnotation;
    if (ann.undoStack.length === 0) return;

    const previousState = ann.undoStack[ann.undoStack.length - 1];
    const newUndoStack = ann.undoStack.slice(0, -1);
    const newRedoStack = [
      ...ann.redoStack,
      { strokes: ann.strokes, textBoxes: ann.textBoxes },
    ];

    handleUpdateAnnotationForPage(currentPage, {
      ...ann,
      strokes: previousState.strokes,
      textBoxes: previousState.textBoxes,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  }, [currentDoc, currentPage, currentPageAnnotation]);

  const handleRedo = useCallback(() => {
    if (!currentDoc) return;
    const ann = currentPageAnnotation;
    if (ann.redoStack.length === 0) return;

    const nextState = ann.redoStack[ann.redoStack.length - 1];
    const newRedoStack = ann.redoStack.slice(0, -1);
    const newUndoStack = [
      ...ann.undoStack,
      { strokes: ann.strokes, textBoxes: ann.textBoxes },
    ];

    handleUpdateAnnotationForPage(currentPage, {
      ...ann,
      strokes: nextState.strokes,
      textBoxes: nextState.textBoxes,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  }, [currentDoc, currentPage, currentPageAnnotation]);

  const handleClearPage = () => {
    if (!currentDoc) return;
    const ann = currentPageAnnotation;
    if (ann.strokes.length === 0 && (!ann.textBoxes || ann.textBoxes.length === 0)) return;

    handleUpdateAnnotationForPage(currentPage, {
      ...ann,
      strokes: [],
      textBoxes: [],
      undoStack: [
        ...ann.undoStack,
        { strokes: ann.strokes, textBoxes: ann.textBoxes },
      ],
      redoStack: [],
    });
  };

  // Add Page (for notebook)
  const handleAddPage = () => {
    if (!currentDoc || currentDoc.type !== 'notebook') return;
    const newPageIdx = currentDoc.pageCount;
    const updatedDoc: DocItem = {
      ...currentDoc,
      pageCount: currentDoc.pageCount + 1,
      pagesAnnotations: {
        ...currentDoc.pagesAnnotations,
        [newPageIdx]: {
          pageIndex: newPageIdx,
          strokes: [],
          undoStack: [],
          redoStack: [],
        },
      },
    };
    setCurrentDoc(updatedDoc);
    setTimeout(() => {
      scrollToPage(newPageIdx);
    }, 100);
  };

  // Fit to screen width helper
  const handleFitWidth = () => {
    const screenWidth = window.innerWidth;
    const targetWidth = Math.min(screenWidth - 40, 900);
    const calculatedZoom = Math.min(1.5, Math.max(0.6, targetWidth / 800));
    setZoom(Math.round(calculatedZoom * 100) / 100);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Export PDF with annotations
  const handleExport = async () => {
    if (!currentDoc) return;
    setIsExporting(true);

    try {
      const renderPageToDataUrl = async (pageIdx: number): Promise<string | null> => {
        const callback = renderCallbacks.current.get(pageIdx);
        if (callback) {
          return await callback();
        }

        const ann = currentDoc.pagesAnnotations[pageIdx];
        const hasAnnotations = ann && (ann.strokes.length > 0 || (ann.textBoxes && ann.textBoxes.length > 0));

        if (!hasAnnotations) {
          if (currentDoc.type === 'notebook') {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1130;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              renderPaperBackground(ctx, 800, 1130, currentDoc.paperTemplate || 'blank');
              return canvas.toDataURL('image/png');
            }
          }
          return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1130;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        if (currentDoc.type === 'notebook') {
          renderPaperBackground(ctx, 800, 1130, currentDoc.paperTemplate || 'blank');
        }

        redrawCanvas(ctx, 800, 1130, ann.strokes, ann.textBoxes);
        return canvas.toDataURL('image/png');
      };

      const pdfBytes = await exportPdfWithAnnotations(currentDoc, renderPageToDataUrl);
      const filename = `${currentDoc.title}_editado.pdf`;
      downloadBlob(pdfBytes, filename);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Hubo un error al generar el PDF exportado. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const registerRenderCallback = (pageIdx: number, fn: () => Promise<string | null>) => {
    renderCallbacks.current.set(pageIdx, fn);
  };

  // If no document is selected, render Document Library
  if (!currentDoc) {
    return (
      <>
        <DocumentLibrary
          documents={documents}
          onOpenDocument={handleOpenDocument}
          onCreateNotebook={handleCreateNotebook}
          onImportPdf={handleImportPdf}
          onDeleteDocument={handleDeleteDocument}
        />
        {isLoadingFile && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-800">
                Cargando documento...
              </span>
            </div>
          </div>
        )}
      </>
    );
  }

  // Otherwise, render Free Notes PDF / Notebook Editor
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-200/90 overflow-hidden">
      {/* Top Floating Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={penColor}
        setColor={setPenColor}
        penWidth={penWidth}
        setPenWidth={setPenWidth}
        highlighterWidth={highlighterWidth}
        setHighlighterWidth={setHighlighterWidth}
        highlighterColor={highlighterColor}
        setHighlighterColor={setHighlighterColor}
        eraserWidth={eraserWidth}
        setEraserWidth={setEraserWidth}
        fingerScrollOnly={fingerScrollOnly}
        setFingerScrollOnly={setFingerScrollOnly}
        currentPage={currentPage}
        totalPages={currentDoc.pageCount}
        onPrevPage={() => scrollToPage(currentPage - 1)}
        onNextPage={() => scrollToPage(currentPage + 1)}
        onAddPage={handleAddPage}
        canUndo={currentPageAnnotation.undoStack.length > 0}
        canRedo={currentPageAnnotation.redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearPage}
        onExport={handleExport}
        onBackToLibrary={() => {
          setDocuments((prev) =>
            prev.map((d) => (d.id === currentDoc.id ? currentDoc : d))
          );
          setCurrentDoc(null);
        }}
        zoom={zoom}
        setZoom={setZoom}
        onFitWidth={handleFitWidth}
        title={currentDoc.title}
        isNotebook={currentDoc.type === 'notebook'}
        paperTemplate={currentDoc.paperTemplate}
      />

      {/* Editor Main Canvas Scroll Area (Continuous Vertical Multi-page Scroll) */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative p-4 flex flex-col items-center gap-4 scroll-smooth"
      >
        {Array.from({ length: currentDoc.pageCount }, (_, idx) => {
          const ann: PageAnnotation = currentDoc.pagesAnnotations[idx] || {
            pageIndex: idx,
            strokes: [],
            undoStack: [],
            redoStack: [],
          };

          return (
            <CanvasPage
              key={`${currentDoc.id}_page_${idx}`}
              pageIndex={idx}
              pdfDoc={pdfDocProxy}
              isNotebook={currentDoc.type === 'notebook'}
              paperTemplate={currentDoc.paperTemplate}
              annotation={ann}
              onUpdateAnnotation={(newAnn) => handleUpdateAnnotationForPage(idx, newAnn)}
              tool={tool}
              penColor={penColor}
              penWidth={penWidth}
              highlighterColor={highlighterColor}
              highlighterWidth={highlighterWidth}
              eraserWidth={eraserWidth}
              zoom={zoom}
              fingerScrollOnly={fingerScrollOnly}
              setRenderCallback={registerRenderCallback}
            />
          );
        })}

        {/* Notebook Add Page Button at Bottom */}
        {currentDoc.type === 'notebook' && (
          <button
            onClick={handleAddPage}
            className="my-6 flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl shadow-md border border-blue-200 font-semibold text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir nueva página al cuaderno</span>
          </button>
        )}
      </main>

      {/* Exporting Indicator Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-800">
              Generando y descargando PDF...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
