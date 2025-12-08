const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SSECallbacks {
  onToolCall: (message: string) => void;
  onTextChunk: (text: string) => void;
  onCitation: (citation: any) => void;
  onComponent: (componentData: any) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export function connectSSE(jobId: string, callbacks: SSECallbacks): EventSource {
  const url = `${API_URL}/stream/${jobId}`;
  console.log('🔌 Connecting to SSE:', url);

  const eventSource = new EventSource(url);
  let hasEnded = false; // Track if stream ended normally

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📩 SSE message:', data);
    } catch {
      // Plain text message
    }
  };

  // Handle tool_call events
  eventSource.addEventListener('tool_call', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('🔧 Tool call:', event.data);
      callbacks.onToolCall(data.message || event.data);
    } catch {
      callbacks.onToolCall(event.data);
    }
  });

  // Handle text chunks
  eventSource.addEventListener('text', (event: MessageEvent) => {
    try {
      const text = JSON.parse(event.data);
      callbacks.onTextChunk(text);
    } catch {
      callbacks.onTextChunk(event.data);
    }
  });

  // Handle citations
  eventSource.addEventListener('citation', (event: MessageEvent) => {
    try {
      const citation = JSON.parse(event.data);
      console.log('📚 Citation:', event.data);
      callbacks.onCitation(citation);
    } catch {
      console.error('Failed to parse citation:', event.data);
    }
  });

  // Handle components
  eventSource.addEventListener('component', (event: MessageEvent) => {
    try {
      const component = JSON.parse(event.data);
      console.log('📊 Component:', event.data);
      callbacks.onComponent(component);
    } catch {
      console.error('Failed to parse component:', event.data);
    }
  });

  // Handle end event
  eventSource.addEventListener('end', () => {
    console.log('✅ Stream ended');
    hasEnded = true; // Mark as ended normally
    callbacks.onEnd();
    eventSource.close();
  });

  // Handle error event from server
  eventSource.addEventListener('error', (event: MessageEvent) => {
    // This is a server-sent error event (different from connection error)
    if (event.data) {
      console.error('❌ Server error:', event.data);
      callbacks.onError(event.data);
    }
  });

  // Handle connection errors
  eventSource.onerror = (error) => {
    // Only log error if stream hasn't ended normally
    if (!hasEnded) {
      console.error('❌ EventSource connection error:', error);
      callbacks.onError('Connection failed');
    } else {
      // Stream ended normally, connection close is expected
      console.log('🔌 SSE connection closed (normal)');
    }
    eventSource.close();
  };

  return eventSource;
}

export function disconnectSSE(eventSource: EventSource | null): void {
  if (eventSource) {
    console.log(' Disconnecting SSE');
    eventSource.close();
  }
}