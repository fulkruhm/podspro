import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { Role } from '../types.js';
import { loadAppConfig } from '../config/env.js';

const appConfig = loadAppConfig();

interface AuthTokenHeader {
  alg: 'HS256';
  typ: 'PODSJWT';
}

export interface AuthTokenPayload {
  jti: string;
  tokenType: 'access' | 'refresh';
  sub: string;
  username: string;
  role: Role;
  name: string;
  status: 'active' | 'paused' | 'deactivated';
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getAuthSecret() {
  return appConfig.authSecret;
}

function getTokenTtlSeconds() {
  return Math.floor(appConfig.authTokenTtlMinutes * 60);
}

function getRefreshTokenTtlSeconds() {
  return Math.floor(appConfig.refreshTokenTtlMinutes * 60);
}

function signContent(content: string, secret: string) {
  return base64UrlEncode(createHmac('sha256', secret).update(content).digest());
}

function signToken(
  input: Omit<AuthTokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'>,
  tokenType: 'access' | 'refresh',
  expiresInSeconds: number
): { token: string; expiresInSeconds: number; tokenId: string } {
  const header: AuthTokenHeader = {
    alg: 'HS256',
    typ: 'PODSJWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenId = randomUUID();
  const payload: AuthTokenPayload = {
    ...input,
    jti: tokenId,
    tokenType,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signContent(signingInput, getAuthSecret());

  return {
    token: `${signingInput}.${signature}`,
    expiresInSeconds,
    tokenId,
  };
}

export function signAuthToken(input: Omit<AuthTokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'>) {
  return signToken(input, 'access', getTokenTtlSeconds());
}

export function signRefreshToken(input: Omit<AuthTokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'>) {
  return signToken(input, 'refresh', getRefreshTokenTtlSeconds());
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = segments;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signContent(signingInput, getAuthSecret());

  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (givenBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(givenBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader)) as AuthTokenHeader;
    if (header.alg !== 'HS256' || header.typ !== 'PODSJWT') {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    if (!payload.sub || !payload.username || !payload.role || !payload.exp || !payload.jti || !payload.tokenType) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
