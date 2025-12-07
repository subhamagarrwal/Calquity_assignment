export interface SSECallbacks {
  onToolCall: (message: string) => void;
  onTextChunk: (text: string) => void;
  onCitation: (citation: { source: string; page: number }) => void;
  onComponent: (componentData: string) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export function connectSSE(
  jobId: string,
  callbacks: SSECallbacks
): EventSource {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${API_URL}/stream/${jobId}`;

  console.log('🔌 Connecting to SSE:', url);
  
  const eventSource = new EventSource(url);

  // Default message handler (for unnamed events and 'data')
  eventSource.onmessage = (event) => {
    console.log('📨 SSE message:', event.data);
    
    try {
      const data = JSON.parse(event.data);
      
      // Handle text chunks
      if (data.text) {
        callbacks.onTextChunk(data.text);
      }
    } catch (error) {
      console.error('Failed to parse SSE data:', error);
    }
  };

  // Tool call events
  eventSource.addEventListener('tool_call', (event: any) => {
    console.log('🔧 Tool call:', event.data);
    try {
      const data = JSON.parse(event.data);
      callbacks.onToolCall(data.message);
    } catch (error) {
      console.error('Failed to parse tool_call:', error);
    }
  });

  // Citation events
  eventSource.addEventListener('citation', (event: any) => {
    console.log('📚 Citation:', event.data);
    try {
      const data = JSON.parse(event.data);
      callbacks.onCitation(data);
    } catch (error) {
      console.error('Failed to parse citation:', error);
    }
  });

  // Component events
  eventSource.addEventListener('component', (event: any) => {
    console.log('📊 Component:', event.data);
    try {
      const data = event.data;
      callbacks.onComponent(data);
    } catch (error) {
      console.error('Failed to parse component:', error);
    }
  });

  // End event
  eventSource.addEventListener('end', (event: any) => {
    console.log('✅ Stream ended');
    callbacks.onEnd();
  });

  // Error events
  eventSource.addEventListener('error', (event: any) => {
    console.log('❌ SSE error:', event);
    try {
      const data = JSON.parse(event.data);
      callbacks.onError(data.message);
    } catch (error) {
      callbacks.onError('Connection error');
    }
  });

  eventSource.onerror = (error) => {
    console.error('❌ EventSource error:', error);
    callbacks.onError('Connection failed');
  };

  return eventSource;
}

export function disconnectSSE(eventSource: EventSource) {
  console.log('🔌 Disconnecting SSE');
  eventSource.close();
}