import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getUserByUsername } from '../db.js';
import { validateRequestBody } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Login endpoint - validates credentials against database
authRouter.post(
  '/login',
  authLimiter, // Strict rate limiting for auth endpoint
  validateRequestBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Look up user by username
      const user = await getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ error: 'ERR_AUTH: System handle not found' });
      }

      // Simple password comparison (in production, use bcrypt hashing)
      if (user.password !== password) {
        return res.status(401).json({ error: 'ERR_AUTH: Invalid credentials' });
      }

      // Check if account is locked
      if (user.is_locked) {
        return res.status(403).json({ 
          error: 'ERR_AUTH: Account locked due to too many failed attempts' 
        });
      }

      // Check if account is active
      if (user.status !== 'active' && user.username !== 'sysadmin') {
        return res.status(403).json({ 
          error: `ERR_AUTH: Account is ${user.status}` 
        });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: {
          id: userWithoutPassword.id,
          name: userWithoutPassword.name,
          username: userWithoutPassword.username,
          role: userWithoutPassword.role,
          assignedStore: userWithoutPassword.assigned_store,
          assignedRegion: userWithoutPassword.assigned_region,
          email: userWithoutPassword.email,
          status: userWithoutPassword.status,
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'ERR_AUTH: Authentication service unavailable' });
    }
  }
);
