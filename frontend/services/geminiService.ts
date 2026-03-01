
// Frontend Gemini service - calls the backend API instead of Gemini directly
const API_BASE_URL = '/api';

// Chat session management
let currentSessionId: string | null = null;

export const startChat = async () => {
  try {
    console.log('[geminiService] Calling startChat from:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/chat/start`, {
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
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error sending message:', error);
    return 'I encountered an error processing your request.';
  }
};

export const fetchRealtimeData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/realtime-data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch realtime data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    return null;
  }
};

