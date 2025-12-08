import {create} from "zustand";

export type ChatMessageType = 'text' | 'tool_call' | 'citation' | 'component' | 'sources';
export type StreamingPhase = 'idle' | 'processing' | 'streaming' | 'generating-ui';

export interface Citation {
    number: number;
    source: string;
    page: number;
    excerpt: string;
}

export interface ChatMessage {
    id:string;
    type: ChatMessageType;
    content: string; 
    timestamp: number;
    metadata?: Record<string, unknown>;
    citations?: Citation[];
}

interface ChatStore {
    messages: ChatMessage[];
    jobId: string | null;
    isStreaming: boolean;
    streamingPhase: StreamingPhase;
    error: string | null;
    isPdfViewerOpen: boolean;
    currentCitations: Citation[];

    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    updateLastMessage: (content: string) => void;
    addCitationsToLastMessage: (citations: Citation[]) => void;
    setJobId: (jobId: string | null) => void;
    setStreaming: (isStreaming: boolean) => void;
    setStreamingPhase: (phase: StreamingPhase) => void;
    setError: (error: string | null) => void;
    setPdfViewerOpen: (isOpen: boolean) => void;
    setCurrentCitations: (citations: Citation[]) => void;
    reset: ()=> void;
}

export const useChatStore = create<ChatStore>((set)=>({
    messages: [],
    jobId: null,
    isStreaming: false,
    streamingPhase: 'idle',
    error: null,
    isPdfViewerOpen: false,
    currentCitations: [],

    addMessage: (message)=>
        set((state)=>({
            messages:[
                ...state.messages,
                {
                    ...message,
                    id:`${Date.now()}- ${Math.random()}`,
                    timestamp: Date.now(),
                }
            ]
        })),

    updateLastMessage: (content: string) =>
        set((state) => {
            const newMessages = [...state.messages];
            if (newMessages.length > 0) {
                newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content,
                };
            }
            return { messages: newMessages };
        }),

    addCitationsToLastMessage: (citations: Citation[]) =>
        set((state) => {
            const newMessages = [...state.messages];
            // Find the last AI text message
            for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].type === 'text' && newMessages[i].content.startsWith('AI:')) {
                    newMessages[i] = {
                        ...newMessages[i],
                        citations,
                    };
                    break;
                }
            }
            return { messages: newMessages, currentCitations: citations };
        }),

    setJobId: (id: string | null )=> set({jobId: id}),
    setStreaming: (isStreaming: boolean)=> set({isStreaming}),
    setStreamingPhase: (phase: StreamingPhase) => set({ streamingPhase: phase }),
    setError: (error: string | null)=> set({error}),
    setPdfViewerOpen: (isOpen: boolean) => set({ isPdfViewerOpen: isOpen }),
    setCurrentCitations: (citations: Citation[]) => set({ currentCitations: citations }),
    reset: () => set({
        messages:[],
        jobId: null,
        isStreaming: false,
        streamingPhase: 'idle',
        error: null,
        currentCitations: []
    }),
}));