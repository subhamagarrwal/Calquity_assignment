import {create} from "zustand";

export type ChatMessageType = 'text' | 'tool_call' | 'citation' | 'component';

export interface ChatMessage {
    id:string;
    type: ChatMessageType;
    content: string; 
    timestamp: number;
    metadata?: Record<string, any>;
}

interface ChatStore {
    messages: ChatMessage[];
    jobId: string | null;
    isStreaming: boolean;
    error: string | null;

    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    setJobId: (jobId: string | null) => void;
    setStreaming: (isStreaming: boolean) => void;
    setError: (error: string | null) => void;
    reset: ()=> void;
}

export const useChatStore = create<ChatStore>((set)=>({
    messages: [],
    jobId: null,
    isStreaming: false,
    error: null,

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

    setJobId: (id: string | null )=> set({jobId: id}),
    setStreaming: (isStreaming: boolean)=> set({isStreaming}),
    setError: (error: string | null)=> set({error}),
    reset: () => set({
        messages:[],
        jobId: null,
        isStreaming: false,
        error: null
    }),
}));