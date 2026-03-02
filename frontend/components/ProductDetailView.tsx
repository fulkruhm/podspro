
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Zap
} from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  triggerQuery: (query: string) => void;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({ product, onClose, triggerQuery, onUpdateProduct }) => {
  const [ropValue, setRopValue] = useState(product.reorderPoint);
  const [safetyStockValue, setSafetyStockValue] = useState(product.safetyStock);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync local state when product prop changes
  useEffect(() => {
    setRopValue(product.reorderPoint);
    setSafetyStockValue(product.safetyStock);
  }, [product.id, product.reorderPoint, product.safetyStock]);

  // Simulated AI Suggestions
  const aiSuggestedROP = Math.round(product.reorderPoint * 1.15);
  const aiSuggestedSafetyStock = Math.round(product.safetyStock * 1.08);

  // Use a fixed reference date for consistency in the demo
  const today = new Date(2026, 1, 28); // Feb 28, 2026
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const historyCount = 7;
  const forecastCount = 7;

  const rawHistory = [...(product.historicalDemand || [])];
  while (rawHistory.length < historyCount) rawHistory.unshift(product.avgDailyDemand);
  const finalHistory = rawHistory.slice(-historyCount);

  const rawForecast = [...(product.forecastedDemand || [])];
  while (rawForecast.length < forecastCount) rawForecast.push(product.avgDailyDemand);
  const finalForecast = rawForecast.slice(0, forecastCount);

  const historicalData = finalHistory.map((demand, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (historyCount - 1 - index));
    return { date: formatDate(date), demand };
  });

  const forecastData = finalForecast.map((forecast, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      date: formatDate(date),
      forecast: index === 0 ? historicalData[historicalData.length - 1].demand : forecast
    };
  });

  const dataMap = new Map<string, { date: string, demand?: number, forecast?: number }>();
  historicalData.forEach(d => dataMap.set(d.date, { date: d.date, demand: d.demand }));
  forecastData.forEach(d => {
    const existing = dataMap.get(d.date);
    if (existing) existing.forecast = d.forecast;
    else dataMap.set(d.date, { date: d.date, forecast: d.forecast });
  });

  const combinedData = Array.from(dataMap.values());

  const handleAction = (msg: string, updates?: Partial<Product>) => {
    setIsUpdating(true);
    if (updates) {
      onUpdateProduct(product.id, updates);
    }
    setTimeout(() => {
      setIsUpdating(false);
      setActionFeedback(msg);
      setTimeout(() => setActionFeedback(null), 3000);
    }, 800);
  };

  const applyAISuggestion = (type: 'rop' | 'safety') => {
    const newVal = type === 'rop' ? aiSuggestedROP : aiSuggestedSafetyStock;
    if (type === 'rop') {
      setRopValue(newVal);
      handleAction(`AI optimization applied to Reorder Point`, { reorderPoint: newVal });
    } else {
      setSafetyStockValue(newVal);
      handleAction(`AI optimization applied to Safety Stock`, { safetyStock: newVal });
    }
  };

  const handleUpdateROP = () => {
    handleAction("Reorder Point updated", { reorderPoint: ropValue });
  };

  const handleUpdateSafetyStock = () => {
    handleAction("Safety Stock updated", { safetyStock: safetyStockValue });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-10"
    >
      <header className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowRight className="h-6 w-6 text-slate-500 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500">{product.store} • {product.department} • {product.category}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => triggerQuery(`Analyze the performance and stock levels for ${product.name} at ${product.store}`)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm text-sm flex items-center"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Deep Dive
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Analyst Action Center */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-slate-900 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                Analyst Action Center
              </h3>
              <AnimatePresence>
                {actionFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {actionFeedback}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Reorder */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Replenishment</p>
              <button 
                onClick={() => handleAction("Replenishment order triggered successfully")}
                disabled={isUpdating}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                Trigger Manual Reorder
              </button>
            </div>

            {/* Reorder Point Update */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reorder Point (ROP)</p>
                <button 
                  onClick={() => applyAISuggestion('rop')}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  AI Suggest: {aiSuggestedROP}
                </button>
              </div>
              <div className="flex space-x-2">
                <input 
                  type="number" 
                  value={ropValue}
                  onChange={(e) => setRopValue(parseInt(e.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleUpdateROP}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Safety Stock Update */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safety Stock</p>
                <button 
                  onClick={() => applyAISuggestion('safety')}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  AI Suggest: {aiSuggestedSafetyStock}
                </button>
              </div>
              <div className="flex space-x-2">
                <input 
                  type="number" 
                  value={safetyStockValue}
                  onChange={(e) => setSafetyStockValue(parseInt(e.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleUpdateSafetyStock}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Markdown Trigger */}
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Inventory Optimization</p>
              <button 
                onClick={() => handleAction("Markdown strategy initiated")}
                className="w-full border border-amber-200 bg-amber-50 text-amber-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-amber-100 transition"
              >
                <Tag className="w-4 h-4 mr-2" />
                Trigger Markdown/Promotion
              </button>
              <p className="text-[9px] text-slate-400 mt-2 text-center italic">Recommended for slow-moving stock with high shrink risk</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Inventory Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
                <p className="text-xl font-bold text-slate-900">{product.currentStock}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                  product.status === 'optimal' ? 'bg-green-100 text-green-700' :
                  product.status === 'low' ? 'bg-amber-100 text-amber-700' :
                  product.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Restock</p>
              <p className="text-sm font-medium text-slate-600">{product.lastRestockDate || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Charts and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales & Forecast Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900">Demand History & Forecast</h3>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">History</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Forecast</span>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedData}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10} 
                    tick={{ fill: '#94a3b8' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    fontSize={10} 
                    tick={{ fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="demand" 
                    name="Historical Demand"
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorDemand)" 
                    strokeWidth={3}
                    connectNulls
                  />
                  <Area 
                    type="monotone" 
                    dataKey="forecast" 
                    name="Forecasted Demand"
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorForecast)" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Analyst Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Loss & Efficiency</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Shrink Rate</span>
                  <span className="text-sm font-bold text-red-600">{product.shrinkRate || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (product.shrinkRate || 0) * 10)}%` }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Markdown Rate</span>
                  <span className="text-sm font-bold text-amber-600">{product.markdownRate || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (product.markdownRate || 0) * 5)}%` }}></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">OOS Days (Last 30)</span>
                  <span className="text-sm font-bold text-slate-900">{product.oosDays || 0} Days</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Performance Attributes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turnover</p>
                  <p className="text-lg font-bold text-slate-900">{product.turnoverRate || 'N/A'}x</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Demand</p>
                  <p className="text-lg font-bold text-slate-900">{product.avgDailyDemand}/day</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Time</p>
                  <p className="text-lg font-bold text-slate-900">{product.leadTime} Days</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price</p>
                  <p className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Glossary */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
              Analyst Metric Glossary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Shrink Rate</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Percentage of inventory lost due to theft, damage, spoilage, or administrative errors. High rates in Produce/Dairy often indicate cold chain issues.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Markdown Rate</h4>
                <p className="text-xs text-slate-500 leading-relaxed">The percentage of stock sold at a discount. High markdown rates suggest over-ordering or poor demand forecasting for perishable goods.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">OOS Days</h4>
                <p className="text-xs text-slate-500 leading-relaxed">"Out of Stock" days in the last 30-day window. Directly correlates to lost revenue and potential customer churn to competitors.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Turnover Rate</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Calculated as (Cost of Goods Sold / Average Inventory). Measures how efficiently stock is moving through the node.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Lead Time</h4>
                <p className="text-xs text-slate-500 leading-relaxed">The duration between placing a replenishment order and the stock becoming available for sale. Critical for ROP calculations.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Safety Stock</h4>
                <p className="text-xs text-slate-500 leading-relaxed">The "buffer" inventory held to protect against demand spikes or supply delays. Optimized based on service level targets (e.g., 98%).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductDetailView;
