'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat';
import { connectSSE, disconnectSSE } from '@/lib/sse';
import { ChatDisplay } from '@/components/ChatDisplay';
import { PDFViewer, PDFViewerRef } from '@/components/PDFViewer';
import { Sidebar } from '@/components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Citation {
  number: number;
  source: string;
  page: number;
  excerpt: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const accumulatedText = useRef('');
  const aiMessageIndex = useRef<number>(-1);
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const citationsRef = useRef<Citation[]>([]);

  const { messages, addMessage, setJobId, setStreaming, setError, reset, isStreaming } =
    useChatStore();

  useEffect(() => {
    reset();

    // Listen for citation clicks from inline markers
    const handleCitationClick = (e: CustomEvent<{ number: number }>) => {
      const citation = citationsRef.current.find(c => c.number === e.detail.number);
      if (citation) {
        console.log(`📚 Citation ${citation.number} clicked:`, citation);
        // Pass excerpt for highlighting
        pdfViewerRef.current?.goToPage(citation.source, citation.page, citation.excerpt);
      }
    };

    // Listen for open-pdf events from sidebar
    const handleOpenPDF = (e: CustomEvent<{ filename: string; page: number }>) => {
      pdfViewerRef.current?.goToPage(e.detail.filename, e.detail.page);
    };

    window.addEventListener('citation-click', handleCitationClick as EventListener);
    window.addEventListener('open-pdf', handleOpenPDF as EventListener);

    return () => {
      window.removeEventListener('citation-click', handleCitationClick as EventListener);
      window.removeEventListener('open-pdf', handleOpenPDF as EventListener);
    };
  }, [reset]);

  const handleCitationClick = (source: string, page: number) => {
    pdfViewerRef.current?.goToPage(source, page);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    addMessage({ type: 'text', content: `You: ${input}` });

    const userQuery = input;
    setInput('');
    setStreaming(true);
    accumulatedText.current = '';
    aiMessageIndex.current = -1;
    citationsRef.current = [];

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!res.ok) throw new Error('Failed to create job');

      const { job_id } = await res.json();
      setJobId(job_id);

      let fullResponse = '';

      eventSourceRef.current = connectSSE(job_id, {
        onToolCall: (message) => {
          // Don't show "Found citations" message
          if (!message.includes('Found citations')) {
            addMessage({ type: 'tool_call', content: message });
          }
        },

        onTextChunk: (text) => {
          accumulatedText.current += text;
          fullResponse += text;

          const currentMessages = useChatStore.getState().messages;

          if (aiMessageIndex.current === -1) {
            aiMessageIndex.current = currentMessages.length;
            addMessage({ type: 'text', content: `AI: ${accumulatedText.current}` });
          } else {
            const newMessages = [...currentMessages];
            newMessages[aiMessageIndex.current] = {
              type: 'text',
              content: `AI: ${accumulatedText.current}`
            };
            useChatStore.setState({ messages: newMessages });
          }
        },

        onCitation: (citation) => {
          // Store citations but don't display as cards
          citationsRef.current.push(citation);
          console.log(`📚 Stored citation ${citation.number}:`, citation.source, 'page', citation.page);
        },

        onComponent: (componentData) => {
          addMessage({ type: 'component', content: JSON.stringify(componentData) });
        },

        onEnd: async () => {
          try {
            addMessage({ type: 'tool_call', content: 'Generating visualization...' });

            // Get the first citation's page screenshot for better visualization
            let imageBase64 = null;
            if (citationsRef.current.length > 0) {
              const firstCitation = citationsRef.current[0];
              try {
                const screenshotRes = await fetch(
                  `${API_URL}/upload/pdf/${encodeURIComponent(firstCitation.source)}/screenshot?page=${firstCitation.page}`
                );
                if (screenshotRes.ok) {
                  const screenshotData = await screenshotRes.json();
                  imageBase64 = screenshotData.image;
                  console.log('📸 Got PDF screenshot for vision analysis');
                }
              } catch (err) {
                console.log('Could not get PDF screenshot, using text-only');
              }
            }

            const groqRes = await fetch('/api/groq-gen-ui', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: userQuery,
                context: fullResponse.substring(0, 3000),
                imageBase64,
                citations: citationsRef.current
              }),
            });

            if (groqRes.ok) {
              const uiComponent = await groqRes.json();
              if (!uiComponent.error) {
                addMessage({ type: 'component', content: JSON.stringify(uiComponent) });
              }
            }
          } catch (err) {
            console.error('Failed to generate UI:', err);
          }

          setStreaming(false);
          if (eventSourceRef.current) {
            disconnectSSE(eventSourceRef.current);
            eventSourceRef.current = null;
          }
          accumulatedText.current = '';
          aiMessageIndex.current = -1;
        },

        onError: (error) => {
          setError(error);
          setStreaming(false);
          if (eventSourceRef.current) {
            disconnectSSE(eventSourceRef.current);
            eventSourceRef.current = null;
          }
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
    citationsRef.current = [];
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col border-r border-gray-200">
        <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                Calquity
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">AI Document Assistant</p>
            </div>
          </div>
        </header>

        <ChatDisplay onCitationClick={handleCitationClick} />

        <div className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents..."
                disabled={isStreaming}
                className="w-full pl-4 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm"
              />
              <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="px-6 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                >
                  {isStreaming ? 'Thinking...' : 'Ask'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <PDFViewer ref={pdfViewerRef} />
    </div>
  );
}