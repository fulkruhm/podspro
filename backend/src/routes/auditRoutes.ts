import { Router, Request, Response } from 'express';
import {
  createAuditLog,
  getAuditLogs,
  AuditLogCategory,
  AuditLogSeverity,
  getDigestDeliveryConfigByUserId,
  upsertDigestDeliveryConfig,
  getDigestDeliveryHistoryByUserId,
  getUserById,
} from '../db.js';
import { requireAnyRole, requireAuthenticatedUser, getIdentity } from '../middleware/authz.js';
import {
  validateRequestBody,
  validateRequestQuery,
  auditLogCreateBodySchema,
  auditLogQuerySchema,
  digestDeliveryConfigBodySchema,
  digestDeliverySendNowBodySchema,
  digestDeliveryHistoryQuerySchema,
} from '../middleware/validation.js';
import { computeNextDigestRunAt, executeDigestDelivery } from '../services/digestDeliveryService.js';

export const auditRouter = Router();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

auditRouter.get(
  '/logs',
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestQuery(auditLogQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const logs = await getAuditLogs({
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
        category: req.query.category as AuditLogCategory | undefined,
        severity: req.query.severity as AuditLogSeverity | undefined,
        userId: req.query.userId as string | undefined,
        region: req.query.region as string | undefined,
        store: req.query.store as string | undefined,
        department: req.query.department as string | undefined,
        productId: req.query.productId as string | undefined,
        from: req.query.from ? Number(req.query.from) : undefined,
        to: req.query.to ? Number(req.query.to) : undefined,
      });

      res.json({ logs });
    } catch (error: unknown) {
      console.error('Audit logs fetch failed:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

auditRouter.post(
  '/logs',
  requireAuthenticatedUser,
  validateRequestBody(auditLogCreateBodySchema),
  async (req: Request, res: Response) => {
    try {
      const identity = getIdentity(res);
      const created = await createAuditLog({
        userId: identity?.userId ?? null,
        userName: identity?.name ?? null,
        action: req.body.action,
        details: req.body.details,
        category: req.body.category,
        severity: req.body.severity,
        productId: req.body.productId,
        productName: req.body.productName,
        region: req.body.region,
        store: req.body.store,
        department: req.body.department,
      });

      res.status(201).json({ log: created });
    } catch (error: unknown) {
      console.error('Audit log create failed:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to create audit log' });
    }
  }
);

auditRouter.get(
  '/export',
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestQuery(auditLogQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const logs = await getAuditLogs({
        limit: req.query.limit ? Number(req.query.limit) : 1000,
        offset: req.query.offset ? Number(req.query.offset) : 0,
        category: req.query.category as AuditLogCategory | undefined,
        severity: req.query.severity as AuditLogSeverity | undefined,
        userId: req.query.userId as string | undefined,
        region: req.query.region as string | undefined,
        store: req.query.store as string | undefined,
        department: req.query.department as string | undefined,
        productId: req.query.productId as string | undefined,
        from: req.query.from ? Number(req.query.from) : undefined,
        to: req.query.to ? Number(req.query.to) : undefined,
      });

      const header =
        'id,timestamp,user_id,user_name,action,details,category,severity,product_id,product_name,region,store,department';
      const rows = logs.map((log) =>
        [
          log.id,
          String(log.timestamp),
          log.user_id ?? '',
          log.user_name ?? '',
          log.action,
          (log.details ?? '').replace(/"/g, '""'),
          log.category,
          log.severity,
          log.product_id ?? '',
          log.product_name ?? '',
          log.region ?? '',
          log.store ?? '',
          log.department ?? '',
        ]
          .map((value, index) => {
            const needsQuote =
              index === 5 ||
              String(value).includes(',') ||
              String(value).includes('"') ||
              String(value).includes('\n');
            if (!needsQuote) {
              return String(value);
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      );

      const csv = [header, ...rows].join('\n');
      const fileName = `pods-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(csv);
    } catch (error: unknown) {
      console.error('Audit logs export failed:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to export audit logs' });
    }
  }
);

auditRouter.get(
  '/digest-delivery',
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestQuery(digestDeliveryHistoryQuerySchema),
  async (_req: Request, res: Response) => {
    try {
      const identity = getIdentity(res);
      if (!identity) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [savedConfig, history, user] = await Promise.all([
        getDigestDeliveryConfigByUserId(identity.userId),
        getDigestDeliveryHistoryByUserId(identity.userId, Number(_req.query.limit) || 12),
        getUserById(identity.userId),
      ]);

      const config =
        savedConfig ||
        {
          id: null,
          user_id: identity.userId,
          enabled: false,
          frequency: 'daily',
          channel: 'in_app',
          recipient: user?.email || identity.username,
          filters: {},
          last_sent_at: null,
          next_run_at: null,
        };

      return res.json({ config, history });
    } catch (error: unknown) {
      console.error('Digest delivery settings fetch failed:', getErrorMessage(error));
      return res.status(500).json({ error: 'Failed to fetch digest delivery settings' });
    }
  }
);

auditRouter.put(
  '/digest-delivery',
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestBody(digestDeliveryConfigBodySchema),
  async (req: Request, res: Response) => {
    try {
      const identity = getIdentity(res);
      if (!identity) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const saved = await upsertDigestDeliveryConfig({
        userId: identity.userId,
        enabled: req.body.enabled,
        frequency: req.body.frequency,
        channel: req.body.channel,
        recipient: req.body.recipient,
        filters: req.body.filters || {},
        nextRunAt: req.body.enabled ? computeNextDigestRunAt(req.body.frequency) : null,
      });

      return res.json({ config: saved });
    } catch (error: unknown) {
      console.error('Digest delivery settings save failed:', getErrorMessage(error));
      return res.status(500).json({ error: 'Failed to save digest delivery settings' });
    }
  }
);

auditRouter.post(
  '/digest-delivery/send-now',
  requireAnyRole(['admin', 'sysadmin']),
  validateRequestBody(digestDeliverySendNowBodySchema),
  async (req: Request, res: Response) => {
    try {
      const identity = getIdentity(res);
      if (!identity) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await getUserById(identity.userId);
      const existing = await getDigestDeliveryConfigByUserId(identity.userId);

      const config =
        existing ||
        (await upsertDigestDeliveryConfig({
          userId: identity.userId,
          enabled: false,
          frequency: req.body.frequency || 'daily',
          channel: 'in_app',
          recipient: user?.email || identity.username,
          filters: {},
          nextRunAt: null,
        }));

      const effectiveConfig =
        req.body.frequency && req.body.frequency !== config.frequency
          ? { ...config, frequency: req.body.frequency }
          : config;

      const deliveryResult = await executeDigestDelivery(effectiveConfig, 'manual');

      if (deliveryResult.status === 'failed') {
        return res.status(502).json({
          error: 'Digest delivery failed',
          details: deliveryResult.error,
          summary: deliveryResult.summaryText,
        });
      }

      return res.json({
        status: deliveryResult.status,
        summary: deliveryResult.summaryText,
      });
    } catch (error: unknown) {
      console.error('Digest delivery send-now failed:', getErrorMessage(error));
      return res.status(500).json({ error: 'Failed to send digest now' });
    }
  }
);
