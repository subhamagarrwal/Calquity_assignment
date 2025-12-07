'use client';

import { useState, useEffect } from 'react';
import { UploadPDF } from './UploadPDF';
import { usePDFStore } from '@/store/pdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function Sidebar() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { openPDF } = usePDFStore();

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/upload/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <UploadPDF />

      <div className="mt-6">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
          <span>📚 Documents</span>
          <span className="text-xs text-gray-500 font-normal">
            {documents.length} files
          </span>
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No documents yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div
                key={i}
                onClick={() => openPDF(doc, 1)}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">
                      {doc}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}