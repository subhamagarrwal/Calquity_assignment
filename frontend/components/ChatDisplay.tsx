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
    <div className="flex-1 overflow-y-auto p-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4 opacity-20">🔍</div>
            <p className="text-base font-medium text-gray-500">Ask a question about your documents</p>
            <p className="text-sm mt-2 text-gray-400">Upload PDFs and ask questions to get AI-powered insights</p>
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
          <div className="flex items-center gap-2 text-gray-400 py-2 pl-4">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}