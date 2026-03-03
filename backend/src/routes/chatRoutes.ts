import { Router, Request, Response } from 'express';
import { startChat, sendMessage, streamMessage, fetchRealtimeData, selectModelTier, type ChatLike, type ModelTier } from '../services/geminiService.js';
import {
  validateRequestBody,
  chatMessageSchema,
  chatCloseSchema,
} from '../middleware/validation.js';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter.js';

export const chatRouter = Router();

interface ChatSession {
  createdAt: Date;
  isActive: boolean;
  chat: ChatLike | null;
  modelTier: ModelTier;
  messageCount: number;
}

// Store active chat sessions (in production, use a proper session store like Redis)
const chatSessions = new Map<string, ChatSession>();

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('AI response timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
};

// Initialize a new chat session
chatRouter.post('/start', strictLimiter, (_req: Request, res: Response) => {
  try {
    const sessionId = Date.now().toString();
    
    chatSessions.set(sessionId, {
      createdAt: new Date(),
      isActive: true,
      chat: null,
      modelTier: 'fast',
      messageCount: 0,
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

      if (!session.chat) {
        session.modelTier = selectModelTier(message);
        session.chat = startChat(session.modelTier);
      }

      const timeoutMs = Number(
        process.env.AI_RESPONSE_TIMEOUT_MS || (session.modelTier === 'pro' ? '150000' : '90000')
      );
      let response = await withTimeout(sendMessage(session.chat, message), timeoutMs);

      if (response === 'ERROR_MODEL_UNAVAILABLE' || response === 'ERROR_API_KEY_REQUIRED') {
        session.modelTier = 'pro';
        session.chat = startChat('pro');
        response = await withTimeout(sendMessage(session.chat, message), timeoutMs);
      }

      if (response === 'ERROR_MODEL_UNAVAILABLE' || response === 'ERROR_API_KEY_REQUIRED') {
        response = 'AI advisor is currently unavailable due to model or API access configuration. Please verify GEMINI_API_KEY and model access.';
      }

      session.messageCount += 1;
      chatSessions.set(sessionId, session);
      
      res.json({ response });
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error && error.message === 'AI response timeout') {
        return res.status(504).json({ error: 'AI took too long to respond. Please try a shorter prompt.' });
      }
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

chatRouter.post(
  '/message-stream',
  apiLimiter,
  validateRequestBody(chatMessageSchema),
  async (req: Request, res: Response) => {
    const sendEvent = (event: string, data: Record<string, unknown>) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { sessionId, message } = req.body;

      const session = chatSessions.get(sessionId);
      if (!session || !session.isActive) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        sendEvent('error', { error: 'Chat session not found or expired' });
        return res.end();
      }

      if (!session.chat) {
        session.modelTier = selectModelTier(message);
        session.chat = startChat(session.modelTier);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const timeoutMs = Number(
        process.env.AI_RESPONSE_TIMEOUT_MS || (session.modelTier === 'pro' ? '150000' : '90000')
      );
      await withTimeout(
        streamMessage(session.chat, message, (chunk) => {
          sendEvent('chunk', { chunk });
        }),
        timeoutMs
      );

      session.messageCount += 1;
      chatSessions.set(sessionId, session);
      sendEvent('done', { ok: true });
      res.end();
    } catch (error) {
      console.error('Error streaming message:', error);
      if (error instanceof Error && error.message === 'AI response timeout') {
        sendEvent('error', { error: 'AI took too long to respond. Please try a shorter prompt.' });
      } else {
        sendEvent('error', { error: 'Failed to stream message' });
      }
      res.end();
    }
  }
);

// Fetch realtime data - with rate limiting
chatRouter.get('/realtime-data', apiLimiter, async (_req: Request, res: Response) => {
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
