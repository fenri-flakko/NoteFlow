import React, { useRef, useState } from 'react';
import {
  FileUp,
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Calendar,
  Grid,
  AlignLeft,
  CircleDot,
  File
} from 'lucide-react';
import type { DocItem, PaperTemplate } from '../types';

interface DocumentLibraryProps {
  documents: DocItem[];
  onOpenDocument: (doc: DocItem) => void;
  onCreateNotebook: (title: string, template: PaperTemplate) => void;
  onImportPdf: (file: File) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  onOpenDocument,
  onCreateNotebook,
  onImportPdf,
  onDeleteDocument,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);
  const [notebookTitle, setNotebookTitle] = useState('Cuaderno de Apuntes');
  const [selectedTemplate, setSelectedTemplate] = useState<PaperTemplate>('blank');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onImportPdf(file);
      e.target.value = ''; // Always reset so re-selecting same file works
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImportPdf(e.dataTransfer.files[0]);
    }
  };

  const handleCreateNotebookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateNotebook(notebookTitle.trim() || 'Mi Cuaderno', selectedTemplate);
    setShowNewNotebookModal(false);
    setNotebookTitle('Cuaderno de Apuntes');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Hidden file input outside of any container to prevent click bubbling */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,.txt,text/plain"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              NoteFlow
            </h1>
            <p className="text-xs text-slate-500">Editor de PDF y Cuaderno Digital</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs md:text-sm transition-all active:scale-95"
          >
            <FileUp className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Importar PDF / Archivo</span>
          </button>

          {/* Quick New Notebook Button */}
          <button
            onClick={() => setShowNewNotebookModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs md:text-sm shadow-md shadow-blue-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cuaderno</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Quick Action Hero Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Action 1: Cuaderno en Blanco */}
          <div
            onClick={() => setShowNewNotebookModal(true)}
            className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white p-6 md:p-7 rounded-2xl shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1 text-white">
                  Cuaderno en Blanco
                </h2>
                <p className="text-blue-100 text-sm">
                  Crea apuntes a mano alzada al instante con lápiz digital, plantillas cuadrícula, líneas o puntos.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full w-fit">
                <span>Comenzar a escribir</span>
                <span className="text-base leading-none">→</span>
              </div>
            </div>
            {/* Background geometric accents */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          </div>

          {/* Action 2: Importar Documento / PDF */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer group relative overflow-hidden bg-white border-2 border-dashed p-6 md:p-7 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1">
                Importar PDF o Documento
              </h2>
              <p className="text-slate-500 text-sm">
                Arrastra tu PDF aquí o toca para seleccionarlo desde tu iPad, tablet o dispositivo.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full w-fit">
              <span>Seleccionar archivo</span>
              <span className="text-base leading-none">+</span>
            </div>
          </div>
        </div>

        {/* Saved Documents Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              Tus Cuadernos y Documentos
            </h3>
            <span className="text-xs font-medium text-slate-500">
              {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold text-slate-700">No tienes documentos aún</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Comienza creando un cuaderno en blanco para tomar apuntes o importa cualquier PDF para subrayarlo y editarlo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="group cursor-pointer bg-white border border-slate-200/80 hover:border-blue-400 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail / Cover preview */}
                  <div className="aspect-[3/4] w-full bg-slate-100 relative flex items-center justify-center border-b border-slate-100 p-2">
                    {doc.thumbnail ? (
                      <img
                        src={doc.thumbnail}
                        alt={doc.title}
                        className="w-full h-full object-contain shadow-sm rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        {doc.type === 'pdf' ? (
                          <File className="w-10 h-10 text-blue-400" />
                        ) : (
                          <BookOpen className="w-10 h-10 text-amber-500" />
                        )}
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          {doc.type}
                        </span>
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar "${doc.title}"?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & info */}
                  <div className="p-3">
                    <h4 className="font-semibold text-xs md:text-sm text-slate-800 truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{doc.pageCount} pág{doc.pageCount !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal: Nuevo Cuaderno en Blanco */}
      {showNewNotebookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Crear Nuevo Cuaderno</h3>
              <button
                onClick={() => setShowNewNotebookModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotebookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título del cuaderno
                </label>
                <input
                  type="text"
                  value={notebookTitle}
                  onChange={(e) => setNotebookTitle(e.target.value)}
                  placeholder="Ej. Apuntes de Clase, Ideas, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Tipo de Papel
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Blanco */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('blank')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                      selectedTemplate === 'blank'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <File className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-xs font-semibold">Blanco</div>
                      <div className="text-[10px] text-slate-500">Sin líneas</div>
                    </div>
                  </button>

                  {/* Cuadriculado */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('grid')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                      selectedTemplate === 'grid'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Grid className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-xs font-semibold">Cuadriculado</div>
                      <div className="text-[10px] text-slate-500">Matemáticas</div>
                    </div>
                  </button>

                  {/* Rayado */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('ruled')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                      selectedTemplate === 'ruled'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <AlignLeft className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-xs font-semibold">Rayado</div>
                      <div className="text-[10px] text-slate-500">Líneas de texto</div>
                    </div>
                  </button>

                  {/* Puntos */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('dotted')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                      selectedTemplate === 'dotted'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <CircleDot className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-xs font-semibold">Puntos</div>
                      <div className="text-[10px] text-slate-500">Bullet journal</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewNotebookModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/25 transition active:scale-95"
                >
                  Crear Cuaderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
