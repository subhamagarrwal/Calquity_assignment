'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat';
import { ChatMessage } from './ChatMessage';

interface Props {
  onCitationClick?: (source: string, page: number) => void;
}

export function ChatDisplay({ onCitationClick }: Props) {
  const { messages, isStreaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter out citation messages - they're shown as inline [1], [2] markers
  const filteredMessages = messages.filter(msg => {
    // Remove standalone citation messages
    if (msg.type === 'citation') return false;
    
    // Remove "Found citations" tool call
    if (msg.type === 'tool_call' && msg.content.includes('Found citations')) return false;
    
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg font-medium">Ask a question about your documents</p>
            <p className="text-sm mt-2">Upload PDFs and ask questions to get AI-powered insights</p>
            <p className="text-xs mt-4 text-gray-400">
              Click the numbered citations [1], [2] in responses to view sources
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              type={msg.type}
              content={msg.content}
              onCitationClick={onCitationClick}
            />
          ))
        )}
        
        {isStreaming && (
          <div className="flex items-center gap-2 text-purple-600 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}