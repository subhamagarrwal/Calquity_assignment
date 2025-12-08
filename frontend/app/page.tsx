'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, Citation } from '@/store/chat';
import { connectSSE, disconnectSSE } from '@/lib/sse';
import { ChatDisplay } from '@/components/ChatDisplay';
import { PDFViewer, PDFViewerRef } from '@/components/PDFViewer';
import { Sidebar } from '@/components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [input, setInput] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const accumulatedText = useRef('');
  const hasStartedStreaming = useRef(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const citationsRef = useRef<Citation[]>([]);

  const { 
    addMessage, 
    updateLastMessage,
    addCitationsToLastMessage,
    setJobId, 
    setStreaming, 
    setStreamingPhase,
    setError, 
    reset, 
    isStreaming,
    isPdfViewerOpen,
  } = useChatStore();

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

  const handleCitationClick = (source: string, page: number, excerpt?: string) => {
    pdfViewerRef.current?.goToPage(source, page, excerpt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    addMessage({ type: 'text', content: `You: ${input}` });

    const userQuery = input;
    setInput('');
    setStreaming(true);
    setStreamingPhase('processing');
    accumulatedText.current = '';
    hasStartedStreaming.current = false;
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
      let componentReceived = false;

      eventSourceRef.current = connectSSE(job_id, {
        onToolCall: () => {
          // Don't show tool calls - we're in processing phase
          // The processing indicator handles the UI
        },

        onTextChunk: (text) => {
          // First text chunk - transition from processing to streaming
          if (!hasStartedStreaming.current) {
            hasStartedStreaming.current = true;
            setStreamingPhase('streaming');
            addMessage({ type: 'text', content: `AI: ${text}` });
            accumulatedText.current = text;
          } else {
            accumulatedText.current += text;
            updateLastMessage(`AI: ${accumulatedText.current}`);
          }
          fullResponse = accumulatedText.current;
        },

        onCitation: (citation) => {
          // Store citations
          citationsRef.current.push(citation);
          console.log(`📚 Stored citation ${citation.number}:`, citation.source, 'page', citation.page);
          // Update the last message with citations
          addCitationsToLastMessage([...citationsRef.current]);
        },

        onComponent: (componentData) => {
          // Visualization streamed from backend
          componentReceived = true;
          console.log('📊 Received streamed component:', componentData.component || componentData.name);
          addMessage({ type: 'component', content: JSON.stringify(componentData) });
        },

        onEnd: async () => {
          // If we already got a component from the stream, no need to generate another
          if (componentReceived) {
            console.log('✅ Stream complete with visualization');
            setStreamingPhase('idle');
            setStreaming(false);
            if (eventSourceRef.current) {
              disconnectSSE(eventSourceRef.current);
              eventSourceRef.current = null;
            }
            accumulatedText.current = '';
            hasStartedStreaming.current = false;
            return;
          }

          // Fallback: Try to generate visualization with Llama 4 vision
          try {
            setStreamingPhase('generating-ui');
            console.log('🎨 Generating enhanced visualization with Llama 4...');

            // Get the first citation's page screenshot for vision analysis
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
                  console.log('📸 Got PDF screenshot for Llama 4 vision analysis');
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

          setStreamingPhase('idle');
          setStreaming(false);
          if (eventSourceRef.current) {
            disconnectSSE(eventSourceRef.current);
            eventSourceRef.current = null;
          }
          accumulatedText.current = '';
          hasStartedStreaming.current = false;
        },

        onError: (error) => {
          setError(error);
          setStreamingPhase('idle');
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
      setStreamingPhase('idle');
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
    hasStartedStreaming.current = false;
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main chat area - adjusts when PDF viewer is open */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isPdfViewerOpen ? 'md:mr-[480px] lg:mr-[520px]' : ''}`}>
        <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                Calquity
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">AI Document Assistant</p>
            </div>
            {/* Mobile sidebar toggle */}
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        <ChatDisplay onCitationClick={handleCitationClick} />

        <div className="bg-white border-t border-gray-200 p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents..."
                disabled={isStreaming}
                className="w-full pl-4 pr-28 md:pr-36 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm shadow-sm"
              />
              <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="hidden md:flex px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors items-center"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="px-4 md:px-6 py-2 bg-black text-white text-xs font-medium rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center gap-2"
                >
                  {isStreaming ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="hidden md:inline">Thinking...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="hidden md:inline">Ask</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-400 text-center mt-3">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* PDF Viewer - slides in from right */}
      <PDFViewer ref={pdfViewerRef} />
    </div>
  );
}