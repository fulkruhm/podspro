import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getUserByUsername,
  storeRefreshToken,
  getRefreshTokenRecord,
  revokeRefreshToken,
  revokeAccessToken,
  cleanupExpiredAuthTokens,
  createAuditLog,
} from '../db.js';
import {
  validateRequestBody,
  authRefreshSchema,
  authLogoutSchema,
} from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { signAuthToken, signRefreshToken, verifyAuthToken } from '../auth/token.js';
import { requireAuthenticatedUser, getIdentity } from '../middleware/authz.js';

export const authRouter = Router();

async function writeAuditSafely(input: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  details?: string;
  category: 'auth' | 'security' | 'system' | 'provisioning';
  severity: 'info' | 'warning' | 'critical';
}) {
  try {
    await createAuditLog(input);
  } catch (error) {
    console.error('Auth audit write failed:', error);
  }
}

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
        await writeAuditSafely({
          userId: null,
          userName: username,
          action: 'LOGIN_FAILURE',
          details: `Login failed for @${username}: user not found`,
          category: 'auth',
          severity: 'warning',
        });
        return res.status(401).json({ error: 'ERR_AUTH: System handle not found' });
      }

      // Simple password comparison (in production, use bcrypt hashing)
      if (user.password !== password) {
        await writeAuditSafely({
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_FAILURE',
          details: `Login failed for @${user.username}: invalid credentials`,
          category: 'auth',
          severity: 'warning',
        });
        return res.status(401).json({ error: 'ERR_AUTH: Invalid credentials' });
      }

      // Check if account is locked
      if (user.is_locked) {
        await writeAuditSafely({
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_FAILURE',
          details: `Login blocked for @${user.username}: account locked`,
          category: 'security',
          severity: 'critical',
        });
        return res.status(403).json({
          error: 'ERR_AUTH: Account locked due to too many failed attempts',
        });
      }

      // Check if account is active
      if (user.status !== 'active' && user.username !== 'sysadmin') {
        await writeAuditSafely({
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_FAILURE',
          details: `Login blocked for @${user.username}: account is ${user.status}`,
          category: 'auth',
          severity: 'warning',
        });
        return res.status(403).json({
          error: `ERR_AUTH: Account is ${user.status}`,
        });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      const { token, expiresInSeconds, tokenId } = signAuthToken({
        sub: userWithoutPassword.id,
        username: userWithoutPassword.username,
        role: userWithoutPassword.role,
        name: userWithoutPassword.name,
        status: userWithoutPassword.status,
      });
      const refreshTokenResult = signRefreshToken({
        sub: userWithoutPassword.id,
        username: userWithoutPassword.username,
        role: userWithoutPassword.role,
        name: userWithoutPassword.name,
        status: userWithoutPassword.status,
      });

      await cleanupExpiredAuthTokens();
      await storeRefreshToken({
        tokenId: refreshTokenResult.tokenId,
        userId: userWithoutPassword.id,
        username: userWithoutPassword.username,
        expiresAtIso: new Date(
          (Math.floor(Date.now() / 1000) + refreshTokenResult.expiresInSeconds) * 1000
        ).toISOString(),
      });

      await writeAuditSafely({
        userId: userWithoutPassword.id,
        userName: userWithoutPassword.name,
        action: 'LOGIN_SUCCESS',
        details: `Successful login for @${userWithoutPassword.username}`,
        category: 'auth',
        severity: 'info',
      });

      res.json({
        token,
        refreshToken: refreshTokenResult.token,
        expiresInSeconds,
        tokenId,
        user: {
          id: userWithoutPassword.id,
          name: userWithoutPassword.name,
          username: userWithoutPassword.username,
          role: userWithoutPassword.role,
          assignedStore: userWithoutPassword.assigned_store,
          assignedRegion: userWithoutPassword.assigned_region,
          email: userWithoutPassword.email,
          status: userWithoutPassword.status,
        },
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'ERR_AUTH: Authentication service unavailable' });
    }
  }
);

authRouter.post(
  '/refresh',
  authLimiter,
  validateRequestBody(authRefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const payload = verifyAuthToken(refreshToken);
      if (!payload || payload.tokenType !== 'refresh') {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const record = await getRefreshTokenRecord(payload.jti);
      if (!record) {
        return res.status(401).json({ error: 'Refresh token not recognized' });
      }

      if (record.revoked_at) {
        return res.status(401).json({ error: 'Refresh token revoked' });
      }

      if (new Date(record.expires_at).getTime() <= Date.now()) {
        await revokeRefreshToken(payload.jti);
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      const nextAccess = signAuthToken({
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        name: payload.name,
        status: payload.status,
      });
      const nextRefresh = signRefreshToken({
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        name: payload.name,
        status: payload.status,
      });

      await revokeRefreshToken(payload.jti, nextRefresh.tokenId);
      await storeRefreshToken({
        tokenId: nextRefresh.tokenId,
        userId: payload.sub,
        username: payload.username,
        expiresAtIso: new Date(
          (Math.floor(Date.now() / 1000) + nextRefresh.expiresInSeconds) * 1000
        ).toISOString(),
      });

      return res.json({
        token: nextAccess.token,
        refreshToken: nextRefresh.token,
        expiresInSeconds: nextAccess.expiresInSeconds,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({ error: 'Failed to refresh session' });
    }
  }
);

authRouter.post(
  '/logout',
  requireAuthenticatedUser,
  validateRequestBody(authLogoutSchema),
  async (req: Request, res: Response) => {
    try {
      const identity = getIdentity(res);
      if (!identity) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      await revokeAccessToken({
        tokenId: identity.tokenId,
        userId: identity.userId,
        expiresAtIso: new Date(identity.expiresAt * 1000).toISOString(),
      });

      const providedRefreshToken = req.body?.refreshToken;
      if (providedRefreshToken) {
        const payload = verifyAuthToken(providedRefreshToken);
        if (payload && payload.tokenType === 'refresh') {
          await revokeRefreshToken(payload.jti);
        }
      }

      await writeAuditSafely({
        userId: identity.userId,
        userName: identity.name,
        action: 'LOGOUT',
        details: `Logout for @${identity.username}`,
        category: 'auth',
        severity: 'info',
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Failed to logout' });
    }
  }
);

authRouter.get('/validate', requireAuthenticatedUser, (req: Request, res: Response) => {
  const identity = getIdentity(res);
  if (!identity) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  return res.json({
    valid: true,
    user: {
      id: identity.userId,
      username: identity.username,
      name: identity.name,
      role: identity.role,
      status: identity.status,
    },
  });
});
