'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useChatStore } from '@/store/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PDFViewerRef {
  goToPage: (filename: string, page: number, highlightText?: string) => void;
  close: () => void;
}

interface Props {
  onReady?: () => void;
}

export const PDFViewer = forwardRef<PDFViewerRef, Props>(({ onReady }, ref) => {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { setPdfViewerOpen } = useChatStore();

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/upload/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
      
      if (data.documents?.length > 0 && !selectedDoc) {
        setSelectedDoc(data.documents[0]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, [selectedDoc]);

  // Handle opening with animation
  const openViewer = () => {
    setIsAnimating(true);
    setIsOpen(true);
    setPdfViewerOpen(true);
    setTimeout(() => setIsAnimating(false), 350);
  };

  // Handle closing with animation
  const closeViewer = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setPdfViewerOpen(false);
      setIsAnimating(false);
    }, 300);
  };

  // Expose goToPage method with optional highlight text
  useImperativeHandle(ref, () => ({
    goToPage: (filename: string, page: number, highlight?: string) => {
      console.log(`📄 Navigating to ${filename} page ${page}`, highlight ? `(highlight: "${highlight.substring(0, 50)}...")` : '');
      setSelectedDoc(filename);
      setCurrentPage(page);
      setHighlightText(highlight || null);
      openViewer();
    },
    close: closeViewer,
  }));

  useEffect(() => {
    fetchDocuments();
    
    const handleOpenPDF = (e: CustomEvent<{ filename: string; page: number; highlight?: string }>) => {
      console.log('Opening PDF:', e.detail);
      setSelectedDoc(e.detail.filename);
      setCurrentPage(e.detail.page || 1);
      setHighlightText(e.detail.highlight || null);
      openViewer();
    };

    const handlePDFUploaded = (e: CustomEvent<{ filename: string }>) => {
      console.log('PDF uploaded:', e.detail);
      fetchDocuments();
      setSelectedDoc(e.detail.filename);
      openViewer();
    };

    const handlePDFDeleted = () => {
      fetchDocuments();
    };

    window.addEventListener('open-pdf', handleOpenPDF as EventListener);
    window.addEventListener('pdf-uploaded', handlePDFUploaded as EventListener);
    window.addEventListener('pdf-deleted', handlePDFDeleted as EventListener);

    return () => {
      window.removeEventListener('open-pdf', handleOpenPDF as EventListener);
      window.removeEventListener('pdf-uploaded', handlePDFUploaded as EventListener);
      window.removeEventListener('pdf-deleted', handlePDFDeleted as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDocuments]);

  useEffect(() => {
    if (onReady) onReady();
  }, [onReady]);

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
      await fetch(`${API_URL}/upload/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      if (selectedDoc === filename) {
        setSelectedDoc(null);
      }
      
      await fetchDocuments();
      
      window.dispatchEvent(new CustomEvent('pdf-deleted', { 
        detail: { filename } 
      }));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Build PDF URL with search/highlight parameter
  const buildPdfUrl = () => {
    if (!selectedDoc) return null;
    
    let url = `${API_URL}/upload/pdf/${encodeURIComponent(selectedDoc)}#page=${currentPage}`;
    
    // Add search parameter for text highlighting (works in Chrome/Edge PDF viewer)
    if (highlightText) {
      // Extract first few words for search
      const searchText = highlightText
        .split(/\s+/)
        .slice(0, 5)
        .join(' ')
        .replace(/[^\w\s]/g, '');
      
      if (searchText) {
        url += `&search=${encodeURIComponent(searchText)}`;
      }
    }
    
    return url;
  };

  const pdfUrl = buildPdfUrl();

  // Closed state - show minimal toggle button
  if (!isOpen && !isAnimating) {
    return (
      <button
        onClick={openViewer}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-3 py-4 bg-black text-white rounded-l-xl shadow-xl hover:bg-gray-800 transition-all hover:px-4 group"
        title="Open PDF Viewer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-xs font-medium hidden group-hover:block">PDF</span>
        {documents.length > 0 && (
          <span className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {documents.length}
          </span>
        )}
      </button>
    );
  }

  // Expanded state with animation
  return (
    <div 
      className={`fixed inset-y-0 right-0 z-40 flex flex-col bg-white border-l border-gray-200 shadow-2xl
        w-full md:w-[480px] lg:w-[520px]
        ${isOpen && !isAnimating ? 'animate-slide-in' : ''}
        ${!isOpen && isAnimating ? 'animate-slide-out' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-sm">📄</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">PDF Viewer</h2>
            <p className="text-xs text-gray-500">{documents.length} documents</p>
          </div>
        </div>
        <button
          onClick={closeViewer}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close PDF Viewer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Document selector */}
        {documents.length > 0 ? (
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <select
                value={selectedDoc || ''}
                onChange={(e) => {
                  setSelectedDoc(e.target.value);
                  setCurrentPage(1);
                  setHighlightText(null);
                }}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 text-sm bg-white"
              >
                <option value="">Select document...</option>
                {documents.map((doc) => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
              
              {selectedDoc && (
                <button
                  onClick={() => handleDelete(selectedDoc)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            {selectedDoc && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-black text-white px-2.5 py-1 rounded-full font-medium">
                  Page {currentPage}
                </span>
                {highlightText && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <span>🔍</span> Highlighted
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <p className="text-sm text-amber-700 text-center">
              No documents uploaded yet
            </p>
          </div>
        )}

        {/* Highlight info banner */}
        {highlightText && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <p className="text-xs text-yellow-800">
              <span className="font-bold">Searching for:</span>{' '}
              &quot;{highlightText.substring(0, 80)}...&quot;
            </p>
          </div>
        )}

        {/* PDF Display */}
        <div className="flex-1 bg-gray-100 relative">
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              key={`${selectedDoc}-${currentPage}-${highlightText}`}
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <span className="text-3xl">📄</span>
                </div>
                <p className="font-medium text-gray-600 mb-1">No document selected</p>
                <p className="text-sm text-gray-400">
                  Upload a PDF or click a citation to view
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';