// Frontend API service - calls the backend instead of Gemini directly
// Use relative paths to work with nginx proxy
const API_BASE_URL = '/api';

// Chat session management
const chatSessions: Map<string, string> = new Map();

export const startChat = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to start chat');
    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Error starting chat:', error);
    throw error;
  }
};

export const sendMessage = async (sessionId: string, message: string): Promise<string> => {
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

export const closeChat = async (sessionId: string) => {
  try {
    await fetch(`${API_BASE_URL}/chat/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch (error) {
    console.error('Error closing chat:', error);
  }
};
