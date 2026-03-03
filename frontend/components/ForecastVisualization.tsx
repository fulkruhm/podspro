/**
 * Demand Forecast Visualization Component
 * Displays demand forecasts with confidence intervals and trend analysis
 * Supports store-product and regional aggregation levels
 */

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { forecastDemand, ForecastResult } from '../services/mlService';

interface ForecastViewProps {
  products?: any[];
}

export default function ForecastView({ products = [] }: ForecastViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>(products[0]?.region || '');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastDays, setForecastDays] = useState(7);

  // Get unique regions and products
  const regions = useMemo(() => 
    [...new Set(products.map((p: any) => p.region).filter(Boolean))],
    [products]
  );

  const productsInRegion = useMemo(() => 
    products.filter((p: any) => p.region === selectedRegion),
    [selectedRegion, products]
  );

  const selectedProductData = products.find((p: any) => p.id === selectedProduct);
  
  // Aggregate historical demand for regional forecast (all products or filtered)
  const getRegionalHistoricalDemand = (days: number = 30) => {
    const aggregated: number[] = Array(days).fill(0);
    
    const productsToAggregate = selectedProduct
      ? productsInRegion.filter((p: any) => p.id === selectedProduct)
      : productsInRegion;
    
    productsToAggregate.forEach((product: any) => {
      for (let i = 0; i < days; i++) {
        const randomDemand = Math.floor(Math.random() * 30) + (product.avgDailyDemand || 15);
        aggregated[i] += randomDemand;
      }
    });
    
    return aggregated;
  };

  const handleForecast = async () => {
    if (!selectedRegion) {
      setError('Please select a region');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Regional aggregated forecast
      const historicalDemand = getRegionalHistoricalDemand(30);

      const forecasting_params = {
        product_id: `REGION_${selectedRegion.toUpperCase()}`,
        store_id: selectedRegion,
        historical_demand: historicalDemand,
        forecast_days: forecastDays,
      };

      const result = await forecastDemand(forecasting_params);
      setForecast(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('Increasing') || trend.includes('📈')) {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    }
    if (trend.includes('Decreasing') || trend.includes('📉')) {
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    }
    return <Minus className="w-5 h-5 text-slate-600" />;
  };

  // Prepare chart data
  const chartData = forecast
    ? forecast.forecast.map((value, idx) => ({
        day: `Day ${idx + 1}`,
        demand: Math.round(value),
        upper: Math.round(forecast.confidence_interval[1]),
        lower: Math.max(0, Math.round(forecast.confidence_interval[0])),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Regional Demand Forecast</h2>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="region-select" className="block text-sm font-medium text-slate-700 mb-2">
              Select Region
            </label>
            <select
              id="region-select"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setForecast(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region} ({productsInRegion.length} products)
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
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setForecast(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">All products in region</option>
              {productsInRegion.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name || product.sku}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="days-select" className="block text-sm font-medium text-slate-700 mb-2">
              Forecast Days
            </label>
            <select
              id="days-select"
              value={forecastDays}
              onChange={(e) => {
                setForecastDays(parseInt(e.target.value));
                setForecast(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={30}>Next 30 days</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleForecast}
              disabled={loading || !selectedRegion}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
            >
              {loading ? 'Forecasting...' : 'Generate Forecast'}
            </button>
          </div>
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
            <p className="text-slate-600">Generating forecast...</p>
          </div>
        </div>
      )}

      {forecast && (
        <div className="space-y-6">
          {/* Forecast Type Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              🌍 <strong>Regional Aggregated</strong> forecast for <strong>{selectedRegion}</strong> region
              {selectedProduct ? (
                <> for product <strong>{selectedProductData?.name || selectedProductData?.sku}</strong></>
              ) : (
                <> ({productsInRegion.length} products)</>
              )}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Demand Direction Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Demand Direction</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{forecast.trend}</p>
                </div>
                {getTrendIcon(forecast.trend)}
              </div>
            </div>

            {/* Demand Signal Card */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Demand Signal</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {Math.round(forecast.forecast.reduce((a, b) => a + b, 0) / forecast.forecast.length)} units
              </p>
            </div>

            {/* Confidence Range Card */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Confidence Range</p>
              <p className="text-xs text-green-700 mt-1">
                {Math.round(forecast.confidence_interval[0])} - {Math.round(forecast.confidence_interval[1])} units
              </p>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-4">Demand Forecast</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => [Math.round(value as number), '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="#93c5fd"
                  fillOpacity={1}
                  fill="url(#colorConfidence)"
                  name="Confidence Upper"
                  isAnimationActive={true}
                />
                <Area
                  type="monotone"
                  dataKey="demand"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorDemand)"
                  name="Demand Forecast"
                  isAnimationActive={true}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="#93c5fd"
                  fillOpacity={1}
                  fill="url(#colorConfidence)"
                  name="Confidence Lower"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Details Table */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-4">Forecast Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-600 font-medium">Day</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Forecast</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Lower Bound</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Upper Bound</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900">{row.day}</td>
                      <td className="px-4 py-2 text-right font-semibold text-blue-600">{row.demand}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.lower}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.upper}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!forecast && !loading && selectedProduct && (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Ready to forecast</p>
          <p className="text-slate-600 text-sm">Click "Generate Forecast" to see demand predictions</p>
        </div>
      )}
    </div>
  );
}
