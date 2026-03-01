import { Router, Request, Response } from 'express';
import { startChat, sendMessage, fetchRealtimeData } from '../services/geminiService.js';

export const chatRouter = Router();

// Store active chat sessions (in production, use a proper session store)
const chatSessions = new Map();

// Initialize a new chat session
chatRouter.post('/start', (req: Request, res: Response) => {
  try {
    const sessionId = Date.now().toString();
    const chat = startChat();
    chatSessions.set(sessionId, chat);
    console.log(`[chatRouter] Chat session created: ${sessionId}`);
    res.json({ sessionId });
  } catch (error) {
    console.error('Error starting chat:', error);
    const message = error instanceof Error ? error.message : 'Failed to start chat session';
    res.status(500).json({ error: message });
  }
});

// Send message to chat
chatRouter.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    const chat = chatSessions.get(sessionId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const response = await sendMessage(chat, message);
    res.json({ response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Fetch realtime data
chatRouter.get('/realtime-data', async (req: Request, res: Response) => {
  try {
    const data = await fetchRealtimeData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
});

// Close chat session
chatRouter.post('/close', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    chatSessions.delete(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({ error: 'Failed to close chat' });
  }
});
