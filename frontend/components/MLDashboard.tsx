/**
 * ML Insights Dashboard
 * Real-time display of anomalies, forecasts, and ML service status
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Brain, AlertCircle } from 'lucide-react';
import AnomalyVisualization from './AnomalyVisualization';
import ForecastVisualization from './ForecastVisualization';
import { checkMLHealth, MLServiceHealth } from '../services/mlService';

interface MLDashboardProps {
  products?: any[];
  routes?: any[];
}

export default function MLDashboard({ products = [], routes = [] }: MLDashboardProps) {
  const [activeTab, setActiveTab] = useState<'anomalies' | 'forecasts' | 'status'>('anomalies');
  const [mlHealth, setMLHealth] = useState<MLServiceHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Check ML service health on mount and periodically if auto-refresh is enabled
  useEffect(() => {
    checkHealth();

    if (autoRefresh) {
      const interval = setInterval(() => {
        checkHealth();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const health = await checkMLHealth();
      setMLHealth(health);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to check ML health:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const isMLServiceHealthy = mlHealth?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">🌍 Regional Analytics</h1>
          <p className="text-slate-600 mt-1">Monitor anomalies and forecasts across multiple stores in a region. Optimize network-wide inventory decisions.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkHealth}
            disabled={healthLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh health status"
          >
            <RefreshCw className={`w-5 h-5 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-600">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* ML Service Status Card */}
      <div
        className={`p-4 rounded-lg border-l-4 ${
          isMLServiceHealthy
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className={`w-5 h-5 ${isMLServiceHealthy ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="font-semibold text-slate-900">ML Service Status</p>
              <p className={`text-sm ${isMLServiceHealthy ? 'text-green-700' : 'text-red-700'}`}>
                {isMLServiceHealthy ? 'Service Online' : 'Service Offline'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600">
            <p>Last Update:</p>
            <p>{lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>

        {mlHealth && isMLServiceHealthy && (
          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-sm text-slate-700 space-y-1">
            <p>
              <strong>Service:</strong> {mlHealth.mlService.service}
            </p>
            <p>
              <strong>Capabilities:</strong> Anomaly Detection, Demand Forecasting, Batch Analysis
            </p>
          </div>
        )}

        {!isMLServiceHealthy && (
          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-sm text-red-700">
            <p>
              ⚠️ ML service is unavailable. Some features may not work as expected. Please check the
              service logs.
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'anomalies' as const, label: 'Anomaly Detection', icon: AlertCircle },
          { id: 'forecasts' as const, label: 'Demand Forecasting', icon: Brain },
          { id: 'status' as const, label: 'Service Status', icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 font-medium flex items-center gap-2 transition-all border-b-2 ${
              activeTab === id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {activeTab === 'anomalies' && (
          <AnomalyVisualization products={products} routes={routes} />
        )}

        {activeTab === 'forecasts' && <ForecastVisualization products={products} />}

        {activeTab === 'status' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Service Information</h2>

              {mlHealth && isMLServiceHealthy ? (
                <div className="space-y-4">
                  {/* Service Details */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-2">ML Service Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Service Name:</dt>
                        <dd className="font-medium text-slate-900">{mlHealth.mlService.service}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Status:</dt>
                        <dd className="font-medium text-green-600">✓ Healthy</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Last Checked:</dt>
                        <dd className="font-medium text-slate-900">{lastUpdate.toLocaleTimeString()}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Capabilities */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Available Capabilities</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <div>
                          <p className="font-medium text-slate-900">Anomaly Detection</p>
                          <p className="text-xs text-slate-600">Isolation Forest algorithm</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <div>
                          <p className="font-medium text-slate-900">Demand Forecasting</p>
                          <p className="text-xs text-slate-600">Exponential smoothing with confidence intervals</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <div>
                          <p className="font-medium text-slate-900">Batch Analysis</p>
                          <p className="text-xs text-slate-600">Run multiple analyses in single request</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Tech Stack */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Technology Stack</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">Framework</p>
                        <p className="text-slate-600">FastAPI (Python)</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">ML Libraries</p>
                        <p className="text-slate-600">scikit-learn, pandas, numpy</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">Container</p>
                        <p className="text-slate-600">Docker (Python 3.11)</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">Port</p>
                        <p className="text-slate-600">5001 (external)</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <p className="text-red-900 font-medium mb-2">ML Service Unavailable</p>
                  <p className="text-red-700 text-sm mb-4">
                    Cannot connect to the ML service. Please check that all containers are running.
                  </p>
                  <button
                    onClick={checkHealth}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Use the Anomaly Detection tab to identify operational issues, Demand
          Forecasting tab to plan inventory, and Service Status tab to monitor ML service health.
        </p>
      </div>
    </div>
  );
}
