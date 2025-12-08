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
            addMessage({ type: 'tool_call', content: '🎨 Generating visualization...' });
            
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
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Calquity 🎨
            </h1>
            <p className="text-purple-100 text-sm">AI Document Assistant with Generative UI</p>
          </div>
        </header>

        <ChatDisplay onCitationClick={handleCitationClick} />

        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents... (click [1], [2] to view sources)"
                disabled={isStreaming}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 font-semibold transition"
              >
                {isStreaming ? 'Generating...' : 'Ask'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </form>
          </div>
        </div>
      </div>

      <PDFViewer ref={pdfViewerRef} />
    </div>
  );
}