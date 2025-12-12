'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ui?: ReactNode;
  }>;
  addMessage: (message: { role: 'user' | 'assistant'; content: string; ui?: ReactNode }) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AIContextType['messages']>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: { role: 'user' | 'assistant'; content: string; ui?: ReactNode }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...message,
      },
    ]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <AIContext.Provider value={{ messages, addMessage, clearMessages, isLoading, setIsLoading }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}