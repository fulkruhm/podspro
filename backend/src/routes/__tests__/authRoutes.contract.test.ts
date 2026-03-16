import { AddressInfo } from 'net';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refreshTokenStore = new Map<string, any>();
const revokedAccessTokens = new Set<string>();

vi.mock('../../db.js', () => ({
  getUserByUsername: vi.fn(async (username: string) => {
    if (username !== 'admin') {
      return null;
    }

    return {
      id: 'u-admin',
      name: 'Admin User',
      username: 'admin',
      password: 'admin-pass',
      role: 'admin',
      assigned_store: null,
      assigned_region: null,
      email: 'admin@example.com',
      status: 'active',
      is_locked: false,
    };
  }),
  storeRefreshToken: vi.fn(async ({ tokenId, userId, username, expiresAtIso }: any) => {
    refreshTokenStore.set(tokenId, {
      token_id: tokenId,
      user_id: userId,
      username,
      expires_at: expiresAtIso,
      revoked_at: null,
      replaced_by_token_id: null,
    });
  }),
  getRefreshTokenRecord: vi.fn(async (tokenId: string) => {
    return refreshTokenStore.get(tokenId) ?? null;
  }),
  revokeRefreshToken: vi.fn(async (tokenId: string, replacedByTokenId?: string) => {
    const record = refreshTokenStore.get(tokenId);
    if (record) {
      record.revoked_at = new Date().toISOString();
      record.replaced_by_token_id = replacedByTokenId ?? null;
      refreshTokenStore.set(tokenId, record);
    }
  }),
  revokeAccessToken: vi.fn(async ({ tokenId }: any) => {
    revokedAccessTokens.add(tokenId);
  }),
  isAccessTokenRevoked: vi.fn(async (tokenId: string) => {
    return revokedAccessTokens.has(tokenId);
  }),
  cleanupExpiredAuthTokens: vi.fn(async () => {}),
}));

import { authRouter } from '../authRoutes.js';

describe('auth routes token contract', () => {
  let server: import('http').Server;
  let baseUrl = '';

  beforeEach(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    vi.clearAllMocks();
    refreshTokenStore.clear();
    revokedAccessTokens.clear();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('returns signed token on login success', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-pass' }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as any;
    expect(typeof payload.token).toBe('string');
    expect(payload.token.split('.')).toHaveLength(3);
    expect(typeof payload.refreshToken).toBe('string');
    expect(payload.refreshToken.split('.')).toHaveLength(3);
    expect(payload.user.username).toBe('admin');
  });

  it('rotates refresh token and returns new access token', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-pass' }),
    });
    const loginPayload = await loginResponse.json() as any;

    const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginPayload.refreshToken }),
    });

    expect(refreshResponse.status).toBe(200);
    const refreshPayload = await refreshResponse.json() as any;
    expect(typeof refreshPayload.token).toBe('string');
    expect(typeof refreshPayload.refreshToken).toBe('string');
    expect(refreshPayload.refreshToken).not.toBe(loginPayload.refreshToken);
  });

  it('invalidates access token on logout', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-pass' }),
    });
    const loginPayload = await loginResponse.json() as any;

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginPayload.token}`,
      },
      body: JSON.stringify({ refreshToken: loginPayload.refreshToken }),
    });
    expect(logoutResponse.status).toBe(200);

    const validateResponse = await fetch(`${baseUrl}/api/auth/validate`, {
      headers: {
        Authorization: `Bearer ${loginPayload.token}`,
      },
    });
    expect(validateResponse.status).toBe(401);
  });

  it('validates bearer token and returns identity', async () => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-pass' }),
    });
    const loginPayload = await login.json() as any;

    const validateResponse = await fetch(`${baseUrl}/api/auth/validate`, {
      headers: {
        Authorization: `Bearer ${loginPayload.token}`,
      },
    });

    expect(validateResponse.status).toBe(200);
    const validatePayload = await validateResponse.json() as any;
    expect(validatePayload.valid).toBe(true);
    expect(validatePayload.user.role).toBe('admin');
  });

  it('rejects token validation when authorization is missing', async () => {
    const response = await fetch(`${baseUrl}/api/auth/validate`);
    expect(response.status).toBe(401);
    const payload = await response.json() as any;
    expect(payload.error).toContain('Authentication required');
  });
});
