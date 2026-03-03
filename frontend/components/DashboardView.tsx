
import React from 'react';
import { Product, FreightRoute, Role, Filters } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line } from 'recharts';
import {
  getForecastBatchStatus,
  triggerForecastBatchRun,
  ForecastBatchStatusResponse,
} from '../services/mlService';

interface DashboardViewProps {
  triggerQuery: (query: string) => void;
  products: Product[];
  routes: FreightRoute[];
  isLoadingData: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void> | void;
  lastUpdated: number;
  userRole: Role;
  currentUserName: string;
  filters: Filters;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  triggerQuery, 
  products, 
  routes, 
  isLoadingData,
  isRefreshing, 
  onRefresh, 
  lastUpdated,
  userRole,
  currentUserName,
  filters
}) => {
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const [batchStatus, setBatchStatus] = React.useState<ForecastBatchStatusResponse | null>(null);
  const [batchStatusLoading, setBatchStatusLoading] = React.useState(false);
  const [batchRunLoading, setBatchRunLoading] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const canManageForecastBatch = userRole === 'admin' || userRole === 'sysadmin';
  const hasActiveBatchFilters = Boolean(
    filters.region || filters.store || filters.department || filters.product || filters.status
  );
  const batchScopeLabel = hasActiveBatchFilters
    ? [
      filters.region && `Region: ${filters.region}`,
      filters.store && `Store: ${filters.store}`,
      filters.department && `Dept: ${filters.department}`,
      filters.product && `Product ID: ${filters.product}`,
      filters.status && `Status: ${filters.status}`,
    ].filter(Boolean).join(' • ')
    : 'All stores / products';

  const loadForecastBatchStatus = React.useCallback(async () => {
    if (!canManageForecastBatch) return;

    setBatchStatusLoading(true);
    setBatchError(null);
    try {
      const status = await getForecastBatchStatus(userRole);
      setBatchStatus(status);
    } catch (error: any) {
      setBatchError(error?.message || 'Failed to load forecast batch status');
    } finally {
      setBatchStatusLoading(false);
    }
  }, [canManageForecastBatch, userRole]);

  React.useEffect(() => {
    loadForecastBatchStatus();
  }, [loadForecastBatchStatus]);

  React.useEffect(() => {
    if (!canManageForecastBatch) return;

    const isBatchRunning = batchStatus?.latest_run?.status === 'running';
    if (!isBatchRunning) return;

    const timer = setInterval(() => {
      loadForecastBatchStatus();
    }, 10000);

    return () => clearInterval(timer);
  }, [canManageForecastBatch, batchStatus?.latest_run?.status, loadForecastBatchStatus]);

  const handleRunForecastBatchNow = async () => {
    setBatchRunLoading(true);
    setBatchError(null);
    try {
      await triggerForecastBatchRun(userRole, currentUserName, {
        history_days: 56,
        forecast_days: 14,
        min_history_points: 14,
        filters: {
          region: filters.region || undefined,
          store: filters.store || undefined,
          department: filters.department || undefined,
          product: filters.product || undefined,
          status: filters.status || undefined,
        },
      });
      await loadForecastBatchStatus();
      Promise.resolve(onRefresh()).catch((refreshError: any) => {
        console.error('Dashboard refresh after batch trigger failed:', refreshError?.message || refreshError);
      });
    } catch (error: any) {
      setBatchError(error?.message || 'Failed to run forecast batch');
    } finally {
      setBatchRunLoading(false);
    }
  };

  const getLastSyncedLabel = () => {
    const diffMs = currentTime - lastUpdated;
    const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Inventory calculations
  const statusCounts = products.reduce((acc: any, p) => {
    const status = p.status.toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusSummary = [
    { key: 'critical', label: 'Critical', count: statusCounts.critical || 0, className: 'bg-red-50 text-red-700 border-red-100' },
    { key: 'low', label: 'Low', count: statusCounts.low || 0, className: 'bg-amber-50 text-amber-700 border-amber-100' },
    { key: 'optimal', label: 'Optimal', count: statusCounts.optimal || 0, className: 'bg-green-50 text-green-700 border-green-100' },
    { key: 'excess', label: 'Excess', count: statusCounts.excess || 0, className: 'bg-blue-50 text-blue-700 border-blue-100' }
  ];

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status.toUpperCase(),
    value: statusCounts[status]
  }));

  const STATUS_COLORS: Record<string, string> = {
    optimal: '#10b981',
    critical: '#ef4444',
    excess: '#3b82f6',
    low: '#f59e0b'
  };
  const inventoryValue = products.reduce((acc, p) => acc + (p.currentStock * p.price), 0);

  const inventoryAlerts = (userRole === 'admin' || userRole === 'sysadmin' || userRole === 'store_user')
    ? products
      .filter(p => p.status === 'critical' || p.status === 'low')
      .map(p => ({
        type: 'inventory',
        id: p.id,
        store: p.store,
        title: p.name,
        description: `${p.currentStock} units in stock. Reorder point triggered at ${p.reorderPoint}.`,
        severity: p.status === 'critical' ? 'high' : 'medium',
        actionLabel: 'Generate Order',
        query: `Recommend a replenishment quantity for ${p.name} at ${p.store}`
      }))
    : [];

  const logisticsAlerts = (userRole === 'admin' || userRole === 'sysadmin' || userRole === 'logistics_user')
    ? routes
      .filter(r => r.riskLevel === 'high' || r.riskLevel === 'medium' || r.trend === 'up')
      .map(r => ({
        type: 'logistics',
        id: r.id,
        store: 'LOGISTICS NETWORK',
        title: `${r.destination} Congestion`,
        description: `Risk: ${r.riskLevel.toUpperCase()}. Capacity is ${r.capacity}. Rates at $${r.currentRate}/mi.`,
        severity: r.riskLevel === 'high' ? 'high' : 'medium',
        actionLabel: 'Analyze Lane',
        query: `Analyze logistics risk and provide booking strategy for the route ending at ${r.destination}`
      }))
    : [];

  const intelAlerts = (userRole === 'admin' || userRole === 'sysadmin') ? [
    {
      type: 'intelligence',
      id: 'intel-1',
      store: 'SYSTEM INTEL',
      title: 'Fuel Surcharge Spike Predicted',
      description: 'Expected 8.4% increase in DOE fuel index next Monday. Impacting all active lanes.',
      severity: 'medium',
      actionLabel: 'Review ROI',
      query: 'Quantify the impact of an 8.4% fuel surcharge increase on my total logistics spend'
    },
    {
      type: 'intelligence',
      id: 'intel-2',
      store: 'GLOBAL RISK',
      title: 'Midwest Weather Disruption',
      description: 'Severe winter conditions affecting Chicago Hub. 48hr delivery delays expected.',
      severity: 'high',
      actionLabel: 'Reroute Assets',
      query: 'Which stores are most affected by Chicago Hub delays and what are the rerouting options?'
    }
  ] : [];

  const sortedAlerts = [
    ...intelAlerts.filter(a => a.severity === 'high'),
    ...logisticsAlerts.filter(a => a.severity === 'high'),
    ...inventoryAlerts.filter(a => a.severity === 'high'),
    ...intelAlerts.filter(a => a.severity === 'medium'),
    ...logisticsAlerts.filter(a => a.severity === 'medium'),
    ...inventoryAlerts.filter(a => a.severity === 'medium'),
  ].slice(0, 5);

  const getDashboardTitle = () => {
    if (userRole === 'admin' || userRole === 'sysadmin') return 'Executive Portfolio Command';
    if (userRole === 'logistics_user') return 'Freight Operations Center';
    return 'Store Optimization Deck';
  };

  const healthMetrics = [
    {
      name: 'Inventory Availability',
      value: 92,
      trend: [85, 88, 87, 90, 92, 91, 92],
      color: '#10b981',
      description: 'Stock levels vs target'
    },
    {
      name: 'Logistics Efficiency',
      value: 78,
      trend: [82, 80, 75, 76, 78, 77, 78],
      color: '#3b82f6',
      description: 'On-time delivery performance'
    },
    {
      name: 'Demand Accuracy',
      value: 85,
      trend: [70, 75, 80, 82, 85, 84, 85],
      color: '#f59e0b',
      description: 'Forecast vs actual sales'
    }
  ];

  const getRoleStatCards = () => {
    if (userRole === 'sysadmin') {
      return [
        { label: 'System Uptime', value: '99.98%', change: '+0.01%', icon: '🖥️' },
        { label: 'Security Events', value: '3 Open', change: '-2', icon: '🛡️', color: 'text-amber-600' },
        { label: 'API Throughput', value: '1.2k/min', change: '+4.3%', icon: '📡' },
        { label: 'Total Assets', value: `$${(inventoryValue / 1000).toFixed(1)}k`, change: '-1.4%', icon: '💰' },
      ];
    }

    if (userRole === 'admin') {
      return [
        { label: 'Avg Service Level', value: '98.4%', change: '+0.2%', icon: '📈' },
        { label: 'Total Assets', value: `$${(inventoryValue / 1000).toFixed(1)}k`, change: '-1.4%', icon: '💰' },
        { label: 'Network Risk Index', value: 'Elevated', change: 'High', icon: '🛡️', color: 'text-amber-600' },
        { label: 'Carrier Capacity', value: '72%', change: '-5%', icon: '🚛' },
      ];
    }

    if (userRole === 'logistics_user') {
      return [
        { label: 'Network Risk Index', value: 'Elevated', change: 'High', icon: '🛡️', color: 'text-amber-600' },
        { label: 'Carrier Capacity', value: '72%', change: '-5%', icon: '🚛' },
        { label: 'On-Time Delivery', value: '94.2%', change: '+1.1%', icon: '⏱️' },
        { label: 'Avg Freight Rate', value: '$2.84/mi', change: '+0.6%', icon: '🧭' },
      ];
    }

    return [
      { label: 'Avg Service Level', value: '98.4%', change: '+0.2%', icon: '📈' },
      { label: 'Total Assets', value: `$${(inventoryValue / 1000).toFixed(1)}k`, change: '-1.4%', icon: '💰' },
      { label: 'Stockout Risk', value: `${statusCounts.critical || 0} SKU`, change: `${statusCounts.critical ? '+' : ''}${statusCounts.critical || 0}`, icon: '⚠️', color: 'text-red-600' },
      { label: 'Optimal Items', value: `${statusCounts.optimal || 0}`, change: '+2', icon: '✅' },
    ];
  };

  const statCards = getRoleStatCards();

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{getDashboardTitle()}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest italic">Encrypted Connection • Synced {getLastSyncedLabel()}</p>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{isRefreshing ? 'Refreshing...' : 'Sync Live Engine'}</span>
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {isLoadingData
          ? statCards.map((_, i) => (
              <div key={`stat-skeleton-${i}`} className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 w-6 rounded bg-slate-200"></div>
                  <div className="h-4 w-12 rounded-full bg-slate-200"></div>
                </div>
                <div className="h-3 w-24 rounded bg-slate-200 mb-2"></div>
                <div className="h-7 w-16 rounded bg-slate-200"></div>
              </div>
            ))
          : statCards.map((stat, i) => (
              <div key={i} className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm transition hover:shadow-xl group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{stat.icon}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{stat.change}</span>
                </div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
                <div className={`text-xl md:text-2xl font-black mt-1 ${stat.color || 'text-slate-900'}`}>{stat.value}</div>
              </div>
            ))}
      </div>

      {canManageForecastBatch && (
        <div className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Forecast Batch Control</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                Nightly schedule + on-demand admin trigger
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-1">
                Run Scope: {batchScopeLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadForecastBatchStatus}
                disabled={batchStatusLoading}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {batchStatusLoading ? 'Refreshing...' : 'Refresh Status'}
              </button>
              <button
                onClick={handleRunForecastBatchNow}
                disabled={batchRunLoading}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {batchRunLoading ? 'Running...' : 'Run Batch Now'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Run</p>
              <p className="text-xs text-slate-900 mt-1 font-bold">
                {batchStatus?.latest_run?.started_at
                  ? new Date(batchStatus.latest_run.started_at).toLocaleString()
                  : 'No run yet'}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Status: {batchStatus?.latest_run?.status || 'n/a'}
              </p>
              {typeof batchStatus?.latest_run?.succeeded_items === 'number' && (
                <p className="text-[11px] text-slate-600">
                  Success: {batchStatus.latest_run.succeeded_items} / {batchStatus.latest_run.total_items || 0}
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Nightly Run</p>
              <p className="text-xs text-slate-900 mt-1 font-bold">
                {batchStatus?.next_scheduled_run_at
                  ? new Date(batchStatus.next_scheduled_run_at).toLocaleString()
                  : 'Not scheduled'}
              </p>
            </div>
          </div>

          {batchError && (
            <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
              {batchError}
            </div>
          )}

        </div>
      )}

      {/* Supply Chain Health Widget */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8 px-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Supply Chain Health Index</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">Real-time performance metrics across core verticals</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Score</span>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
              85%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoadingData
            ? [0, 1, 2].map((i) => (
                <div key={`health-skeleton-${i}`} className="flex flex-col bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 animate-pulse">
                  <div className="h-3 w-28 rounded bg-slate-200 mb-3"></div>
                  <div className="h-8 w-16 rounded bg-slate-200 mb-4"></div>
                  <div className="h-24 w-full rounded-xl bg-slate-200"></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="h-2.5 w-32 rounded bg-slate-200"></div>
                    <div className="h-4 w-14 rounded bg-slate-200"></div>
                  </div>
                </div>
              ))
            : healthMetrics.map((metric, i) => (
                <div key={i} className="flex flex-col bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{metric.name}</div>
                      <div className="text-2xl font-black text-slate-900">{metric.value}%</div>
                    </div>
                    <div className="w-20 h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metric.trend.map((v, idx) => ({ v, idx }))}>
                          <Line 
                            type="monotone" 
                            dataKey="v" 
                            stroke={metric.color} 
                            strokeWidth={2} 
                            dot={false} 
                            isAnimationActive={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Gauge Visualization */}
                  <div className="h-24 w-full relative flex items-center justify-center mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: metric.value },
                            { value: 100 - metric.value }
                          ]}
                          cx="50%"
                          cy="100%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={0}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill={metric.color} />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 text-center w-full">
                      <div className="h-px w-12 bg-slate-200 mx-auto mb-1"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Performance</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{metric.description}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                      metric.value > 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {metric.value > 80 ? 'OPTIMAL' : 'MONITOR'}
                    </span>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoadingData ? (
          <>
            {userRole !== 'logistics_user' && (
              <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[400px] animate-pulse">
                <div className="h-4 w-40 rounded bg-slate-200 mb-4"></div>
                <div className="h-[280px] w-full rounded-2xl bg-slate-200"></div>
              </div>
            )}
            <div className={`${userRole === 'logistics_user' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm animate-pulse`}>
              <div className="h-4 w-52 rounded bg-slate-200 mb-6"></div>
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={`alert-skeleton-${i}`} className="h-20 rounded-[1.25rem] bg-slate-100 border border-slate-200"></div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
        {userRole !== 'logistics_user' && (
          <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Inventory Segmentation</h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#94a3b8'} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {statusSummary.map((item) => (
                <div key={item.key} className={`rounded-lg border px-2 py-1.5 ${item.className}`}>
                  <div className="text-[9px] font-black uppercase tracking-widest">{item.label}</div>
                  <div className="text-sm font-black mt-0.5">{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${userRole === 'logistics_user' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm`}>
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Priority Operational Alerts</h3>
               <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">Immediate attention required for {sortedAlerts.length} items</p>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            </div>
          </div>

          <div className="space-y-4">
            {sortedAlerts.map((alert, idx) => (
              <div key={idx} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-[1.25rem] border transition-all hover:translate-x-1 group ${
                alert.severity === 'high' ? 'border-red-100 bg-red-50/20' : 'border-amber-100 bg-amber-50/20'
              }`}>
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 shadow-sm transition-transform group-hover:rotate-6 ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <span className="text-xl">
                      {alert.type === 'inventory' ? '📦' : alert.type === 'logistics' ? '🚛' : '📡'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                         alert.type === 'inventory' ? 'bg-blue-600 text-white' : alert.type === 'logistics' ? 'bg-slate-900 text-white' : 'bg-purple-600 text-white'
                       }`}>
                         {alert.store}
                       </span>
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1.5">{alert.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed max-w-md">{alert.description}</div>
                  </div>
                </div>
                <button 
                  onClick={() => triggerQuery(alert.query)}
                  className={`w-full sm:w-auto text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex-shrink-0 mt-4 sm:mt-0 ${
                    alert.severity === 'high' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/10' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10'
                  }`}
                >
                  {alert.actionLabel}
                </button>
              </div>
            ))}
            
            {sortedAlerts.length === 0 && (
              <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                <span className="text-4xl mb-4 block animate-bounce">✨</span>
                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Operational Equilibrium</p>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">No priority overrides currently required</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
