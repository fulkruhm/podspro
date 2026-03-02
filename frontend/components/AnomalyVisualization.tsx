/**
 * Anomaly Detection Visualization Component - Regional Level
 * Displays detected anomalies across stores in a region with actionable insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { AnomalyResult, detectAnomalies, AnomalyDatapoint } from '../services/mlService';

interface AnomalyViewProps {
  products?: any[];
  routes?: any[];
}

export default function AnomalyView({ products = [], routes = [] }: AnomalyViewProps) {
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(0.05);
  const [selectedRegion, setSelectedRegion] = useState<string>(products[0]?.region || '');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  // Get unique regions and products
  const regions = useMemo(() => 
    [...new Set(products.map((p: any) => p.region).filter(Boolean))],
    [products]
  );

  const productsInRegion = useMemo(() => 
    products.filter((p: any) => p.region === selectedRegion),
    [selectedRegion, products]
  );

  const productsToFilter = selectedProduct 
    ? productsInRegion.filter((p: any) => p.id === selectedProduct)
    : productsInRegion;

  // Fetch anomalies on component mount and when filters change
  useEffect(() => {
    if (productsToFilter.length > 0) {
      fetchAnomalies();
    }
  }, [productsToFilter, sensitivity]);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare datapoints from filtered products
      const datapoints: AnomalyDatapoint[] = productsToFilter.map((product: any) => ({
        timestamp: new Date().toISOString(),
        product_id: product.id,
        store_id: product.store || 'Global',
        current_stock: product.currentStock || Math.floor(Math.random() * 100),
        avg_daily_demand: product.avgDailyDemand || Math.floor(Math.random() * 50),
      }));

      if (datapoints.length === 0) {
        throw new Error('No products available for anomaly detection');
      }

      const results = await detectAnomalies(datapoints, sensitivity);
      setAnomalies(results.filter((a) => a.is_anomaly)); // Show only anomalies
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch anomalies');
    } finally {
      setLoading(false);
    }
  };

  const getAnomalySeverity = (score: number): 'critical' | 'warning' | 'info' => {
    if (score >= 0.7) return 'critical';
    if (score >= 0.5) return 'warning';
    return 'info';
  };

  const getSeverityColor = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Regional Anomaly Detection</h2>
      </div>

      {/* Region and Product Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <label htmlFor="region-select" className="block text-sm font-medium text-slate-700 mb-2">
            Select Region
          </label>
          <select
            id="region-select"
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setSelectedProduct('');
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="">Select a region...</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-select" className="block text-sm font-medium text-slate-700 mb-2">
            Filter by Product (Optional)
          </label>
          <select
            id="product-select"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="">All products in region</option>
            {productsInRegion.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sensitivity" className="block text-sm font-medium text-slate-700 mb-2">
            Sensitivity: {(sensitivity * 100).toFixed(0)}%
          </label>
          <input
            id="sensitivity"
            type="range"
            min="0.01"
            max="0.2"
            step="0.01"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-600">Scanning for anomalies...</p>
          </div>
        </div>
      )}

      {!loading && anomalies.length === 0 && !error && (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
          <p className="text-slate-700 font-medium">All systems normal</p>
          <p className="text-slate-600 text-sm">No anomalies detected in current data</p>
        </div>
      )}

      {!loading && anomalies.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 font-medium">
            Found {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
          </p>

          {anomalies.map((anomaly, idx) => {
            const severity = getAnomalySeverity(anomaly.anomaly_score);
            return (
              <div
                key={idx}
                className={`p-4 border-l-4 rounded-lg ${getSeverityColor(severity)} space-y-2`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getSeverityIcon(severity)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {anomaly.product_id} @ {anomaly.store_id}
                        </p>
                        <p className="text-sm text-slate-700 mt-1">{anomaly.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {(anomaly.anomaly_score * 100).toFixed(0)}%
                        </div>
                        <p className="text-xs text-slate-600">Anomaly Score</p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-white bg-opacity-60 rounded border border-current border-opacity-20">
                      <p className="text-sm font-medium text-slate-700">Recommended Action:</p>
                      <p className="text-sm text-slate-700 mt-1">{anomaly.recommended_action}</p>
                    </div>

                    {/* Anomaly score progress bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-white bg-opacity-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            severity === 'critical'
                              ? 'bg-red-600'
                              : severity === 'warning'
                              ? 'bg-yellow-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${anomaly.anomaly_score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
