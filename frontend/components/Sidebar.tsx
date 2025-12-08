'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Document {
  name: string;
}

export function Sidebar() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    fetchDocuments();
    
    // Listen for pdf-deleted events to refresh list
    const handlePDFDeleted = () => {
      fetchDocuments();
    };
    
    window.addEventListener('pdf-deleted', handlePDFDeleted as EventListener);
    return () => {
      window.removeEventListener('pdf-deleted', handlePDFDeleted as EventListener);
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/upload/documents`);
      const data = await res.json();
      setDocuments((data.documents || []).map((name: string) => ({ name })));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress('Processing PDF...');
      
      const res = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadProgress('✓ Upload complete!');
        await fetchDocuments();
        
        // Dispatch event to open PDF viewer with new file
        window.dispatchEvent(new CustomEvent('pdf-uploaded', { 
          detail: { filename: data.filename } 
        }));
        
        setTimeout(() => setUploadProgress(''), 2000);
      } else {
        const error = await res.json();
        setUploadProgress(`✗ ${error.detail || 'Upload failed'}`);
        setTimeout(() => setUploadProgress(''), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress('✗ Upload failed');
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
      await fetch(`${API_URL}/upload/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      await fetchDocuments();
      
      window.dispatchEvent(new CustomEvent('pdf-deleted', { 
        detail: { filename } 
      }));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDocumentClick = (filename: string) => {
    console.log('📄 Sidebar: Opening PDF', filename);
    // Dispatch event to open PDF viewer
    window.dispatchEvent(new CustomEvent('open-pdf', { 
      detail: { filename, page: 1 } 
    }));
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
        <h1 className="text-lg font-bold text-gray-800">AI Document Assistant</h1>
      </div>

      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200">
        <div className={`border-2 border-dashed rounded-xl p-5 transition cursor-pointer ${
          isUploading ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}>
          <label className="flex flex-col items-center cursor-pointer">
            <div className={`mb-2 ${isUploading ? 'animate-bounce' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 font-medium text-center">
              {isUploading ? 'Processing...' : 'Click to upload PDF'}
            </span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
        
        {uploadProgress && (
          <div className={`mt-3 text-sm text-center py-2 px-3 rounded-lg ${
            uploadProgress.includes('✓') ? 'bg-green-100 text-green-700' : 
            uploadProgress.includes('✗') ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              📚 Documents
            </h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              {documents.length} files
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs mt-1">Upload a PDF to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => handleDocumentClick(doc.name)}
                  className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 hover:shadow-sm transition cursor-pointer border border-transparent hover:border-purple-200"
                >
                  <div className="text-2xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {doc.name}
                    </p>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(doc.name, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Arrow to open */}
                  <div className="text-purple-500 group-hover:translate-x-1 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}