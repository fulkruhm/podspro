import { Router, Request, Response } from 'express';
import { startChat, sendMessage, fetchRealtimeData } from '../services/geminiService.js';
import {
  validateRequestBody,
  chatMessageSchema,
  chatCloseSchema,
} from '../middleware/validation.js';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter.js';

export const chatRouter = Router();

// Store active chat sessions (in production, use a proper session store like Redis)
const chatSessions = new Map();

// Initialize a new chat session
chatRouter.post('/start', strictLimiter, (req: Request, res: Response) => {
  try {
    const sessionId = Date.now().toString();
    const chat = startChat();
    
    // Don't store sensitive chat objects directly
    chatSessions.set(sessionId, {
      createdAt: new Date(),
      isActive: true,
    });
    
    console.log(`[chatRouter] Chat session created: ${sessionId}`);
    res.json({ sessionId });
  } catch (error) {
    console.error('Error starting chat:', error);
    const message = error instanceof Error ? error.message : 'Failed to start chat session';
    res.status(500).json({ error: message });
  }
});

// Send message to chat - with validation and rate limiting
chatRouter.post(
  '/message',
  apiLimiter,
  validateRequestBody(chatMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body;

      // Validate session exists and is active
      const session = chatSessions.get(sessionId);
      if (!session || !session.isActive) {
        return res.status(404).json({ error: 'Chat session not found or expired' });
      }

      // Validate message content
      const chat = startChat();
      const response = await sendMessage(chat, message);
      
      res.json({ response });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// Fetch realtime data - with rate limiting
chatRouter.get('/realtime-data', apiLimiter, async (req: Request, res: Response) => {
  try {
    const data = await fetchRealtimeData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
});

// Close chat session - with validation and rate limiting
chatRouter.post(
  '/close',
  strictLimiter,
  validateRequestBody(chatCloseSchema),
  (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;

      if (!chatSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
      }

      chatSessions.delete(sessionId);
      res.json({ success: true, message: 'Chat session closed' });
    } catch (error) {
      console.error('Error closing chat:', error);
      res.status(500).json({ error: 'Failed to close chat' });
    }
  }
);

// Cleanup: Remove expired sessions every 30 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of chatSessions.entries()) {
    // Remove sessions older than 24 hours
    if (now.getTime() - session.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      chatSessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);
