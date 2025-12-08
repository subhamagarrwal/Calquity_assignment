'use client';

import { Citation } from '@/store/chat';

interface SourceCardsProps {
  citations: Citation[];
  onCitationClick?: (source: string, page: number, excerpt: string) => void;
}

export function SourceCards({ citations, onCitationClick }: SourceCardsProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sources</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {citations.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {citations.map((citation, idx) => (
          <button
            key={idx}
            onClick={() => onCitationClick?.(citation.source, citation.page, citation.excerpt)}
            className="group flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 text-left animate-fade-in-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Citation number badge */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-medium flex items-center justify-center">
              {citation.number}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Document name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">📄</span>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {citation.source}
                </span>
              </div>
              
              {/* Page indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                  Page {citation.page}
                </span>
              </div>
              
              {/* Excerpt preview */}
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                &ldquo;{citation.excerpt.substring(0, 120)}...&rdquo;
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
