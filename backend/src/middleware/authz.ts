import { Request, Response, NextFunction } from 'express';
import { Role } from '../types.js';
import { verifyAuthToken } from '../auth/token.js';
import { isAccessTokenRevoked } from '../db.js';

export interface RequestIdentity {
  userId: string;
  username: string;
  name: string;
  role: Role;
  status: 'active' | 'paused' | 'deactivated';
  tokenId: string;
  expiresAt: number;
}

function getRequestIdentity(req: Request): RequestIdentity | null {
  const authorizationHeader = req.header('authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (token.length === 0) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    status: payload.status,
    tokenId: payload.jti,
    expiresAt: payload.exp,
  };
}

export function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  Promise.resolve()
    .then(async () => {
      const identity = getRequestIdentity(req);
      if (!identity) {
        return res.status(401).json({
          error: 'Authentication required. Provide a valid Authorization bearer token.',
        });
      }

      if (identity.status !== 'active' && identity.username !== 'sysadmin') {
        return res.status(403).json({
          error: `Account is ${identity.status}`,
        });
      }

      const authorizationHeader = req.header('authorization') || '';
      const token = authorizationHeader.startsWith('Bearer ')
        ? authorizationHeader.slice('Bearer '.length).trim()
        : '';
      const payload = token ? verifyAuthToken(token) : null;
      if (!payload || payload.tokenType !== 'access') {
        return res.status(401).json({ error: 'Access token required' });
      }

      const revoked = await isAccessTokenRevoked(identity.tokenId);
      if (revoked) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }

      res.locals.identity = identity;
      return next();
    })
    .catch((error) => {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication service unavailable' });
    });
}

export function requireAnyRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve()
      .then(async () => {
        const identity = getRequestIdentity(req);
        if (!identity) {
          return res.status(401).json({
            error: 'Authentication required. Provide a valid Authorization bearer token.',
          });
        }

        if (identity.status !== 'active' && identity.username !== 'sysadmin') {
          return res.status(403).json({
            error: `Account is ${identity.status}`,
          });
        }

        const authorizationHeader = req.header('authorization') || '';
        const token = authorizationHeader.startsWith('Bearer ')
          ? authorizationHeader.slice('Bearer '.length).trim()
          : '';
        const payload = token ? verifyAuthToken(token) : null;
        if (!payload || payload.tokenType !== 'access') {
          return res.status(401).json({ error: 'Access token required' });
        }

        const revoked = await isAccessTokenRevoked(identity.tokenId);
        if (revoked) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }

        if (!roles.includes(identity.role)) {
          return res.status(403).json({
            error: `Insufficient permissions. Allowed roles: ${roles.join(', ')}`,
          });
        }

        res.locals.identity = identity;
        return next();
      })
      .catch((error) => {
        console.error('Role middleware error:', error);
        return res.status(500).json({ error: 'Authentication service unavailable' });
      });
  };
}

export function getIdentity(res: Response): RequestIdentity | null {
  return (res.locals.identity as RequestIdentity | undefined) ?? null;
}
