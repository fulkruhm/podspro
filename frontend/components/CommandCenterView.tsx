import React from 'react';
import { Product, FreightRoute, Role, Filters } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import {
  getForecastBatchStatus,
  triggerForecastBatchRun,
  ForecastBatchStatusResponse,
} from '../services/mlService';

interface CommandCenterViewProps {
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
  onNavigateTab: (tab: string) => void;
}

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: string;
  color?: string;
  domain: 'inventory' | 'logistics' | 'system' | 'finance';
  definition: string;
  formula: string;
  owner: string;
  freshness: string;
  confidence: 'High' | 'Medium' | 'Low';
  previousValue: string;
  changeDrivers: string[];
}

const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  triggerQuery,
  products,
  routes,
  isLoadingData,
  isRefreshing,
  onRefresh,
  lastUpdated,
  userRole,
  currentUserName,
  filters,
  onNavigateTab,
}) => {
  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  };

  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const [batchStatus, setBatchStatus] = React.useState<ForecastBatchStatusResponse | null>(null);
  const [batchStatusLoading, setBatchStatusLoading] = React.useState(false);
  const [batchRunLoading, setBatchRunLoading] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const [selectedMetricLabel, setSelectedMetricLabel] = React.useState<string | null>(null);

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
      ]
        .filter(Boolean)
        .join(' • ')
    : 'All stores / products';

  const loadForecastBatchStatus = React.useCallback(async () => {
    if (!canManageForecastBatch) return;

    setBatchStatusLoading(true);
    setBatchError(null);
    try {
      const status = await getForecastBatchStatus(userRole);
      setBatchStatus(status);
    } catch (error: unknown) {
      setBatchError(getErrorMessage(error, 'Failed to load forecast batch status'));
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
      Promise.resolve(onRefresh()).catch((refreshError: unknown) => {
        console.error(
          'Dashboard refresh after batch trigger failed:',
          getErrorMessage(refreshError, 'Unknown refresh error')
        );
      });
    } catch (error: unknown) {
      setBatchError(getErrorMessage(error, 'Failed to run forecast batch'));
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
  const statusCounts = products.reduce(
    (acc, p) => {
      const status = p.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusSummary = [
    {
      key: 'critical',
      label: 'Critical',
      count: statusCounts.critical || 0,
      className: 'bg-red-50 text-red-700 border-red-100',
    },
    {
      key: 'low',
      label: 'Low',
      count: statusCounts.low || 0,
      className: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      key: 'optimal',
      label: 'Optimal',
      count: statusCounts.optimal || 0,
      className: 'bg-green-50 text-green-700 border-green-100',
    },
    {
      key: 'excess',
      label: 'Excess',
      count: statusCounts.excess || 0,
      className: 'bg-blue-50 text-blue-700 border-blue-100',
    },
  ];

  const pieData = Object.keys(statusCounts).map((status) => ({
    name: status.toUpperCase(),
    value: statusCounts[status],
  }));

  const STATUS_COLORS: Record<string, string> = {
    optimal: '#10b981',
    critical: '#ef4444',
    excess: '#3b82f6',
    low: '#f59e0b',
  };
  const inventoryValue = products.reduce((acc, p) => acc + p.currentStock * p.price, 0);
  const inventoryCoveragePct =
    products.length > 0
      ? Math.round(
          (products.filter(
            (p) =>
              typeof p.currentStock === 'number' &&
              typeof p.avgDailyDemand === 'number' &&
              typeof p.reorderPoint === 'number'
          ).length /
            products.length) *
            100
        )
      : 100;
  const logisticsCoveragePct =
    routes.length > 0
      ? Math.round(
          (routes.filter(
            (r) =>
              typeof r.currentRate === 'number' &&
              typeof r.riskLevel === 'string' &&
              typeof r.capacity === 'string'
          ).length /
            routes.length) *
            100
        )
      : 100;
  const trustStripItems = [
    {
      label: 'Data Freshness',
      value: getLastSyncedLabel(),
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Inventory Quality',
      value: `${inventoryCoveragePct}% coverage`,
      tone:
        inventoryCoveragePct >= 90
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Logistics Quality',
      value: `${logisticsCoveragePct}% coverage`,
      tone:
        logisticsCoveragePct >= 90
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Model Confidence',
      value: 'Operational (medium)',
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ];

  const inventoryAlerts =
    userRole === 'admin' || userRole === 'sysadmin' || userRole === 'store_user'
      ? products
          .filter((p) => p.status === 'critical' || p.status === 'low')
          .map((p) => ({
            type: 'inventory',
            id: p.id,
            store: p.store,
            title: p.name,
            description: `${p.currentStock} units in stock. Reorder point triggered at ${p.reorderPoint}.`,
            severity: p.status === 'critical' ? 'high' : 'medium',
            actionLabel: 'Generate Order',
            query: `Recommend a replenishment quantity for ${p.name} at ${p.store}`,
          }))
      : [];

  const logisticsAlerts =
    userRole === 'admin' || userRole === 'sysadmin' || userRole === 'logistics_user'
      ? routes
          .filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium' || r.trend === 'up')
          .map((r) => ({
            type: 'logistics',
            id: r.id,
            store: 'LOGISTICS NETWORK',
            title: `${r.destination} Congestion`,
            description: `Risk: ${r.riskLevel.toUpperCase()}. Capacity is ${r.capacity}. Rates at $${r.currentRate}/mi.`,
            severity: r.riskLevel === 'high' ? 'high' : 'medium',
            actionLabel: 'Analyze Lane',
            query: `Analyze logistics risk and provide booking strategy for the route ending at ${r.destination}`,
          }))
      : [];

  const intelAlerts =
    userRole === 'admin' || userRole === 'sysadmin'
      ? [
          {
            type: 'intelligence',
            id: 'intel-1',
            store: 'SYSTEM INTEL',
            title: 'Fuel Surcharge Spike Predicted',
            description:
              'Expected 8.4% increase in DOE fuel index next Monday. Impacting all active lanes.',
            severity: 'medium',
            actionLabel: 'Review ROI',
            query:
              'Quantify the impact of an 8.4% fuel surcharge increase on my total logistics spend',
          },
          {
            type: 'intelligence',
            id: 'intel-2',
            store: 'GLOBAL RISK',
            title: 'Midwest Weather Disruption',
            description:
              'Severe winter conditions affecting Chicago Hub. 48hr delivery delays expected.',
            severity: 'high',
            actionLabel: 'Reroute Assets',
            query:
              'Which stores are most affected by Chicago Hub delays and what are the rerouting options?',
          },
        ]
      : [];

  const sortedAlerts = [
    ...intelAlerts.filter((a) => a.severity === 'high'),
    ...logisticsAlerts.filter((a) => a.severity === 'high'),
    ...inventoryAlerts.filter((a) => a.severity === 'high'),
    ...intelAlerts.filter((a) => a.severity === 'medium'),
    ...logisticsAlerts.filter((a) => a.severity === 'medium'),
    ...inventoryAlerts.filter((a) => a.severity === 'medium'),
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
      description: 'Stock levels vs target',
    },
    {
      name: 'Logistics Efficiency',
      value: 78,
      trend: [82, 80, 75, 76, 78, 77, 78],
      color: '#3b82f6',
      description: 'On-time delivery performance',
    },
    {
      name: 'Demand Accuracy',
      value: 85,
      trend: [70, 75, 80, 82, 85, 84, 85],
      color: '#f59e0b',
      description: 'Forecast vs actual sales',
    },
  ];

  const getStatMetadata = (label: string): Omit<
    StatCard,
    'label' | 'value' | 'change' | 'icon' | 'color' | 'domain'
  > => {
    switch (label) {
      case 'Avg Service Level':
        return {
          definition: 'Percentage of fulfilled demand without service disruption.',
          formula: '(Served demand / Total demand) * 100',
          owner: 'Inventory Operations',
          freshness: 'Near real-time (4m lag)',
          confidence: 'High',
          previousValue: '98.2%',
          changeDrivers: ['Critical SKUs recovered in 2 stores', 'Fill rate uptick in top sellers'],
        };
      case 'Total Assets':
        return {
          definition: 'Approximate value of current inventory assets in scope.',
          formula: 'Sum(current stock * unit price)',
          owner: 'Inventory Finance',
          freshness: '15m lag',
          confidence: 'Medium',
          previousValue: '$13.9k',
          changeDrivers: ['Sell-through reduced on-hand value', 'Markdown adjustments on excess items'],
        };
      case 'Network Risk Index':
        return {
          definition: 'Composite risk based on lane risk, disruption signals, and capacity.',
          formula: 'Weighted index(lane risk, delays, capacity tightness)',
          owner: 'Logistics Control Tower',
          freshness: '10m lag',
          confidence: 'Medium',
          previousValue: 'Moderate',
          changeDrivers: ['Weather advisory on key lane', 'Carrier delay probability increased'],
        };
      case 'Carrier Capacity':
        return {
          definition: 'Available carrier capacity against planned requirement.',
          formula: 'Available slots / Required slots',
          owner: 'Logistics Planning',
          freshness: '10m lag',
          confidence: 'Medium',
          previousValue: '77%',
          changeDrivers: ['Two carriers reduced weekly slots', 'Spot market tightened in region'],
        };
      case 'System Uptime':
        return {
          definition: 'Platform availability over rolling 24 hours.',
          formula: '1 - (Downtime / Total time)',
          owner: 'Platform SRE',
          freshness: '1m lag',
          confidence: 'High',
          previousValue: '99.97%',
          changeDrivers: ['No critical incidents in period', 'Background autoscaling stabilized'],
        };
      case 'Security Events':
        return {
          definition: 'Count of unresolved security events in monitoring queue.',
          formula: 'Open alerts by severity policy',
          owner: 'Security Operations',
          freshness: '1m lag',
          confidence: 'High',
          previousValue: '5 Open',
          changeDrivers: ['Two medium alerts resolved', 'No new critical findings'],
        };
      case 'API Throughput':
        return {
          definition: 'Requests processed per minute across public APIs.',
          formula: 'Total requests / minute',
          owner: 'Platform Engineering',
          freshness: '1m lag',
          confidence: 'High',
          previousValue: '1.15k/min',
          changeDrivers: ['Higher dashboard polling activity', 'Batch status checks increased'],
        };
      case 'On-Time Delivery':
        return {
          definition: 'Shipments delivered within planned SLA window.',
          formula: '(On-time deliveries / Total deliveries) * 100',
          owner: 'Transportation Operations',
          freshness: '30m lag',
          confidence: 'Medium',
          previousValue: '93.1%',
          changeDrivers: ['Improved dock turnaround', 'Reduced late arrivals on primary lane'],
        };
      case 'Avg Freight Rate':
        return {
          definition: 'Average effective freight rate across active lanes.',
          formula: 'Total freight spend / Total miles',
          owner: 'Logistics Procurement',
          freshness: '30m lag',
          confidence: 'Medium',
          previousValue: '$2.82/mi',
          changeDrivers: ['Fuel surcharge increase', 'Higher share of spot bookings'],
        };
      case 'Stockout Risk':
        return {
          definition: 'Count of SKUs currently flagged as high stockout risk.',
          formula: 'Critical SKU count from status model',
          owner: 'Store Replenishment',
          freshness: 'Near real-time (4m lag)',
          confidence: 'High',
          previousValue: '0 SKU',
          changeDrivers: ['Forecast volatility in fast movers', 'Reorder delays at store level'],
        };
      case 'Optimal Items':
        return {
          definition: 'Count of SKUs operating within target stock policy band.',
          formula: 'SKUs with status=optimal',
          owner: 'Store Replenishment',
          freshness: 'Near real-time (4m lag)',
          confidence: 'High',
          previousValue: `${Math.max(0, (statusCounts.optimal || 0) - 2)}`,
          changeDrivers: ['Safety stock tuning improved balance', 'Replenishment timing stabilized'],
        };
      default:
        return {
          definition: 'Operational metric tracked by the command center.',
          formula: 'See metric specification',
          owner: 'Operations',
          freshness: 'Near real-time',
          confidence: 'Medium',
          previousValue: 'n/a',
          changeDrivers: ['Routine data refresh'],
        };
    }
  };

  const getRoleStatCards = (): Array<Omit<StatCard, keyof ReturnType<typeof getStatMetadata>>> => {
    if (userRole === 'sysadmin') {
      return [
        {
          label: 'System Uptime',
          value: '99.98%',
          change: '+0.01%',
          icon: '🖥️',
          domain: 'system',
        },
        {
          label: 'Security Events',
          value: '3 Open',
          change: '-2',
          icon: '🛡️',
          color: 'text-amber-600',
          domain: 'system',
        },
        {
          label: 'API Throughput',
          value: '1.2k/min',
          change: '+4.3%',
          icon: '📡',
          domain: 'system',
        },
        {
          label: 'Total Assets',
          value: `$${(inventoryValue / 1000).toFixed(1)}k`,
          change: '-1.4%',
          icon: '💰',
          domain: 'finance',
        },
      ];
    }

    if (userRole === 'admin') {
      return [
        {
          label: 'Avg Service Level',
          value: '98.4%',
          change: '+0.2%',
          icon: '📈',
          domain: 'inventory',
        },
        {
          label: 'Total Assets',
          value: `$${(inventoryValue / 1000).toFixed(1)}k`,
          change: '-1.4%',
          icon: '💰',
          domain: 'inventory',
        },
        {
          label: 'Network Risk Index',
          value: 'Elevated',
          change: 'High',
          icon: '🛡️',
          color: 'text-amber-600',
          domain: 'logistics',
        },
        {
          label: 'Carrier Capacity',
          value: '72%',
          change: '-5%',
          icon: '🚛',
          domain: 'logistics',
        },
      ];
    }

    if (userRole === 'logistics_user') {
      return [
        {
          label: 'Network Risk Index',
          value: 'Elevated',
          change: 'High',
          icon: '🛡️',
          color: 'text-amber-600',
          domain: 'logistics',
        },
        {
          label: 'Carrier Capacity',
          value: '72%',
          change: '-5%',
          icon: '🚛',
          domain: 'logistics',
        },
        {
          label: 'On-Time Delivery',
          value: '94.2%',
          change: '+1.1%',
          icon: '⏱️',
          domain: 'logistics',
        },
        {
          label: 'Avg Freight Rate',
          value: '$2.84/mi',
          change: '+0.6%',
          icon: '🧭',
          domain: 'logistics',
        },
      ];
    }

    return [
      {
        label: 'Avg Service Level',
        value: '98.4%',
        change: '+0.2%',
        icon: '📈',
        domain: 'inventory',
      },
      {
        label: 'Total Assets',
        value: `$${(inventoryValue / 1000).toFixed(1)}k`,
        change: '-1.4%',
        icon: '💰',
        domain: 'inventory',
      },
      {
        label: 'Stockout Risk',
        value: `${statusCounts.critical || 0} SKU`,
        change: `${statusCounts.critical ? '+' : ''}${statusCounts.critical || 0}`,
        icon: '⚠️',
        color: 'text-red-600',
        domain: 'inventory',
      },
      {
        label: 'Optimal Items',
        value: `${statusCounts.optimal || 0}`,
        change: '+2',
        icon: '✅',
        domain: 'inventory',
      },
    ];
  };

  const statCards = getRoleStatCards().map((card) => ({
    ...card,
    ...getStatMetadata(card.label),
  }));

  const selectedMetric =
    statCards.find((metric) => metric.label === selectedMetricLabel) ?? statCards[0] ?? null;

  const getTabForDomain = (domain: StatCard['domain']) => {
    if (domain === 'inventory' || domain === 'finance') return 'inventory';
    if (domain === 'logistics') return 'logistics';
    if (domain === 'system') return 'useractions';
    return 'dashboard';
  };

  const shouldShowHoverWhyChanged = (metricLabel: string) =>
    ![
      'Avg Service Level',
      'Total Assets',
      'Total Inventory',
      'Network Risk Index',
      'Carrier Capacity',
    ].includes(metricLabel);

  React.useEffect(() => {
    if (!selectedMetricLabel && statCards.length > 0) {
      setSelectedMetricLabel(statCards[0].label);
    }
  }, [selectedMetricLabel, statCards]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {getDashboardTitle()}
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest italic">
              Encrypted Connection • Synced {getLastSyncedLabel()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Sync Live Engine'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {trustStripItems.map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.tone}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</p>
            <p className="text-xs font-bold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {isLoadingData
          ? statCards.map((_, i) => (
              <div
                key={`stat-skeleton-${i}`}
                className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm animate-pulse"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 w-6 rounded bg-slate-200"></div>
                  <div className="h-4 w-12 rounded-full bg-slate-200"></div>
                </div>
                <div className="h-3 w-24 rounded bg-slate-200 mb-2"></div>
                <div className="h-7 w-16 rounded bg-slate-200"></div>
              </div>
            ))
          : statCards.map((stat, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedMetricLabel(stat.label)}
                className={`bg-white p-5 md:p-6 rounded-[1.5rem] border shadow-sm transition hover:shadow-xl group relative overflow-hidden text-left ${
                  selectedMetric?.label === stat.label
                    ? 'border-blue-300 ring-2 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                    {stat.icon}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        stat.change.startsWith('+')
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        stat.domain === 'inventory'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : stat.domain === 'logistics'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : stat.domain === 'finance'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {stat.domain}
                    </span>
                  </div>
                </div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {stat.label}
                </div>
                <div
                  className={`text-xl md:text-2xl font-black mt-1 ${stat.color || 'text-slate-900'}`}
                >
                  {stat.value}
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  Click for drilldown
                </div>
                {shouldShowHoverWhyChanged(stat.label) && (
                  <div className="absolute left-3 right-3 top-16 hidden group-hover:block z-20">
                    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Why Changed
                      </p>
                      <p className="text-[11px] text-slate-700 mt-1">
                        Prev: <span className="font-bold text-slate-900">{stat.previousValue}</span>{' ->'}
                        Now: <span className="font-bold text-slate-900"> {stat.value}</span>
                      </p>
                      <p className="text-[11px] text-slate-700">
                        Confidence: <span className="font-bold">{stat.confidence}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {stat.changeDrivers[0]}
                      </p>
                    </div>
                  </div>
                )}
              </button>
            ))}
      </div>

      {selectedMetric && (
        <div className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Metric Drilldown
              </p>
              <h3 className="text-lg font-black text-slate-900 mt-1">{selectedMetric.label}</h3>
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
              {selectedMetric.domain}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current</p>
              <p className="text-sm font-black text-slate-900 mt-1">{selectedMetric.value}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Previous</p>
              <p className="text-sm font-black text-slate-900 mt-1">{selectedMetric.previousValue}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confidence</p>
              <p className="text-sm font-black text-slate-900 mt-1">{selectedMetric.confidence}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Definition</p>
              <p className="text-xs text-slate-700 mt-1">{selectedMetric.definition}</p>
              <p className="text-[11px] text-slate-500 mt-2">Formula: {selectedMetric.formula}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Why Changed</p>
              <p className="text-[11px] text-slate-500 mt-1">Owner: {selectedMetric.owner}</p>
              <p className="text-[11px] text-slate-500">Freshness: {selectedMetric.freshness}</p>
              <div className="mt-2 space-y-1">
                {selectedMetric.changeDrivers.map((driver) => (
                  <p key={driver} className="text-xs text-slate-700">- {driver}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onNavigateTab(getTabForDomain(selectedMetric.domain))}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700"
            >
              Open Related View
            </button>
            <button
              onClick={() =>
                triggerQuery(
                  `Explain why ${selectedMetric.label} changed from ${selectedMetric.previousValue} to ${selectedMetric.value} and give 3 concrete actions for ${selectedMetric.domain} operations.`
                )
              }
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-50"
            >
              Ask AI
            </button>
          </div>
        </div>
      )}

      {canManageForecastBatch && (
        <div className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Forecast Batch Control
              </h3>
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Last Run
              </p>
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
                  Success: {batchStatus.latest_run.succeeded_items} /{' '}
                  {batchStatus.latest_run.total_items || 0}
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Next Nightly Run
              </p>
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
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Supply Chain Health Index
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
              Real-time performance metrics across core verticals
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Aggregate Score
            </span>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
              85%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoadingData
            ? [0, 1, 2].map((i) => (
                <div
                  key={`health-skeleton-${i}`}
                  className="flex flex-col bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 animate-pulse"
                >
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
                <div
                  key={i}
                  className="flex flex-col bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {metric.name}
                      </div>
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
                          data={[{ value: metric.value }, { value: 100 - metric.value }]}
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
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        Performance
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                      {metric.description}
                    </p>
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                        metric.value > 80
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
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
            <div
              className={`${userRole === 'logistics_user' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm animate-pulse`}
            >
              <div className="h-4 w-52 rounded bg-slate-200 mb-6"></div>
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={`alert-skeleton-${i}`}
                    className="h-20 rounded-[1.25rem] bg-slate-100 border border-slate-200"
                  ></div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {userRole !== 'logistics_user' && (
              <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                  Inventory Segmentation
                </h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name.toLowerCase()] || '#94a3b8'}
                            strokeWidth={0}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {statusSummary.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-lg border px-2 py-1.5 ${item.className}`}
                    >
                      <div className="text-[9px] font-black uppercase tracking-widest">
                        {item.label}
                      </div>
                      <div className="text-sm font-black mt-0.5">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`${userRole === 'logistics_user' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm`}
            >
              <div className="flex justify-between items-center mb-6 px-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Priority Operational Alerts
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
                    Immediate attention required for {sortedAlerts.length} items
                  </p>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                </div>
              </div>

              <div className="space-y-4">
                {sortedAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-[1.25rem] border transition-all hover:translate-x-1 group ${
                      alert.severity === 'high'
                        ? 'border-red-100 bg-red-50/20'
                        : 'border-amber-100 bg-amber-50/20'
                    }`}
                  >
                    <div className="flex items-start">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 shadow-sm transition-transform group-hover:rotate-6 ${
                          alert.severity === 'high'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        <span className="text-xl">
                          {alert.type === 'inventory'
                            ? '📦'
                            : alert.type === 'logistics'
                              ? '🚛'
                              : '📡'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                              alert.type === 'inventory'
                                ? 'bg-blue-600 text-white'
                                : alert.type === 'logistics'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-purple-600 text-white'
                            }`}
                          >
                            {alert.store}
                          </span>
                        </div>
                        <div className="text-sm font-black text-slate-900 mt-1.5">
                          {alert.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed max-w-md">
                          {alert.description}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerQuery(alert.query)}
                      className={`w-full sm:w-auto text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex-shrink-0 mt-4 sm:mt-0 ${
                        alert.severity === 'high'
                          ? 'bg-red-600 hover:bg-red-700 shadow-red-900/10'
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10'
                      }`}
                    >
                      {alert.actionLabel}
                    </button>
                  </div>
                ))}

                {sortedAlerts.length === 0 && (
                  <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                    <span className="text-4xl mb-4 block animate-bounce">✨</span>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">
                      Operational Equilibrium
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">
                      No priority overrides currently required
                    </p>
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

export default CommandCenterView;
