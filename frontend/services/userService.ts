// Frontend service for user management
import { authFetch } from './authSession';
import type { User } from '../types';

// Use relative paths to work with nginx proxy
const API_BASE_URL = '/api';

type UserApiRow = {
  id?: string;
  name?: string;
  username?: string;
  role?: User['role'];
  assigned_store?: string;
  assigned_region?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  status?: User['status'];
  failed_login_attempts?: number;
  is_locked?: boolean;
};

// Map database snake_case fields to frontend camelCase
function mapUserFromDB(dbUser: UserApiRow): User {
  return {
    id: dbUser.id || '',
    name: dbUser.name || '',
    username: dbUser.username || '',
    role: dbUser.role || 'store_user',
    assignedStore: dbUser.assigned_store,
    assignedRegion: dbUser.assigned_region,
    email: dbUser.email,
    phoneNumber: dbUser.phone_number,
    password: dbUser.password,
    status: dbUser.status || 'active',
    failedLoginAttempts: dbUser.failed_login_attempts,
    isLocked: dbUser.is_locked,
  };
}

export async function fetchUsers(): Promise<User[]> {
  try {
    const response = await authFetch(`${API_BASE_URL}/users`);
    if (!response.ok) {
      console.error('Failed to fetch users, status:', response.status);
      return [];
    }
    const data = await response.json();
    const mappedUsers = ((data.users || []) as UserApiRow[]).map(mapUserFromDB);
    console.log('[userService] Fetched users from API:', mappedUsers);
    return mappedUsers;
  } catch (error) {
    console.error('[userService] Error fetching users:', error);
    return [];
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.status}`);
    }
    const data = await response.json();
    return mapUserFromDB(data.user as UserApiRow);
  } catch (error) {
    console.error('[userService] Error updating user:', error);
    throw error;
  }
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  try {
    const response = await authFetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status}`);
    }
    const data = await response.json();
    return mapUserFromDB(data.user as UserApiRow);
  } catch (error) {
    console.error('[userService] Error creating user:', error);
    throw error;
  }
}

export async function deleteUser(userId: string) {
  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }
  } catch (error) {
    console.error('[userService] Error deleting user:', error);
    throw error;
  }
}
