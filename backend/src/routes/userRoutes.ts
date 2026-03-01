import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getAllUsers, getUserById, getUserByUsername, createUser, updateUser, deleteUser } from '../db.js';
import {
  validateRequestBody,
  validateRequestParams,
  createUserSchema,
  updateUserSchema,
  uuidParamSchema,
} from '../middleware/validation.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

export const userRouter = Router();

// Get all users - no sensitive data
userRouter.get('/', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    // Filter out sensitive fields before sending to client
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      assignedStore: u.assigned_store,
      assignedRegion: u.assigned_region,
      email: u.email,
      status: u.status,
    }));
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID - no sensitive data
userRouter.get(
  '/:id',
  validateRequestParams(uuidParamSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Filter out sensitive fields
      const safeUser = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        assignedStore: user.assigned_store,
        assignedRegion: user.assigned_region,
        email: user.email,
        status: user.status,
      };
      res.json({ user: safeUser });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
);

// Create user - with validation and rate limiting
userRouter.post(
  '/',
  strictLimiter,
  validateRequestBody(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await createUser(req.body);
      // Don't send password or sensitive fields
      const { password, failed_login_attempts, is_locked, created_at, updated_at, ...safeUser } = user;
      res.status(201).json({ user: safeUser });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Update user - with validation and rate limiting
userRouter.put(
  '/:id',
  strictLimiter,
  validateRequestParams(z.object({ id: z.string().uuid() })),
  validateRequestBody(updateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Don't send password or sensitive fields
      const { password, failed_login_attempts, is_locked, created_at, updated_at, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Delete user - with rate limiting
userRouter.delete(
  '/:id',
  strictLimiter,
  validateRequestParams(uuidParamSchema),
  async (req: Request, res: Response) => {
    try {
      await deleteUser(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);
