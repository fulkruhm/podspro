
import React from 'react';
import { User } from './types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const allItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'store_user', 'logistics_user', 'sysadmin'] },
    { id: 'usermanagement', label: 'User Management', icon: '👥', roles: ['sysadmin'] },
    { id: 'inventory', label: 'Inventory Engine', icon: '📦', roles: ['admin', 'store_user', 'sysadmin'] },
    { id: 'logistics', label: 'Logistics Engine', icon: '🚛', roles: ['admin', 'logistics_user', 'sysadmin'] },
    { id: 'assistant', label: 'AI Advisor', icon: '🤖', roles: ['admin', 'store_user', 'logistics_user', 'sysadmin'] },
    { id: 'profile', label: 'User Profile', icon: '👤', roles: ['admin', 'store_user', 'logistics_user', 'sysadmin'] },
  ];

  const menuItems = allItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="flex flex-col h-full text-white bg-slate-900 overflow-hidden">
      <div className="p-8 border-b border-slate-800/50">
        <h1 className="text-2xl font-black tracking-tighter text-blue-400 flex items-center">
          PODS
          <span className="ml-2 px-1.5 py-0.5 bg-blue-600/10 text-blue-400 text-[8px] border border-blue-400/20 rounded font-black tracking-widest">PRO</span>
        </h1>
        <div className="h-1 w-8 bg-blue-600 rounded-full mt-1"></div>
      </div>
      
      {/* Profile Info Block with Details */}
      <button 
        onClick={() => setActiveTab('profile')}
        className={`mx-4 my-6 p-4 rounded-2xl border transition-all text-left group overflow-hidden ${
          activeTab === 'profile' 
          ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/40' 
          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
        }`}
      >
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black shadow-lg transition-transform group-hover:scale-105 ${
              activeTab === 'profile' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white shadow-blue-900/40'
            }`}>
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-slate-100">{user.name}</p>
              <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${
                activeTab === 'profile' ? 'text-blue-100' : 'text-blue-400'
              }`}>
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          
          <div className={`space-y-1 pt-3 border-t ${
            activeTab === 'profile' ? 'border-blue-500/50' : 'border-slate-700/50'
          }`}>
            <div className="flex items-center text-[10px] text-slate-400 font-medium">
              <span className="w-4">📧</span>
              <span className={`truncate ${activeTab === 'profile' ? 'text-blue-50' : 'text-slate-400'}`}>
                {user.email || 'no-email@pods.ai'}
              </span>
            </div>
            <div className="flex items-center text-[10px] text-slate-400 font-medium">
              <span className="w-4">📱</span>
              <span className={`truncate ${activeTab === 'profile' ? 'text-blue-50' : 'text-slate-400'}`}>
                {user.phoneNumber || 'N/A'}
              </span>
            </div>
            <div className="flex items-center text-[10px] text-slate-400 font-medium">
              <span className="w-4">🆔</span>
              <span className={`truncate italic ${activeTab === 'profile' ? 'text-blue-50' : 'text-slate-500'}`}>
                @{user.username}
              </span>
            </div>
          </div>
        </div>
      </button>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.filter(item => item.id !== 'profile').map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-4 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 translate-x-1' 
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-md">
        <button 
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
