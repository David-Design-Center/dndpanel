/**
 * PDF Viewer Component
 * Uses pdfjs-dist to render PDFs with page navigation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

// Use unpkg CDN for the PDF.js worker (mirrors npm directly)
// Must match the installed pdfjs-dist version (5.4.394)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

interface PdfViewerProps {
  /** Data URL or blob URL of the PDF */
  url: string;
  /** Optional class name for the container */
  className?: string;
}

type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

export function PdfViewer({ url, className = '' }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0); // Default to 100% zoom
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📄 PdfViewer: Loading PDF...');
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        
        if (cancelled) {
          doc.destroy();
          return;
        }

        loadedDoc = doc;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        console.log(`📄 PdfViewer: Loaded PDF with ${doc.numPages} pages`);
      } catch (err) {
        console.error('📄 PdfViewer: Error loading PDF:', err);
        if (!cancelled) {
          setError('Failed to load PDF');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (loadedDoc) {
        loadedDoc.destroy();
      }
    };
  }, [url]);

  // Render current page with high quality
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    setRendering(true);

    try {
      const page = await pdfDoc.getPage(currentPage);
      
      // Use devicePixelRatio for sharp rendering on high-DPI displays
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;

      // Set canvas dimensions with pixel ratio for sharp rendering
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      
      // Scale down with CSS to display at correct size
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Scale context for high-DPI rendering
      context.scale(pixelRatio, pixelRatio);

      // Render page
      const renderTask = page.render({
        canvasContext: context,
        viewport,
        canvas,
      });

      await renderTask.promise;
      console.log(`📄 PdfViewer: Rendered page ${currentPage}/${totalPages} at ${Math.round(scale * 100)}% (pixelRatio: ${pixelRatio})`);
    } catch (err) {
      if ((err as Error).name !== 'RenderingCancelledException') {
        console.error('📄 PdfViewer: Error rendering page:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale, totalPages, rendering]);

  useEffect(() => {
    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Navigation handlers
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNextPage();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-100 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-100 ${className}`}>
        <div className="text-center text-red-500">
          <p className="font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">The PDF could not be loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-800 ${className}`} ref={containerRef}>
      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-2 px-4 bg-gray-900 text-white">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page (←)"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm min-w-[80px] text-center">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page (→)"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* Canvas container - scrollable */}
      <div className="flex-1 overflow-auto p-4" style={{ maxHeight: 'calc(100% - 48px)' }}>
        <div className="flex justify-center min-h-full">
          <div className="relative inline-block">
            <canvas ref={canvasRef} className="shadow-lg bg-white" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
