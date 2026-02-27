
import React from 'react';
import { Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { detectInventoryAnomalies, InventoryAnomaly } from '../services/anomalyService';

interface InventoryViewProps {
  triggerQuery: (query: string) => void;
  products: Product[];
  onClose: () => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ triggerQuery, products, onClose }) => {
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<Product['status'] | 'all'>('all');
  const [anomalies, setAnomalies] = React.useState<InventoryAnomaly[]>([]);
  const [isDetecting, setIsDetecting] = React.useState(false);

  const filteredProducts = statusFilter === 'all' 
    ? products 
    : products.filter(p => p.status.toLowerCase() === statusFilter.toLowerCase());

  const handleDetectAnomalies = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectInventoryAnomalies(products);
      setAnomalies(detected);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDetecting(false);
    }
  };

  React.useEffect(() => {
    // Auto-detect on mount if products exist
    if (products.length > 0 && anomalies.length === 0) {
      handleDetectAnomalies();
    }
  }, [products]);

  const handleExportCSV = () => {
    const dataToExport = filteredProducts;
    if (dataToExport.length === 0) return;

    const headers = ['ID', 'Name', 'Store', 'Department', 'Current Stock', 'Reorder Point', 'Avg Daily Demand', 'Status', 'Price'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(p => [
        p.id,
        `"${p.name}"`,
        `"${p.store}"`,
        `"${p.department}"`,
        p.currentStock,
        p.reorderPoint,
        p.avgDailyDemand,
        p.status,
        p.price
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pods_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'optimal': return 'text-green-600 bg-green-50 border-green-200';
      case 'low': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'excess': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const chartData = products.map(p => ({
    name: p.name.split(' ')[0],
    Stock: p.currentStock,
    ROP: p.reorderPoint,
    Safety: p.safetyStock
  }));

  const calculateForecast = (product: Product) => {
    const historical = product.historicalDemand || Array(14).fill(product.avgDailyDemand);
    const last7 = historical.slice(-7);
    const avg = last7.reduce((a, b) => a + b, 0) / 7;
    
    // Simple linear regression or trend detection
    const firstHalf = last7.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = last7.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const trend = (secondHalf - firstHalf) / 3;

    return Array(7).fill(0).map((_, i) => {
      const day = i + 1;
      const base = avg + (trend * day);
      const seasonality = 1 + (Math.sin(day * 0.5) * 0.1); // Mock seasonality
      return Math.max(0, Math.round(base * seasonality));
    });
  };

  const getForecastData = (product: Product) => {
    const historical = product.historicalDemand || Array(14).fill(product.avgDailyDemand);
    const forecast = calculateForecast(product);
    
    const combined = [
      ...historical.map((v, i) => ({ day: `Day -${14-i}`, demand: v, type: 'Historical' })),
      ...forecast.map((v, i) => ({ day: `Day +${i+1}`, demand: v, type: 'Forecast' }))
    ];
    return combined;
  };

  const optimalCount = products.filter(p => p.status.toLowerCase() === 'optimal').length;
  const lowCount = products.filter(p => p.status.toLowerCase() === 'low').length;
  const criticalCount = products.filter(p => p.status.toLowerCase() === 'critical').length;
  const excessCount = products.filter(p => p.status.toLowerCase() === 'excess').length;

  const getStatusInsights = () => {
    const insights = [];
    if (criticalCount > 0) {
      insights.push({
        title: 'Critical Stockout Risk',
        desc: `${criticalCount} SKUs are below safety levels. Immediate replenishment required.`,
        icon: '🚨',
        color: 'text-red-700 bg-red-50 border-red-100'
      });
    }
    if (lowCount > 0) {
      insights.push({
        title: 'Low Inventory Alert',
        desc: `${lowCount} items have triggered reorder points. Reviewing lead times recommended.`,
        icon: '⚠️',
        color: 'text-amber-700 bg-amber-50 border-amber-100'
      });
    }
    if (products.some(p => p.status === 'excess')) {
      const excessCount = products.filter(p => p.status === 'excess').length;
      insights.push({
        title: 'Capital Optimization',
        desc: `${excessCount} SKUs show excess stock. Consider promotional markdowns to free capital.`,
        icon: '💰',
        color: 'text-blue-700 bg-blue-50 border-blue-100'
      });
    }
    return insights;
  };

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pr-10 sm:pr-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Inventory Optimization</h2>
          <p className="text-sm text-slate-500">Dynamic Order Point & AI-Driven Demand Forecasting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button 
            onClick={handleDetectAnomalies}
            disabled={isDetecting}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-bold transition text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center ${
              isDetecting ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${isDetecting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isDetecting ? 'Scan' : 'AI Scan'}
          </button>
          <button 
            onClick={() => triggerQuery("Run a full portfolio analysis and provide an optimization report for my SKUs")}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-md text-[10px] sm:text-xs flex items-center justify-center"
          >
            Run Analysis
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors hidden sm:block"
            title="Back to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* AI Anomaly Detection - New Section */}
      {anomalies.length > 0 && (
        <div className="bg-indigo-900 text-white p-4 md:p-6 rounded-2xl shadow-xl border border-indigo-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-indigo-500 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest">AI Anomaly Intelligence</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.map((anomaly, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    const product = products.find(p => p.id === anomaly.productId);
                    if (product) setSelectedProduct(product);
                  }}
                  className="bg-indigo-800/50 backdrop-blur-sm border border-indigo-500/30 p-4 rounded-xl hover:bg-indigo-800 transition cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      anomaly.severity === 'high' ? 'bg-red-500 text-white' : 
                      anomaly.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      {anomaly.severity} Priority
                    </span>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{anomaly.type.replace('_', ' ')}</div>
                      <div className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter mt-0.5">{anomaly.storeName}</div>
                    </div>
                  </div>
                  <div className="text-sm font-black mb-1 group-hover:text-indigo-200 transition">{anomaly.productName}</div>
                  <div className="text-[11px] text-indigo-100/80 leading-relaxed mb-3">{anomaly.description}</div>
                  <div className="pt-3 border-t border-indigo-500/30">
                    <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Recommendation</div>
                    <div className="text-[10px] font-medium text-emerald-300 italic">{anomaly.recommendation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Insights - New Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {getStatusInsights().map((insight, idx) => (
          <div key={idx} className={`p-3 rounded-xl border flex items-start space-x-3 ${insight.color}`}>
            <span className="text-lg mt-0.5">{insight.icon}</span>
            <div>
              <div className="text-[11px] font-black uppercase tracking-tight">{insight.title}</div>
              <div className="text-[10px] font-medium opacity-90 mt-0.5 leading-tight">{insight.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base md:text-lg font-semibold">
              {selectedProduct ? `Demand Forecast: ${selectedProduct.name}` : 'Stock vs. ROP Portfolio'}
            </h3>
            {selectedProduct && (
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Back to Portfolio
              </button>
            )}
          </div>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {selectedProduct ? (
                <AreaChart data={getForecastData(selectedProduct)}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} interval={selectedProduct ? 2 : 0} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="demand" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDemand)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Stock" fill="#3b82f6" />
                  <Bar dataKey="ROP" fill="#f59e0b" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base md:text-lg font-semibold">Portfolio Health</h3>
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 md:space-y-3">
            <div 
              onClick={() => setStatusFilter(statusFilter === 'optimal' ? 'all' : 'optimal')}
              className={`flex flex-col sm:flex-row justify-between items-center p-2 md:p-2.5 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'optimal' ? 'bg-green-600 text-white scale-105 shadow-md' : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <span className={`text-[10px] md:text-sm font-medium ${statusFilter === 'optimal' ? 'text-white' : 'text-green-700'}`}>Optimal</span>
              <span className={`text-sm md:text-lg font-bold ${statusFilter === 'optimal' ? 'text-white' : 'text-green-800'}`}>{optimalCount}</span>
            </div>
            <div 
              onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
              className={`flex flex-col sm:flex-row justify-between items-center p-2 md:p-2.5 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'low' ? 'bg-amber-500 text-white scale-105 shadow-md' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span className={`text-[10px] md:text-sm font-medium ${statusFilter === 'low' ? 'text-white' : 'text-amber-700'}`}>Low</span>
              <span className={`text-sm md:text-lg font-bold ${statusFilter === 'low' ? 'text-white' : 'text-amber-800'}`}>{lowCount}</span>
            </div>
            <div 
              onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
              className={`flex flex-col sm:flex-row justify-between items-center p-2 md:p-2.5 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'critical' ? 'bg-red-600 text-white scale-105 shadow-md' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className={`text-[10px] md:text-sm font-medium ${statusFilter === 'critical' ? 'text-white' : 'text-red-700'}`}>Risk</span>
              <span className={`text-sm md:text-lg font-bold ${statusFilter === 'critical' ? 'text-white' : 'text-red-800'}`}>{criticalCount}</span>
            </div>
            <div 
              onClick={() => setStatusFilter(statusFilter === 'excess' ? 'all' : 'excess')}
              className={`flex flex-col sm:flex-row justify-between items-center p-2 md:p-2.5 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'excess' ? 'bg-blue-600 text-white scale-105 shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <span className={`text-[10px] md:text-sm font-medium ${statusFilter === 'excess' ? 'text-white' : 'text-blue-700'}`}>Excess</span>
              <span className={`text-sm md:text-lg font-bold ${statusFilter === 'excess' ? 'text-white' : 'text-blue-800'}`}>{excessCount}</span>
            </div>
          </div>
          <p className="mt-4 md:mt-6 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
            {statusFilter === 'all' ? 'LIVE ANALYSIS' : `FILTERING: ${statusFilter.toUpperCase()}`}
          </p>
        </div>
      </div>

      {/* Mobile "Side Ways" Product Cards */}
      <div className="block sm:hidden overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
        <div className="flex space-x-4 w-max">
          {filteredProducts.map((product) => {
            const forecast = calculateForecast(product);
            const totalForecast = forecast.reduce((a, b) => a + b, 0);
            const isAtRisk = totalForecast > product.currentStock;

            return (
              <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className={`w-64 flex-shrink-0 bg-white p-5 rounded-2xl border transition-all ${
                  selectedProduct?.id === product.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-widest ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">#{product.id}</span>
                </div>
                <div className="text-sm font-black text-slate-900 mb-1 truncate">{product.name}</div>
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">{product.store}</div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stock</div>
                    <div className="text-sm font-black text-slate-900">{product.currentStock}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">7D Demand</div>
                    <div className={`text-sm font-black ${isAtRisk ? 'text-red-600' : 'text-slate-900'}`}>{totalForecast}</div>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerQuery(`Optimize inventory levels for ${product.name} at ${product.store} based on the 7-day demand forecast of ${totalForecast} units.`);
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition active:scale-95"
                >
                  Optimize Node
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600">Product Details</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600">Stock</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600">7-Day Forecast</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600">Status</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const forecast = calculateForecast(product);
                const totalForecast = forecast.reduce((a, b) => a + b, 0);
                const isAtRisk = totalForecast > product.currentStock;

                return (
                  <tr key={product.id} className={`hover:bg-slate-50 transition cursor-pointer ${selectedProduct?.id === product.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedProduct(product)}>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{product.name}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tight">
                          {product.store}
                        </span>
                        <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">
                          {product.department}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-600">{product.currentStock}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs md:text-sm font-bold ${isAtRisk ? 'text-red-600' : 'text-slate-900'}`}>{totalForecast} units</span>
                        <span className="text-[10px] text-slate-400 font-medium">Next 7 Days</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(product.status)}`}>
                        {product.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerQuery(`Optimize inventory levels for ${product.name} at ${product.store} based on the 7-day demand forecast of ${totalForecast} units.`);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs md:text-sm"
                      >
                        Optimize
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
