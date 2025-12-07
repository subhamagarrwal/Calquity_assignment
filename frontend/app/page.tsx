'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat';
import { connectSSE, disconnectSSE } from '@/lib/sse';
import { ChatDisplay } from '@/components/ChatDisplay';
import { PDFViewer } from '@/components/PDFViewer';
import { Sidebar } from '@/components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [input, setInput] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const responseTextRef = useRef('');
  const messageIdRef = useRef<number | null>(null);

  const { addMessage, updateLastMessage, setJobId, setStreaming, setError, reset, isStreaming } =
    useChatStore();

  // Clear chat on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    addMessage({ type: 'text', content: `You: ${input}` });

    const userQuery = input;
    setInput('');
    setStreaming(true);
    responseTextRef.current = '';
    messageIdRef.current = null;

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!res.ok) throw new Error('Failed to create job');

      const { job_id } = await res.json();
      setJobId(job_id);

      eventSourceRef.current = connectSSE(job_id, {
        onToolCall: (message) => {
          addMessage({ type: 'tool_call', content: message });
        },

        onTextChunk: (text) => {
          responseTextRef.current += text;
          
          // Create or update the streaming message
          if (messageIdRef.current === null) {
            // First chunk - add new message
            const messages = useChatStore.getState().messages;
            messageIdRef.current = messages.length;
            addMessage({ type: 'text', content: responseTextRef.current });
          } else {
            // Update existing message
            updateLastMessage(responseTextRef.current);
          }
        },

        onCitation: (citation) => {
          addMessage({
            type: 'citation',
            content: `${citation.source} (Page ${citation.page})`,
          });
        },

        onComponent: (componentData) => {
          addMessage({ type: 'component', content: componentData });
        },

        onEnd: () => {
          setStreaming(false);
          if (eventSourceRef.current) {
            disconnectSSE(eventSourceRef.current);
            eventSourceRef.current = null;
          }
          responseTextRef.current = '';
          messageIdRef.current = null;
        },

        onError: (error) => {
          setError(error);
          setStreaming(false);
          if (eventSourceRef.current) {
            disconnectSSE(eventSourceRef.current);
            eventSourceRef.current = null;
          }
          responseTextRef.current = '';
          messageIdRef.current = null;
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
      setStreaming(false);
    }
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      disconnectSSE(eventSourceRef.current);
      eventSourceRef.current = null;
    }
    reset();
    responseTextRef.current = '';
    messageIdRef.current = null;
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Calquity</h1>
            <p className="text-blue-100">AI Document Assistant with PDF Viewer</p>
          </div>
        </header>

        <ChatDisplay />

        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={isStreaming}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition"
              >
                {isStreaming ? 'Streaming...' : 'Ask'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Clear
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* PDF Viewer Overlay */}
      <PDFViewer />
    </div>
  );
}