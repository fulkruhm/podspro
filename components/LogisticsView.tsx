
import React from 'react';
import { FreightRoute } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LogisticsViewProps {
  triggerQuery: (query: string) => void;
  routes: FreightRoute[];
  onClose: () => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ triggerQuery, routes, onClose }) => {
  const [selectedRouteId, setSelectedRouteId] = React.useState<string>(routes[0]?.id || '');

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  const trendData = selectedRoute?.historicalRates?.map(hr => ({
    name: new Date(hr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rate: hr.rate
  })) || [];

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pr-12 sm:pr-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Logistics & Freight Engine</h2>
          <p className="text-sm text-slate-500">Predictive Market Intelligence & Rate Optimization</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => triggerQuery("Provide a comprehensive freight market intelligence report")}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-md text-sm"
          >
            Market Intel
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold">
              Rate Trend: {selectedRoute ? `${selectedRoute.origin.split(',')[0]} → ${selectedRoute.destination.split(',')[0]}` : 'Market Avg'}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3 Month History</span>
          </div>
          <div className="h-56 md:h-64 flex items-center justify-center">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={9} 
                    tick={{ fill: '#94a3b8' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    fontSize={9} 
                    tick={{ fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Trend Data Available</div>
                <div className="text-[10px] text-slate-300 mt-1">Historical rate data is still being indexed...</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-base md:text-lg font-semibold mb-4">Risk Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-start p-3 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition"
                 onClick={() => triggerQuery("Detail the weather disruption in the Midwest and its impact on freight")}>
              <div className="text-xl mr-3 flex-shrink-0">⛈️</div>
              <div>
                <h4 className="font-bold text-red-800 text-xs md:text-sm">Weather Alert</h4>
                <p className="text-[10px] md:text-xs text-red-700 line-clamp-2">Expect 15-20% capacity reduction in active corridors for the next 72 hours.</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition"
                 onClick={() => triggerQuery("Explain the fuel price spike impact on rates")}>
              <div className="text-xl mr-3 flex-shrink-0">⛽</div>
              <div>
                <h4 className="font-bold text-amber-800 text-xs md:text-sm">Fuel Surcharge Prediction</h4>
                <p className="text-[10px] md:text-xs text-amber-700 line-clamp-2">Surge of 8% in fuel index expected to impact shipping costs next cycle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {routes.map((route) => (
          <div 
            key={route.id} 
            onClick={() => setSelectedRouteId(route.id)}
            className={`bg-white p-4 md:p-5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
              selectedRouteId === route.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' : 'border-slate-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Lane</div>
              <span className={`px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold uppercase ${
                route.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {route.riskLevel} Risk
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs md:text-sm font-bold text-slate-800">{route.origin.split(',')[0]}</div>
              <div className="text-slate-300 mx-1">→</div>
              <div className="text-xs md:text-sm font-bold text-slate-800">{route.destination.split(',')[0]}</div>
            </div>
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
              <div>
                <div className="text-[10px] text-slate-500">Spot Rate</div>
                <div className="text-lg md:text-xl font-bold text-slate-900">${route.currentRate.toFixed(2)}/mi</div>
              </div>
              <div className={`text-[10px] md:text-sm font-semibold flex items-center ${route.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                {route.trend === 'up' ? '▲' : '▼'} {route.trend.toUpperCase()}
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                triggerQuery(`Analyze the route from ${route.origin} to ${route.destination}`);
              }}
              className="w-full mt-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition"
            >
              Deep Analysis
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogisticsView;
