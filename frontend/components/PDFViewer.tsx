'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PDFViewerRef {
  goToPage: (filename: string, page: number, highlightText?: string) => void;
}

interface Props {
  onReady?: () => void;
}

export const PDFViewer = forwardRef<PDFViewerRef, Props>(({ onReady }, ref) => {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Expose goToPage method with optional highlight text
  useImperativeHandle(ref, () => ({
    goToPage: (filename: string, page: number, highlight?: string) => {
      console.log(`📄 Navigating to ${filename} page ${page}`, highlight ? `(highlight: "${highlight.substring(0, 50)}...")` : '');
      setSelectedDoc(filename);
      setCurrentPage(page);
      setHighlightText(highlight || null);
      setIsCollapsed(false);
    }
  }));

  useEffect(() => {
    fetchDocuments();
    
    const handleOpenPDF = (e: CustomEvent<{ filename: string; page: number; highlight?: string }>) => {
      console.log('📄 Opening PDF:', e.detail);
      setSelectedDoc(e.detail.filename);
      setCurrentPage(e.detail.page || 1);
      setHighlightText(e.detail.highlight || null);
      setIsCollapsed(false);
    };

    const handlePDFUploaded = (e: CustomEvent<{ filename: string }>) => {
      console.log('📄 PDF uploaded:', e.detail);
      fetchDocuments();
      setSelectedDoc(e.detail.filename);
      setIsCollapsed(false);
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
  }, []);

  useEffect(() => {
    if (onReady) onReady();
  }, [onReady]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/upload/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
      
      if (data.documents?.length > 0 && !selectedDoc) {
        setSelectedDoc(data.documents[0]);
      }
      
      if (selectedDoc && !data.documents?.includes(selectedDoc)) {
        setSelectedDoc(data.documents?.[0] || null);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

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

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-100 border-l border-gray-200 p-2 w-12">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition shadow-lg"
          title="Open PDF Viewer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span 
          className="text-xs text-gray-500 mt-3 font-medium"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          PDF Viewer
        </span>
        {documents.length > 0 && (
          <span 
            className="text-xs bg-purple-100 text-purple-700 px-1 py-2 rounded mt-2"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {documents.length} docs
          </span>
        )}
      </div>
    );
  }

  // Expanded state
  return (
    <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📄 PDF Viewer
        </h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Collapse"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Document selector */}
        {documents.length > 0 ? (
          <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedDoc || ''}
                onChange={(e) => {
                  setSelectedDoc(e.target.value);
                  setCurrentPage(1);
                  setHighlightText(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
              >
                <option value="">Select document...</option>
                {documents.map((doc) => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
              
              {selectedDoc && (
                <button
                  onClick={() => handleDelete(selectedDoc)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            {selectedDoc && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                  Page {currentPage}
                </span>
                {highlightText && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    🔍 Highlighted
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-center">
            <p className="text-sm text-yellow-700">No documents uploaded yet</p>
          </div>
        )}

        {/* Highlight info banner */}
        {highlightText && (
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200">
            <p className="text-xs text-yellow-800">
              <span className="font-bold">Looking for:</span>{' '}
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
                <div className="text-6xl mb-4">📄</div>
                <p className="font-medium text-gray-600">No document selected</p>
                <p className="text-sm mt-2 text-gray-500">
                  Upload a PDF from the sidebar<br/>or select from the dropdown
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