import { Router, Request, Response } from 'express';
import { createAuditLog, getAuditLogs, AuditLogCategory, AuditLogSeverity } from '../db.js';
import { requireAnyRole, getIdentity } from '../middleware/authz.js';
import {
  validateRequestBody,
  validateRequestQuery,
  auditLogCreateBodySchema,
  auditLogQuerySchema,
} from '../middleware/validation.js';

export const auditRouter = Router();

auditRouter.use(requireAnyRole(['admin', 'sysadmin']));

auditRouter.get('/logs', validateRequestQuery(auditLogQuerySchema), async (req: Request, res: Response) => {
  try {
    const logs = await getAuditLogs({
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      category: req.query.category as AuditLogCategory | undefined,
      severity: req.query.severity as AuditLogSeverity | undefined,
      userId: req.query.userId as string | undefined,
    });

    res.json({ logs });
  } catch (error: any) {
    console.error('Audit logs fetch failed:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

auditRouter.post('/logs', validateRequestBody(auditLogCreateBodySchema), async (req: Request, res: Response) => {
  try {
    const identity = getIdentity(res);
    const created = await createAuditLog({
      userId: identity?.userId ?? null,
      userName: identity?.name ?? null,
      action: req.body.action,
      details: req.body.details,
      category: req.body.category,
      severity: req.body.severity,
    });

    res.status(201).json({ log: created });
  } catch (error: any) {
    console.error('Audit log create failed:', error?.message || error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

auditRouter.get('/export', validateRequestQuery(auditLogQuerySchema), async (req: Request, res: Response) => {
  try {
    const logs = await getAuditLogs({
      limit: req.query.limit ? Number(req.query.limit) : 1000,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      category: req.query.category as AuditLogCategory | undefined,
      severity: req.query.severity as AuditLogSeverity | undefined,
      userId: req.query.userId as string | undefined,
    });

    const header = 'id,timestamp,user_id,user_name,action,details,category,severity';
    const rows = logs.map((log) => [
      log.id,
      String(log.timestamp),
      log.user_id ?? '',
      log.user_name ?? '',
      log.action,
      (log.details ?? '').replace(/\"/g, '""'),
      log.category,
      log.severity,
    ].map((value, index) => {
      const needsQuote = index === 5 || String(value).includes(',') || String(value).includes('"') || String(value).includes('\n');
      if (!needsQuote) {
        return String(value);
      }
      return `"${String(value).replace(/\"/g, '""')}"`;
    }).join(','));

    const csv = [header, ...rows].join('\n');
    const fileName = `pods-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error('Audit logs export failed:', error?.message || error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});
