'use client';

import { usePDFStore } from '@/store/pdf';

interface Props {
  source: string;
  page: number;
  snippet?: string;
}

export function SourceCard({ source, page, snippet }: Props) {
  const { openPDF } = usePDFStore();

  return (
    <div 
      className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded cursor-pointer hover:bg-purple-100 transition"
      onClick={() => openPDF(source, page, snippet)}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">📄</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-purple-900">
            {source} - Page {page}
          </p>
          {snippet && (
            <p className="text-xs text-purple-700 mt-1 line-clamp-2">
              {snippet}
            </p>
          )}
        </div>
        <button className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
          View →
        </button>
      </div>
    </div>
  );
}