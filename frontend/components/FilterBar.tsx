
import React, { useState } from 'react';
import { Product, Filters } from '../types';

interface FilterBarProps {
  products: Product[];
  filteredCount: number;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  isStoreFixed?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ products, filteredCount, filters, setFilters, isStoreFixed }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const regions = Array.from(new Set(products.map(p => p.region))).sort();
  const productsForStores = filters.region
    ? products.filter(p => p.region === filters.region)
    : products;
  const stores = Array.from(new Set(productsForStores.map(p => p.store))).sort();

  const productsForDepartments = products.filter(p => {
    if (filters.region && p.region !== filters.region) return false;
    if (filters.store && p.store !== filters.store) return false;
    return true;
  });
  const departments = Array.from(new Set(productsForDepartments.map(p => p.department))).sort();

  const productsForProductFilter = products.filter(p => {
    if (filters.region && p.region !== filters.region) return false;
    if (filters.store && p.store !== filters.store) return false;
    if (filters.department && p.department !== filters.department) return false;
    return true;
  });
  const productOptions = Array.from(
    new Map(productsForProductFilter.map(p => [p.id, p.name])).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedProductName = filters.product
    ? productOptions.find(p => p.id === filters.product)?.name || ''
    : '';
  const statuses = ['optimal', 'low', 'excess', 'critical'];

  const handleFilterChange = (key: keyof Filters, value: string) => {
    if (key === 'region') {
      setFilters({ ...filters, region: value, store: '', department: '', product: '' });
      return;
    }

    if (key === 'store') {
      setFilters({ ...filters, store: value, department: '', product: '' });
      return;
    }

    if (key === 'department') {
      setFilters({ ...filters, department: value, product: '' });
      return;
    }

    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({ 
      region: filters.region, // Keep region/store if it was assigned? 
      store: isStoreFixed ? filters.store : '', 
      department: '', 
      product: '',
      status: '' 
    });
  };

  const isFiltered = filters.region || filters.store || filters.department || filters.product || filters.status;

  // Generate a summary string for the condensed view
  const getSummary = () => {
    const parts = [];
    if (filters.region) parts.push(filters.region);
    if (filters.store) parts.push(filters.store);
    if (filters.department) parts.push(filters.department);
    if (selectedProductName) parts.push(selectedProductName);
    if (filters.status) parts.push(filters.status.charAt(0).toUpperCase() + filters.status.slice(1));
    
    if (parts.length === 0) return "Global Portfolio";
    return parts.join(' • ');
  };

  return (
    <div className={`bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl mb-6 shadow-sm sticky top-0 z-30 transition-all duration-300 ease-in-out ${isExpanded ? 'p-4' : 'p-2 px-4'}`}>
      <div className="flex flex-col gap-3">
        {/* Header / Condensed Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            
            {!isExpanded && (
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
                  {filteredCount} Items
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {getSummary()}
                </span>
              </div>
            )}
            
            {isExpanded && (
               <span className="text-sm font-bold text-slate-800">Operational Data Filters</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isFiltered && !isStoreFixed && (
              <button 
                onClick={clearFilters}
                className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
              >
                Clear
              </button>
            )}
            {!isExpanded && isFiltered && (
              <div className="hidden md:flex space-x-1">
                {filters.region && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">{filters.region}</span>}
                {filters.store && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-100 truncate max-w-[160px]">{filters.store}</span>}
                {filters.department && <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-violet-100">{filters.department}</span>}
                {selectedProductName && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100 truncate max-w-[180px]">{selectedProductName}</span>}
                {filters.status && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100">{filters.status}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Grid */}
        {isExpanded && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Region</label>
              <select 
                disabled={isStoreFixed}
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
              >
                <option value="">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Store</label>
              <select 
                disabled={isStoreFixed}
                value={filters.store}
                onChange={(e) => handleFilterChange('store', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-blue-50 disabled:border-blue-100 disabled:text-blue-800"
              >
                <option value="">All Stores</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Dept.</label>
              <select 
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Product</label>
              <select 
                value={filters.product}
                onChange={(e) => handleFilterChange('product', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="">All Products</option>
                {productOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
