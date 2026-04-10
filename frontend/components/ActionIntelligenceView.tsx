import React, { useEffect, useMemo, useState } from 'react';
import { AuditLog, Product, User } from '../types';
import {
  exportAuditLogsCsv,
  fetchAuditLogs,
  fetchDigestDeliverySettings,
  saveDigestDeliverySettings,
  sendDigestNow,
  DigestDeliveryConfig,
  DigestDeliveryHistoryItem,
} from '../services/auditService';

interface ActionIntelligenceViewProps {
  onClose: () => void;
  products: Product[];
  users: User[];
}

const ActionIntelligenceView: React.FC<ActionIntelligenceViewProps> = ({
  onClose,
  products,
  users,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userFilter, setUserFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditLog['severity']>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [searchText, setSearchText] = useState('');
  const [digestWindow, setDigestWindow] = useState<'daily' | 'weekly'>('daily');
  const [quickActionApplied, setQuickActionApplied] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);

  const [deliveryConfig, setDeliveryConfig] = useState<DigestDeliveryConfig>({
    id: null,
    enabled: false,
    frequency: 'daily',
    channel: 'in_app',
    recipient: 'ops-team',
    filters: {},
    lastSentAt: null,
    nextRunAt: null,
  });

  const [deliveryHistory, setDeliveryHistory] = useState<DigestDeliveryHistoryItem[]>([]);

  const regionOptions = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.region))).sort()],
    [products]
  );
  const storeOptions = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.store))).sort()],
    [products]
  );
  const departmentOptions = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.department))).sort()],
    [products]
  );

  const productOptions = useMemo(
    () =>
      products
        .map((product) => ({ id: product.id, label: `${product.name} (${product.store})` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [products]
  );

  const userOptions = useMemo(() => {
    const knownUsers = users.map((user) => ({
      id: user.id,
      label: `${user.name} (@${user.username})`,
    }));
    const fallbackUsers = logs
      .filter((log) => log.userId)
      .map((log) => ({ id: log.userId, label: `${log.userName} (${log.userId})` }));

    const merged = [...knownUsers, ...fallbackUsers];
    const deduped = new Map<string, string>();
    for (const entry of merged) {
      if (!deduped.has(entry.id)) {
        deduped.set(entry.id, entry.label);
      }
    }

    return Array.from(deduped.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, logs]);

  useEffect(() => {
    let cancelled = false;

    const loadAuditLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const from = fromDate ? new Date(`${fromDate}T00:00:00.000`).getTime() : undefined;
        const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : undefined;

        const data = await fetchAuditLogs({
          limit: 1000,
          userId: userFilter === 'all' ? undefined : userFilter,
          region: regionFilter === 'all' ? undefined : regionFilter,
          store: storeFilter === 'all' ? undefined : storeFilter,
          department: departmentFilter === 'all' ? undefined : departmentFilter,
          productId: productFilter === 'all' ? undefined : productFilter,
          severity: severityFilter === 'all' ? undefined : severityFilter,
          from,
          to,
        });

        if (!cancelled) {
          setLogs(data);
        }
      } catch (loadError) {
        console.error('Failed to load user action logs:', loadError);
        if (!cancelled) {
          setError('Failed to load user action logs.');
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [
    userFilter,
    regionFilter,
    storeFilter,
    departmentFilter,
    productFilter,
    severityFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadDeliverySettings = async () => {
      try {
        const data = await fetchDigestDeliverySettings(12);
        if (cancelled) {
          return;
        }
        setDeliveryConfig(data.config);
        setDeliveryHistory(data.history);
        setDigestWindow(data.config.frequency);
      } catch (loadError) {
        console.error('Failed to load digest delivery settings:', loadError);
        if (!cancelled) {
          setDeliveryNotice('Digest delivery settings unavailable right now.');
        }
      }
    };

    void loadDeliverySettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLogs = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return logs;
    }

    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        (log.userName || '').toLowerCase().includes(query) ||
        (log.productName || '').toLowerCase().includes(query)
      );
    });
  }, [logs, searchText]);

  const summary = useMemo(() => {
    return {
      total: visibleLogs.length,
      uniqueUsers: new Set(visibleLogs.map((log) => log.userId).filter(Boolean)).size,
      productLinked: visibleLogs.filter((log) => log.productId).length,
      criticalOrWarning: visibleLogs.filter(
        (log) => log.severity === 'critical' || log.severity === 'warning'
      ).length,
    };
  }, [visibleLogs]);

  const insightCards = useMemo(() => {
    const decisionLogs = visibleLogs.filter(
      (log) => log.action === 'FORECAST_REVIEW_DECISION' || log.action === 'PRODUCT_UPDATE'
    );

    const topUserCounter = new Map<string, { label: string; count: number }>();
    for (const log of decisionLogs) {
      const key = log.userId || 'unknown';
      const label = log.userName || 'unknown';
      const current = topUserCounter.get(key);
      if (current) {
        current.count += 1;
      } else {
        topUserCounter.set(key, { label, count: 1 });
      }
    }

    const topUser = Array.from(topUserCounter.values()).sort((a, b) => b.count - a.count)[0];

    const incidentLogs = visibleLogs.filter(
      (log) => log.severity === 'warning' || log.severity === 'critical'
    );

    const hotspotStoreCounter = new Map<string, number>();
    for (const log of incidentLogs) {
      if (!log.store) continue;
      hotspotStoreCounter.set(log.store, (hotspotStoreCounter.get(log.store) || 0) + 1);
    }
    const topStoreEntry = Array.from(hotspotStoreCounter.entries()).sort((a, b) => b[1] - a[1])[0];

    const productCounter = new Map<string, { label: string; count: number }>();
    for (const log of incidentLogs) {
      const key = log.productId || log.productName || '';
      if (!key) continue;
      const label = log.productName || log.productId || 'Unknown SKU';
      const current = productCounter.get(key);
      if (current) {
        current.count += 1;
      } else {
        productCounter.set(key, { label, count: 1 });
      }
    }
    const topProduct = Array.from(productCounter.values()).sort((a, b) => b.count - a.count)[0];

    const repeatPatternCounter = new Map<
      string,
      { action: string; store: string; product: string; count: number; latest: number }
    >();
    for (const log of incidentLogs) {
      const action = log.action || 'UNKNOWN_ACTION';
      const store = log.store || 'unknown store';
      const product = log.productName || log.productId || 'unknown product';
      const key = `${action}::${store}::${product}`;
      const current = repeatPatternCounter.get(key);
      if (current) {
        current.count += 1;
        current.latest = Math.max(current.latest, log.timestamp);
      } else {
        repeatPatternCounter.set(key, {
          action,
          store,
          product,
          count: 1,
          latest: log.timestamp,
        });
      }
    }

    const repeatPattern = Array.from(repeatPatternCounter.values())
      .filter((entry) => entry.count >= 3)
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.latest - a.latest;
      })[0];

    return {
      topUser,
      topStoreEntry,
      topProduct,
      repeatPattern,
    };
  }, [visibleLogs]);

  const digestSummary = useMemo(() => {
    const windowMs = digestWindow === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const currentStart = now - windowMs;
    const previousStart = currentStart - windowMs;

    const currentLogs = visibleLogs.filter((log) => log.timestamp >= currentStart && log.timestamp <= now);
    const previousLogs = visibleLogs.filter(
      (log) => log.timestamp >= previousStart && log.timestamp < currentStart
    );

    const currentWarnings = currentLogs.filter(
      (log) => log.severity === 'warning' || log.severity === 'critical'
    ).length;
    const previousWarnings = previousLogs.filter(
      (log) => log.severity === 'warning' || log.severity === 'critical'
    ).length;

    const currentCritical = currentLogs.filter((log) => log.severity === 'critical').length;
    const previousCritical = previousLogs.filter((log) => log.severity === 'critical').length;

    const actionCounter = new Map<string, number>();
    for (const log of currentLogs) {
      actionCounter.set(log.action, (actionCounter.get(log.action) || 0) + 1);
    }
    const topActions = Array.from(actionCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const storeCounter = new Map<string, number>();
    for (const log of currentLogs) {
      const key = log.store || 'unknown';
      storeCounter.set(key, (storeCounter.get(key) || 0) + 1);
    }
    const topStore = Array.from(storeCounter.entries()).sort((a, b) => b[1] - a[1])[0];

    const userCounter = new Map<string, number>();
    for (const log of currentLogs) {
      const key = log.userName || 'unknown';
      userCounter.set(key, (userCounter.get(key) || 0) + 1);
    }
    const topUser = Array.from(userCounter.entries()).sort((a, b) => b[1] - a[1])[0];

    const safeChangePct = (current: number, previous: number) => {
      if (previous <= 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const actionChangePct = safeChangePct(currentLogs.length, previousLogs.length);
    const warningChangePct = safeChangePct(currentWarnings, previousWarnings);
    const criticalChangePct = safeChangePct(currentCritical, previousCritical);

    const direction = (value: number) => (value > 0 ? 'up' : value < 0 ? 'down' : 'flat');

    const bullets = [
      `${digestWindow === 'daily' ? 'Past 24h' : 'Past 7d'} volume is ${currentLogs.length.toLocaleString()} actions (${direction(actionChangePct)} ${Math.abs(actionChangePct)}% vs previous window).`,
      `Warnings/critical are ${currentWarnings.toLocaleString()} (${direction(warningChangePct)} ${Math.abs(warningChangePct)}%), with critical at ${currentCritical.toLocaleString()} (${direction(criticalChangePct)} ${Math.abs(criticalChangePct)}%).`,
      topStore
        ? `Highest activity location is ${topStore[0]} with ${topStore[1].toLocaleString()} actions in this window.`
        : 'No store-linked activity in this window.',
      topUser
        ? `Most active user is ${topUser[0]} with ${topUser[1].toLocaleString()} actions in this window.`
        : 'No user activity in this window.',
    ];

    return {
      currentLogsCount: currentLogs.length,
      previousLogsCount: previousLogs.length,
      currentWarnings,
      currentCritical,
      topActions,
      topStore,
      bullets,
    };
  }, [visibleLogs, digestWindow]);

  const sendDigestNowAction = async () => {
    if (isSendingDigest) {
      return;
    }

    setIsSendingDigest(true);
    try {
      const result = await sendDigestNow({ frequency: deliveryConfig.frequency });
      const refreshed = await fetchDigestDeliverySettings(12);
      setDeliveryConfig(refreshed.config);
      setDeliveryHistory(refreshed.history);
      setDeliveryNotice(`Digest sent: ${result.summary}`);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send digest.';
      setDeliveryNotice(message);
    } finally {
      setIsSendingDigest(false);
    }
  };

  const isQuickActionStateActive =
    quickActionApplied &&
    (severityFilter === 'critical' || storeFilter !== 'all' || searchText.trim().length > 0);

  const formatNextRun = (nextRunAt: number | null) => {
    if (!nextRunAt) {
      return 'Not scheduled';
    }
    return new Date(nextRunAt).toLocaleString();
  };

  const buildDeliveryFiltersPayload = () => ({
    userId: userFilter === 'all' ? undefined : userFilter,
    region: regionFilter === 'all' ? undefined : regionFilter,
    store: storeFilter === 'all' ? undefined : storeFilter,
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    productId: productFilter === 'all' ? undefined : productFilter,
    severity: severityFilter === 'all' ? undefined : severityFilter,
    searchText: searchText.trim() || undefined,
  });

  const handleExport = () => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00.000`).getTime() : undefined;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : undefined;

    void exportAuditLogsCsv({
      limit: 1000,
      userId: userFilter === 'all' ? undefined : userFilter,
      region: regionFilter === 'all' ? undefined : regionFilter,
      store: storeFilter === 'all' ? undefined : storeFilter,
      department: departmentFilter === 'all' ? undefined : departmentFilter,
      productId: productFilter === 'all' ? undefined : productFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      from,
      to,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-12 md:pr-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900">User Action Intelligence</h2>
          <p className="text-sm text-slate-500 font-medium">
            Complete cross-user action trail for admin and sysadmin analysis.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none bg-blue-100 text-blue-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition"
          >
            Export Filtered CSV
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors hidden md:block"
            title="Back to Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Actions
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Unique Users
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.uniqueUsers}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Product Linked
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.productLinked}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Warn/Critical
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.criticalOrWarning}</div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border-2 border-slate-300 p-5 md:p-6 text-slate-900 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase tracking-widest text-slate-900">
              Insight Spotlight
            </h3>
            <p className="text-sm text-slate-700 mt-1 font-medium">
              High-signal patterns from the currently filtered action trail.
            </p>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-800">
            Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Top Decision Owner
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-2 leading-tight">
              {insightCards.topUser?.label || 'No decision events'}
            </div>
            <div className="text-sm text-slate-700 mt-1 font-medium">
              {(insightCards.topUser?.count || 0).toLocaleString()} forecast or product decisions
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Store Hotspot
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-2 leading-tight">
              {insightCards.topStoreEntry?.[0] || 'No incidents'}
            </div>
            <div className="text-sm text-slate-700 mt-1 font-medium">
              {(insightCards.topStoreEntry?.[1] || 0).toLocaleString()} warning/critical events
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              SKU Under Attention
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-2 leading-tight">
              {insightCards.topProduct?.label || 'No SKU incidents'}
            </div>
            <div className="text-sm text-slate-700 mt-1 font-medium">
              {(insightCards.topProduct?.count || 0).toLocaleString()} warning/critical actions
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Repeat Incident Pattern
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-2 leading-tight">
              {insightCards.repeatPattern
                ? `${insightCards.repeatPattern.action} @ ${insightCards.repeatPattern.store}`
                : 'No repeat pattern'}
            </div>
            <div className="text-sm text-slate-700 mt-1 font-medium">
              {insightCards.repeatPattern
                ? `${insightCards.repeatPattern.count}x for ${insightCards.repeatPattern.product}`
                : 'Needs at least 3 similar warning/critical incidents'}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Operations Digest
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Natural-language summary from currently filtered logs.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setDigestWindow('daily')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${
                digestWindow === 'daily'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setDigestWindow('weekly')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${
                digestWindow === 'weekly'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</p>
            <p className="text-base font-black text-slate-900 mt-1">
              {digestSummary.currentLogsCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Prev: {digestSummary.previousLogsCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Warn/Critical
            </p>
            <p className="text-base font-black text-slate-900 mt-1">
              {digestSummary.currentWarnings.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Critical</p>
            <p className="text-base font-black text-slate-900 mt-1">
              {digestSummary.currentCritical.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top Actions</p>
            <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
              {digestSummary.topActions.length > 0
                ? digestSummary.topActions
                    .map(([action, count]) => `${action} (${count})`)
                    .join(', ')
                : 'No actions in this window'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Digest Narrative
          </p>
          <div className="space-y-1.5">
            {digestSummary.bullets.map((line) => (
              <p key={line} className="text-xs text-slate-700">
                - {line}
              </p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSeverityFilter('critical');
                setQuickActionApplied(true);
              }}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition"
            >
              Open Critical Events
            </button>
            <button
              type="button"
              onClick={() => {
                if (!digestSummary.topStore || digestSummary.topStore[0] === 'unknown') return;
                setStoreFilter(digestSummary.topStore[0]);
                setQuickActionApplied(true);
              }}
              disabled={!digestSummary.topStore || digestSummary.topStore[0] === 'unknown'}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition disabled:opacity-50"
            >
              Open Top Store Events
            </button>
            <button
              type="button"
              onClick={() => {
                const topAction = digestSummary.topActions[0]?.[0];
                if (!topAction) return;
                setSearchText(topAction);
                setQuickActionApplied(true);
              }}
              disabled={digestSummary.topActions.length === 0}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition disabled:opacity-50"
            >
              Open Top Action Events
            </button>
            {isQuickActionStateActive && (
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  setStoreFilter('all');
                  setSearchText('');
                  setQuickActionApplied(false);
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Reset Quick Actions
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Digest Delivery
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Server-backed schedule and delivery with saved history.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={deliveryConfig.enabled}
              onChange={(event) =>
                setDeliveryConfig((previous) => ({
                  ...previous,
                  enabled: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Enable schedule
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Frequency
            </p>
            <select
              value={deliveryConfig.frequency}
              onChange={(event) => {
                const nextFrequency = event.target.value as DigestDeliveryConfig['frequency'];
                setDeliveryConfig((previous) => ({
                  ...previous,
                  frequency: nextFrequency,
                }));
                setDigestWindow(nextFrequency);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Channel
            </p>
            <select
              value={deliveryConfig.channel}
              onChange={(event) =>
                setDeliveryConfig((previous) => ({
                  ...previous,
                  channel: event.target.value as DigestDeliveryConfig['channel'],
                }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
            >
              <option value="in_app">In App</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Recipient
            </p>
            <input
              value={deliveryConfig.recipient}
              onChange={(event) =>
                setDeliveryConfig((previous) => ({
                  ...previous,
                  recipient: event.target.value,
                }))
              }
              placeholder="team@company.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-xs text-slate-700 font-medium">
            Next run: <span className="font-black">{formatNextRun(deliveryConfig.nextRunAt)}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const saved = await saveDigestDeliverySettings({
                    enabled: true,
                    frequency: deliveryConfig.frequency,
                    channel: deliveryConfig.channel,
                    recipient: deliveryConfig.recipient,
                    filters: buildDeliveryFiltersPayload(),
                  });
                  setDeliveryConfig(saved);
                  setDigestWindow(saved.frequency);
                  setDeliveryNotice('Digest schedule saved.');
                } catch (saveError) {
                  const message = saveError instanceof Error ? saveError.message : 'Failed to save schedule.';
                  setDeliveryNotice(message);
                }
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-white transition"
            >
              Save Schedule
            </button>
            <button
              type="button"
              onClick={() => void sendDigestNowAction()}
              disabled={isSendingDigest || !deliveryConfig.recipient.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSendingDigest ? 'Sending...' : 'Send Digest Now'}
            </button>
          </div>
        </div>

        {deliveryNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            {deliveryNotice}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Delivery History
          </p>
          {deliveryHistory.length === 0 ? (
            <p className="text-xs text-slate-500">No deliveries sent yet.</p>
          ) : (
            <div className="space-y-2">
              {deliveryHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-800">
                    {new Date(item.sentAt).toLocaleString()} | {item.mode} | {item.channel}
                  </p>
                  <p className="text-[11px] text-slate-600">{item.frequency}{' -> '}{item.recipient}</p>
                  <p className="text-[11px] text-slate-600">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <select
            value={userFilter}
            onChange={(event) => setUserFilter(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            <option value="all">All Users</option>
            {userOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : region}
              </option>
            ))}
          </select>

          <select
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            {storeOptions.map((store) => (
              <option key={store} value={store}>
                {store === 'all' ? 'All Stores' : store}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'All Departments' : department}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            <option value="all">All Products</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value as 'all' | AuditLog['severity'])
            }
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
            title="From date"
          />

          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
            title="To date"
          />
        </div>

        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search action, details, user, or product"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">Loading actions...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm font-bold text-red-600">{error}</div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            No matching user actions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Time
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    User
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Product
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Region
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Store
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Department
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900">
                      {log.userName || 'unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {log.productName || log.productId || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{log.region || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{log.store || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{log.department || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionIntelligenceView;
