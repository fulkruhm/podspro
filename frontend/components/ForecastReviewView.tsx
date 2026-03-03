import React from 'react';
import { Role, Filters } from '../types';
import {
  ForecastReviewItem,
  getForecastReviewItems,
  submitForecastReviewDecision,
  triggerForecastBatchRun,
} from '../services/mlService';
import { getDisplayedReviewItems } from './forecastReviewUtils';

interface ForecastReviewViewProps {
  userRole: Role;
  currentUserName: string;
  filters: Filters;
  onRefreshData?: () => Promise<void> | void;
}

const ForecastReviewView: React.FC<ForecastReviewViewProps> = ({
  userRole,
  currentUserName,
  filters,
  onRefreshData,
}) => {
  const [items, setItems] = React.useState<ForecastReviewItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewTab, setReviewTab] = React.useState<'queue' | 'resolved'>('queue');
  const [storeFilter, setStoreFilter] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'score_desc' | 'score_asc' | 'bias_desc' | 'bias_asc'>('score_desc');
  const [decisionLoadingKey, setDecisionLoadingKey] = React.useState<string | null>(null);
  const [batchRefreshing, setBatchRefreshing] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  const PAGE_SIZE = 15;

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getForecastReviewItems(userRole, 100);
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load forecast review items');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSubmitDecision = async (
    item: ForecastReviewItem,
    decisionStatus: 'accept_model' | 'adjust_baseline' | 'flag_data_issue' | 'request_override',
    baselineAdjustmentPct?: number
  ) => {
    const key = `${item.product_id}:${item.store_id}:${decisionStatus}`;
    setDecisionLoadingKey(key);
    setError(null);
    try {
      await submitForecastReviewDecision(userRole, currentUserName, {
        productId: item.product_id,
        storeId: item.store_id,
        decision_status: decisionStatus,
        baseline_adjustment_pct: decisionStatus === 'adjust_baseline' ? baselineAdjustmentPct : undefined,
        notes: `Submitted from Forecast Review page. Bias ${Number(item.bias_pct).toFixed(1)}%, score ${Number(item.anomaly_score).toFixed(1)}.`,
      });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review decision');
    } finally {
      setDecisionLoadingKey(null);
    }
  };

  const handleRefreshForecastData = async () => {
    setBatchRefreshing(true);
    setError(null);
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
      await loadItems();
      Promise.resolve(onRefreshData?.()).catch((refreshError: any) => {
        console.error('Global refresh after forecast batch trigger failed:', refreshError?.message || refreshError);
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh forecast data');
    } finally {
      setBatchRefreshing(false);
    }
  };

  const storeOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.store_id))).sort(),
    [items]
  );

  const displayedItems = React.useMemo(() => {
    return getDisplayedReviewItems(items, {
      reviewTab,
      storeFilter,
      actionFilter,
      sortBy,
    });
  }, [items, reviewTab, storeFilter, actionFilter, sortBy]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [reviewTab, storeFilter, actionFilter, sortBy, items.length]);

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(displayedItems.length, startIndex + PAGE_SIZE);
  const pageItems = displayedItems.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Forecast Review (Admin)</h2>
          <p className="text-[11px] text-slate-500 mt-1">Real anomaly queue from persisted demand + forecast data. Analyst decisions are recorded for audit.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadItems}
            disabled={loading}
            className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Refresh Queue'}
          </button>
          <button
            onClick={handleRefreshForecastData}
            disabled={batchRefreshing}
            className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {batchRefreshing ? 'Refreshing Forecasts...' : 'Refresh Forecast Data'}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forecast Review Queue</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReviewTab('queue')}
              className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${reviewTab === 'queue' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:bg-white'}`}
            >
              Queue
            </button>
            <button
              onClick={() => setReviewTab('resolved')}
              className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${reviewTab === 'resolved' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-white'}`}
            >
              Resolved
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Stores</option>
            {storeOptions.map((store) => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="accept_model">accept model</option>
            <option value="adjust_baseline">adjust baseline</option>
            <option value="flag_data_issue">flag data issue</option>
            <option value="request_override">request override</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score_desc' | 'score_asc' | 'bias_desc' | 'bias_asc')}
            className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="score_desc">Score ↓</option>
            <option value="score_asc">Score ↑</option>
            <option value="bias_desc">|Bias| ↓</option>
            <option value="bias_asc">|Bias| ↑</option>
          </select>
          <div className="text-[11px] text-slate-600 flex items-center px-2">
            Showing {displayedItems.length === 0 ? 0 : startIndex + 1}-{endIndex} of {displayedItems.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider">
                <th className="text-left py-1 pr-2">Product</th>
                <th className="text-left py-1 pr-2">Store</th>
                <th className="text-right py-1 pr-2">Bias %</th>
                <th className="text-right py-1 pr-2">Score</th>
                <th className="text-left py-1 pr-2">Recommended / Decision</th>
                {reviewTab === 'resolved' && (
                  <>
                    <th className="text-left py-1 pr-2">Decided By</th>
                    <th className="text-left py-1 pr-2">Decided At</th>
                  </>
                )}
                <th className="text-left py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => {
                const adjustPct = Number(item.bias_pct);
                return (
                  <tr key={`${item.product_id}:${item.store_id}`} className="border-t border-slate-200 text-slate-700">
                    <td className="py-2 pr-2 font-medium">{item.product_name}</td>
                    <td className="py-2 pr-2">{item.store_id}</td>
                    <td className="py-2 pr-2 text-right font-bold">{Number(item.bias_pct).toFixed(1)}%</td>
                    <td className="py-2 pr-2 text-right">{Number(item.anomaly_score).toFixed(1)}</td>
                    <td className="py-2 pr-2">
                      <div>{item.recommended_action.replace('_', ' ')}</div>
                      {item.latest_decision_status && (
                        <div className="text-[10px] text-emerald-700 font-bold">
                          decided: {item.latest_decision_status.replace('_', ' ')}
                        </div>
                      )}
                    </td>
                    {reviewTab === 'resolved' && (
                      <>
                        <td className="py-2 pr-2">{item.latest_decided_by || '—'}</td>
                        <td className="py-2 pr-2">
                          {item.latest_decision_at
                            ? new Date(item.latest_decision_at).toLocaleString()
                            : '—'}
                        </td>
                      </>
                    )}
                    <td className="py-2 space-x-1">
                      <button
                        onClick={() => handleSubmitDecision(item, 'accept_model')}
                        disabled={!!decisionLoadingKey}
                        className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleSubmitDecision(item, 'adjust_baseline', Math.max(-50, Math.min(50, Number((-adjustPct).toFixed(1)))))}
                        disabled={!!decisionLoadingKey}
                        className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-60"
                      >
                        Adjust
                      </button>
                      <button
                        onClick={() => handleSubmitDecision(item, 'flag_data_issue')}
                        disabled={!!decisionLoadingKey}
                        className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
                      >
                        Flag
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && displayedItems.length === 0 && (
                <tr>
                  <td colSpan={reviewTab === 'resolved' ? 8 : 6} className="py-3 text-slate-500 text-center">No review items for current tab/filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Page {safeCurrentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastReviewView;
