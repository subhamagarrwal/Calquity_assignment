'use client';

import { usePDFStore } from '@/store/pdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function PDFViewer() {
  const { isOpen, pdfId, page, snippet, closePDF } = usePDFStore();

  if (!isOpen || !pdfId) return null;

  const pdfUrl = `${API_URL}/upload/uploads/${pdfId}#page=${page}`;

  return (
    <div className="fixed right-0 top-0 h-screen w-1/2 bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
        <div className="flex-1">
          <h3 className="font-semibold text-lg truncate">{pdfId}</h3>
          <p className="text-sm text-gray-600">Page {page}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={closePDF}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
        >
          ✕ Close
        </button>
      </div>

      {/* Snippet Highlight */}
      {snippet && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-sm text-yellow-900">
            <span className="font-semibold">📌 Highlighted:</span> {snippet}
          </p>
        </div>
      )}

      {/* PDF Embed */}
      <div className="flex-1 bg-gray-100">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={pdfId}
        />
      </div>
    </div>
  );
}