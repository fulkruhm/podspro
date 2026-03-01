import { Router, Request, Response } from 'express';
import { getAllUsers, getUserById, getUserByUsername, createUser, updateUser, deleteUser } from '../db.js';

export const userRouter = Router();

// Get all users
userRouter.get('/', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
userRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
userRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
userRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
userRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
