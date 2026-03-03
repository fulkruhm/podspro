
// Frontend Gemini service - calls the backend API instead of Gemini directly
const API_BASE_URL = '/api';
const REQUEST_TIMEOUT_MS = 120000;

// Chat session management
let currentSessionId: string | null = null;

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const startChat = async () => {
  try {
    console.log('[geminiService] Calling startChat from:', API_BASE_URL);
    const response = await fetchWithTimeout(`${API_BASE_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to start chat: ${response.status}`);
    const data = await response.json();
    currentSessionId = data.sessionId;
    console.log('[geminiService] Chat session started:', currentSessionId);
    return currentSessionId;
  } catch (error) {
    console.error('Error starting chat:', error);
    throw error;
  }
};

export const sendMessage = async (sessionId: string | null, message: string): Promise<string> => {
  if (!sessionId) {
    return 'Chat session not initialized';
  }
  
  try {
    let response: Response | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetchWithTimeout(`${API_BASE_URL}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message }),
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 1) throw error;
      }
    }

    if (!response) throw lastError;
    if (!response.ok) throw new Error('Failed to send message');
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'The AI response took too long. Please try a shorter prompt.';
    }
    return 'I encountered an error processing your request.';
  }
};

export const sendMessageStream = async (
  sessionId: string | null,
  message: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (!sessionId) {
    onChunk('Chat session not initialized');
    return;
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/chat/message-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  }, 150000);

  if (!response.ok) {
    throw new Error('Failed to stream message');
  }

  if (!response.body) {
    const fullResponse = await sendMessage(sessionId, message);
    onChunk(fullResponse);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let streamDone = false;

  const processEvent = (eventBlock: string) => {
    const lines = eventBlock.split('\n').map(line => line.trim()).filter(Boolean);
    const eventLine = lines.find(line => line.startsWith('event:'));
    const dataLine = lines.find(line => line.startsWith('data:'));
    const event = eventLine ? eventLine.replace('event:', '').trim() : 'message';
    const dataPayload = dataLine ? dataLine.replace('data:', '').trim() : '{}';
    const parsed = JSON.parse(dataPayload) as { chunk?: string; error?: string; ok?: boolean };

    if (event === 'chunk' && parsed.chunk) {
      onChunk(parsed.chunk);
      return;
    }

    if (event === 'error') {
      throw new Error(parsed.error || 'Streaming failed');
    }

    if (event === 'done') {
      streamDone = true;
    }
  };

  while (!streamDone) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const eventBlock = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      if (eventBlock.trim()) processEvent(eventBlock);
      separatorIndex = buffer.indexOf('\n\n');
    }
  }
};

export const fetchRealtimeData = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/chat/realtime-data?_=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch realtime data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    return null;
  }
};

