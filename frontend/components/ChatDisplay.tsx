'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat';
import { ChatMessage } from './ChatMessage';
import { SourceCards } from './SourceCards';

interface Props {
  onCitationClick?: (source: string, page: number, excerpt?: string) => void;
}

// Tool step indicators for processing phase
const toolSteps = [
  { icon: '🔍', label: 'Searching documents...', delay: 0 },
  { icon: '📄', label: 'Reading relevant sections...', delay: 800 },
  { icon: '🧠', label: 'Analyzing content...', delay: 1600 },
];

// Processing indicator component with modern animation
function ProcessingIndicator({ phase }: { phase: string }) {
  const phaseConfig = {
    'processing': {
      title: 'Thinking',
      subtitle: 'Analyzing your question',
      icon: '🔍',
      showSteps: true,
    },
    'streaming': {
      title: 'Generating',
      subtitle: 'Writing response',
      icon: '✨',
      showSteps: false,
    },
    'generating-ui': {
      title: 'Creating visualization',
      subtitle: 'Generating charts & insights',
      icon: '📊',
      showSteps: false,
    },
  };

  const config = phaseConfig[phase as keyof typeof phaseConfig] || phaseConfig['processing'];

  return (
    <div className="flex flex-col gap-3 my-4 animate-fade-in-up">
      {/* Main processing card */}
      <div className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm max-w-fit">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-lg">
            <span className="text-lg">{config.icon}</span>
          </div>
          <div className="absolute -inset-1 rounded-full border-2 border-gray-200 border-t-black animate-spin"></div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">{config.title}</span>
          <span className="text-xs text-gray-500">{config.subtitle}</span>
        </div>
      </div>

      {/* Tool call steps - only show during processing */}
      {config.showSteps && (
        <div className="flex flex-col gap-2 pl-4">
          {toolSteps.map((step, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2 text-xs text-gray-500 animate-fade-in-up"
              style={{ animationDelay: `${step.delay}ms` }}
            >
              <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-[10px]">
                {step.icon}
              </span>
              <span>{step.label}</span>
              <div className="flex gap-0.5 ml-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Typing cursor component
function TypingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-black ml-0.5 animate-cursor"></span>
  );
}

export function ChatDisplay({ onCitationClick }: Props) {
  const { messages, isStreaming, streamingPhase } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingPhase]);

  // Filter out tool_call messages - we show a unified processing indicator instead
  const filteredMessages = messages.filter(msg => {
    // Remove tool call messages (they're internal processing steps)
    if (msg.type === 'tool_call') return false;

    // Remove standalone citation messages
    if (msg.type === 'citation') return false;

    return true;
  });

  // Group messages to show source cards after AI responses
  const renderMessages = () => {
    return filteredMessages.map((msg, idx) => {
      const isAiMessage = msg.type === 'text' && msg.content.startsWith('AI:');
      const hasCitations = msg.citations && msg.citations.length > 0;

      return (
        <div key={idx} className="animate-fade-in-up">
          <ChatMessage
            type={msg.type as 'text' | 'tool_call' | 'citation' | 'component'}
            content={msg.content}
            onCitationClick={onCitationClick}
          />
          
          {/* Show source cards after AI messages with citations */}
          {isAiMessage && hasCitations && (
            <SourceCards 
              citations={msg.citations!} 
              onCitationClick={(source, page, excerpt) => onCitationClick?.(source, page, excerpt)}
            />
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-white">
      <div className="max-w-3xl mx-auto space-y-6">
        {filteredMessages.length === 0 && !isStreaming ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner">
              <span className="text-4xl">📄</span>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Ask about your documents</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Upload PDFs and ask questions to get AI-powered insights with source citations
            </p>
          </div>
        ) : (
          renderMessages()
        )}

        {/* Show processing indicator during processing phase */}
        {isStreaming && streamingPhase === 'processing' && (
          <ProcessingIndicator phase="processing" />
        )}

        {/* Show generating UI indicator */}
        {isStreaming && streamingPhase === 'generating-ui' && (
          <ProcessingIndicator phase="generating-ui" />
        )}

        {/* Streaming cursor when text is being generated */}
        {isStreaming && streamingPhase === 'streaming' && (
          <div className="flex items-center gap-1 text-gray-400 pl-1 -mt-4">
            <TypingCursor />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}