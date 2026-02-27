
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import LogisticsView from './components/LogisticsView';
import AssistantView from './components/AssistantView';
import ProfileView from './components/ProfileView';
import UserManagementView from './components/UserManagementView';
import Onboarding from './components/Onboarding';
import FilterBar from './components/FilterBar';
import LoginView, { INITIAL_USERS } from './components/LoginView';
import { MOCK_PRODUCTS, MOCK_ROUTES } from './constants';
import { fetchRealtimeData } from './services/geminiService';
import { Product, FreightRoute, Filters, User, AuditLog } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemUsers, setSystemUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('pods_system_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('pods_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [routes, setRoutes] = useState<FreightRoute[]>(MOCK_ROUTES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Persist system users whenever they change
  useEffect(() => {
    localStorage.setItem('pods_system_users', JSON.stringify(systemUsers));
  }, [systemUsers]);

  // Persist audit logs whenever they change
  useEffect(() => {
    localStorage.setItem('pods_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Multi-store filter state
  const [filters, setFilters] = useState<Filters>({
    region: '',
    store: '',
    department: '',
    status: ''
  });

  // Handle auto-filtering for store users
  useEffect(() => {
    if (currentUser?.role === 'store_user' && currentUser.assignedStore) {
      setFilters(prev => ({ ...prev, store: currentUser.assignedStore || '' }));
    } else if (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') {
      setFilters({ region: '', store: '', department: '', status: '' });
    }
  }, [currentUser]);

  // Auth persistence
  useEffect(() => {
    const savedUserStr = localStorage.getItem('pods_current_user');
    if (savedUserStr) {
      try {
        const savedUser: User = JSON.parse(savedUserStr);
        // Sync current user with latest system user data
        const latest = systemUsers.find(u => u.id === savedUser.id);
        if (latest) {
          if (latest.status !== 'active' && latest.role !== 'sysadmin') {
            handleLogout();
          } else if (latest.isLocked) {
             handleLogout();
          } else {
            setCurrentUser(latest);
          }
        }
      } catch (e) {
        localStorage.removeItem('pods_current_user');
      }
    }
  }, [systemUsers]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pods_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pods_current_user');
    setActiveTab('dashboard');
  };

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    setSystemUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert("Safety Protocol: You cannot delete your own active session.");
      return;
    }
    setSystemUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      failedLoginAttempts: 0,
      isLocked: false,
    };
    setSystemUsers(prev => [...prev, newUser]);
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    handleUpdateUser(currentUser.id, updates);
  };

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `log_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 500)); // Keep last 500 logs
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (currentUser?.role === 'store_user' && p.store !== currentUser.assignedStore) return false;
      if (filters.region && p.region !== filters.region) return false;
      if (filters.store && p.store !== filters.store) return false;
      if (filters.department && p.department !== filters.department) return false;
      if (filters.status && p.status.toLowerCase() !== filters.status.toLowerCase()) return false;
      return true;
    });
  }, [products, filters, currentUser]);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('pods_onboarding_seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('pods_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    const data = await fetchRealtimeData();
    if (data) {
      setProducts(data.products);
      setRoutes(data.routes);
      setLastUpdated(Date.now());
    }
    setIsRefreshing(false);
  };

  const triggerAssistantQuery = (query: string) => {
    setPendingQuery(query);
    setActiveTab('assistant');
    setIsMobileMenuOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const goBackToDashboard = () => setActiveTab('dashboard');

  if (!currentUser) {
    return (
      <LoginView 
        onLogin={handleLogin} 
        systemUsers={systemUsers} 
        onUpdateUser={handleUpdateUser}
        addAuditLog={addAuditLog}
      />
    );
  }

  const renderContent = () => {
    const showFilter = ['dashboard', 'inventory'].includes(activeTab);

    return (
      <div className="flex flex-col">
        {showFilter && (
          <FilterBar 
            products={products} 
            filteredCount={filteredProducts.length}
            filters={filters} 
            setFilters={setFilters} 
            isStoreFixed={currentUser.role === 'store_user'}
          />
        )}
        {activeTab === 'dashboard' && (
          <DashboardView 
            triggerQuery={triggerAssistantQuery} 
            products={filteredProducts} 
            routes={currentUser.role === 'store_user' ? [] : routes}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshData}
            lastUpdated={lastUpdated}
            userRole={currentUser.role}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView triggerQuery={triggerAssistantQuery} products={filteredProducts} onClose={goBackToDashboard} />
        )}
        {activeTab === 'logistics' && (currentUser.role === 'admin' || currentUser.role === 'sysadmin' || currentUser.role === 'logistics_user') && (
          <LogisticsView triggerQuery={triggerAssistantQuery} routes={routes} onClose={goBackToDashboard} />
        )}
        {activeTab === 'assistant' && (
          <AssistantView initialQuery={pendingQuery} clearInitialQuery={() => setPendingQuery(null)} onClose={goBackToDashboard} />
        )}
        {activeTab === 'profile' && (
          <ProfileView user={currentUser} onUpdate={handleUpdateProfile} onClose={goBackToDashboard} />
        )}
        {activeTab === 'usermanagement' && currentUser.role === 'sysadmin' && (
          <UserManagementView 
            users={systemUsers} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
            onAddUser={handleAddUser}
            currentSysAdminId={currentUser.id}
            onClose={goBackToDashboard}
            addAuditLog={addAuditLog}
            currentUser={currentUser}
            auditLogs={auditLogs}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-bold tracking-tight text-blue-400">PODS</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out bg-slate-900
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          user={currentUser}
          onLogout={handleLogout}
        />
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Floating AI Advisor button - accessible to all roles with advisor access */}
      {(currentUser.role === 'admin' || currentUser.role === 'sysadmin' || currentUser.role === 'store_user' || currentUser.role === 'logistics_user') && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40">
          <button 
             onClick={() => setActiveTab('assistant')}
             className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition cursor-pointer group"
          >
            <span className="text-xl md:text-2xl group-hover:animate-bounce">🤖</span>
            <div className="absolute right-0 top-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
