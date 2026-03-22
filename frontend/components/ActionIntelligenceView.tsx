import React, { useEffect, useMemo, useState } from 'react';
import { AuditLog, Product, User } from '../types';
import { exportAuditLogsCsv, fetchAuditLogs } from '../services/auditService';

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
