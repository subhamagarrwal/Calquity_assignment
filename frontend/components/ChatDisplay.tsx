'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chat';
import { ChatMessage } from './ChatMessage';

export function ChatDisplay() {
  const { messages, isStreaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Welcome to Calquity
            </h2>
            <p className="text-gray-500">
              Upload a PDF and start asking questions!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage key={idx} type={msg.type} content={msg.content} />
          ))
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Streaming...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}