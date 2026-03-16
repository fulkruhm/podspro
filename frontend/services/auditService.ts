import { authFetch } from './authSession';
import { appConfig } from '../config/appConfig';
import { AuditLog } from '../types';

interface FetchAuditLogsOptions {
  limit?: number;
  offset?: number;
  category?: AuditLog['category'];
  severity?: AuditLog['severity'];
  userId?: string;
  region?: string;
  store?: string;
  department?: string;
  productId?: string;
  from?: number;
  to?: number;
}

interface AuditLogApiRow {
  id: string;
  timestamp: number | string;
  user_id?: string;
  user_name?: string;
  action: string;
  details?: string;
  category: AuditLog['category'];
  severity: AuditLog['severity'];
  product_id?: string;
  product_name?: string;
  region?: string;
  store?: string;
  department?: string;
}

function toQueryString(options: FetchAuditLogsOptions = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  if (options.category) params.set('category', options.category);
  if (options.severity) params.set('severity', options.severity);
  if (options.userId) params.set('userId', options.userId);
  if (options.region) params.set('region', options.region);
  if (options.store) params.set('store', options.store);
  if (options.department) params.set('department', options.department);
  if (options.productId) params.set('productId', options.productId);
  if (options.from !== undefined) params.set('from', String(options.from));
  if (options.to !== undefined) params.set('to', String(options.to));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapAuditLog(raw: AuditLogApiRow): AuditLog {
  return {
    id: raw.id,
    timestamp: Number(raw.timestamp),
    userId: raw.user_id || '',
    userName: raw.user_name || 'unknown',
    action: raw.action,
    details: raw.details || '',
    category: raw.category,
    severity: raw.severity,
    productId: raw.product_id || undefined,
    productName: raw.product_name || undefined,
    region: raw.region || undefined,
    store: raw.store || undefined,
    department: raw.department || undefined,
  };
}

export async function fetchAuditLogs(options: FetchAuditLogsOptions = {}): Promise<AuditLog[]> {
  const response = await authFetch(`${appConfig.apiBaseUrl}/audit/logs${toQueryString(options)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.status}`);
  }
  const data = await response.json();
  return ((data.logs || []) as AuditLogApiRow[]).map(mapAuditLog);
}

export async function createAuditLogEvent(input: {
  action: string;
  details?: string;
  category: AuditLog['category'];
  severity: AuditLog['severity'];
  productId?: string;
  productName?: string;
  region?: string;
  store?: string;
  department?: string;
}): Promise<AuditLog> {
  const response = await authFetch(`${appConfig.apiBaseUrl}/audit/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create audit log: ${response.status}`);
  }

  const data = await response.json();
  return mapAuditLog(data.log as AuditLogApiRow);
}

export async function exportAuditLogsCsv(options: FetchAuditLogsOptions = {}) {
  const response = await authFetch(`${appConfig.apiBaseUrl}/audit/export${toQueryString(options)}`);
  if (!response.ok) {
    throw new Error(`Failed to export audit logs: ${response.status}`);
  }

  const blob = await response.blob();
  const fileName = `pods-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
