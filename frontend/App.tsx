import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar';
import CommandCenterView from './components/CommandCenterView';
import InventoryIntelligenceView from './components/InventoryIntelligenceView';
import LogisticsCommandView from './components/LogisticsCommandView';
import DecisionCopilotView from './components/DecisionCopilotView';
import MyProfileView from './components/MyProfileView';
import IdentityAccessView from './components/IdentityAccessView';
import ForecastGovernanceView from './components/ForecastGovernanceView';
import ActionIntelligenceView from './components/ActionIntelligenceView';
import Onboarding from './components/Onboarding';
import FilterBar from './components/FilterBar';
import LoginView from './components/LoginView';
import { fetchProducts, fetchRoutes } from './services/dataService';
import { fetchUsers, updateUser as updateUserInDB } from './services/userService';
import { setAuthSession, logoutSession } from './services/authSession';
import { createAuditLogEvent, fetchAuditLogs } from './services/auditService';
import { Product, FreightRoute, Filters, User, AuditLog } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<FreightRoute[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load users from database API on component mount
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingUsers(false);
      setSystemUsers([]);
      return;
    }

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const usersData = await fetchUsers();
        setSystemUsers(usersData);
        console.log('✓ Loaded users from database:', usersData);
      } catch (error) {
        console.error('Error loading users from database:', error);
        setSystemUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [currentUser]);

  // Load products and routes from database API on component mount
  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setRoutes([]);
      setIsLoadingData(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoadingData(true);
        const [productsData, routesData] = await Promise.all([fetchProducts(), fetchRoutes()]);
        setProducts(productsData);
        setRoutes(routesData);
        setLastUpdated(Date.now());
        console.log('✓ Loaded data from database:', { productsData, routesData });
      } catch (error) {
        console.error('Error loading data from database:', error);
        // Fallback: products and routes remain empty
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sysadmin')) {
      setAuditLogs([]);
      return;
    }

    let cancelled = false;
    const loadAuditLogs = async () => {
      try {
        const logs = await fetchAuditLogs({ limit: 500 });
        if (!cancelled) {
          setAuditLogs(logs);
        }
      } catch (error) {
        console.error('Error loading audit logs:', error);
      }
    };

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Multi-store filter state
  const [filters, setFilters] = useState<Filters>({
    region: '',
    store: '',
    department: '',
    product: '',
    status: '',
  });

  // Handle auto-filtering for store users
  useEffect(() => {
    if (currentUser?.role === 'store_user' && currentUser.assignedStore) {
      setFilters((prev) => ({
        ...prev,
        store: currentUser.assignedStore || '',
        department: '',
        product: '',
      }));
    } else if (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') {
      setFilters({ region: '', store: '', department: '', product: '', status: '' });
    }
  }, [currentUser]);

  const handleLogin = (user: User, token: string, refreshToken: string) => {
    setAuthSession(token, refreshToken, user);
    setCurrentUser(user);
    // Don't persist login to localStorage - users must login each session
  };

  const handleLogout = async () => {
    await logoutSession();
    setCurrentUser(null);
    localStorage.removeItem('pods_current_user');
    setActiveTab('dashboard');
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    // Update local state immediately for responsiveness
    setSystemUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));

    // Sync with database in background
    try {
      await updateUserInDB(userId, updates);
      console.log('✓ User updated in database:', userId);
    } catch (error) {
      console.error('Error syncing user update to database:', error);
      // User state still reflects the change locally
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert('Safety Protocol: You cannot delete your own active session.');
      return;
    }
    setSystemUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      failedLoginAttempts: 0,
      isLocked: false,
    };
    setSystemUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    handleUpdateUser(currentUser.id, updates);
  };

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    if (!currentUser) {
      const localLog: AuditLog = {
        ...log,
        id: `local_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: Date.now(),
      };
      setAuditLogs((prev) => [localLog, ...prev].slice(0, 500));
      return;
    }

    void createAuditLogEvent({
      action: log.action,
      details: log.details,
      category: log.category,
      severity: log.severity,
      productId: log.productId,
      productName: log.productName,
      region: log.region,
      store: log.store,
      department: log.department,
    })
      .then((created) => {
        setAuditLogs((prev) =>
          [created, ...prev.filter((entry) => entry.id !== created.id)].slice(0, 500)
        );
      })
      .catch((error) => {
        console.error('Failed to persist audit log:', error);
      });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (currentUser?.role === 'store_user' && p.store !== currentUser.assignedStore) return false;
      if (filters.region && p.region !== filters.region) return false;
      if (filters.store && p.store !== filters.store) return false;
      if (filters.department && p.department !== filters.department) return false;
      if (filters.product && p.id !== filters.product) return false;
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
    try {
      const [productsData, routesData] = await Promise.all([fetchProducts(), fetchRoutes()]);
      setProducts(productsData);
      setRoutes(routesData);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Error refreshing data from database:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const triggerAssistantQuery = (query: string) => {
    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'ASSISTANT_QUERY_TRIGGER',
        details: `Assistant analysis requested: ${query.slice(0, 240)}`,
        category: 'system',
        severity: 'info',
      });
    }

    setPendingQuery(query);
    setActiveTab('assistant');
    setIsMobileMenuOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const goBackToDashboard = () => setActiveTab('dashboard');

  // Show loading screen while users are being fetched
  if (isLoadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0B0F]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-400 font-mono text-sm">Initializing PODS System...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLogin={handleLogin}
        systemUsers={systemUsers}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  const handleUpdateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...updates } : p)));
  };

  const renderContent = () => {
    const showFilter = ['dashboard', 'inventory', 'forecastreview'].includes(activeTab);

    return (
      <div className="flex flex-col">
        {showFilter && (
          <FilterBar
            products={products}
            filteredCount={filteredProducts.length}
            filters={filters}
            setFilters={setFilters}
            isStoreFixed={currentUser.role === 'store_user'}
            userRole={currentUser.role}
            userName={currentUser.username}
          />
        )}
        {activeTab === 'dashboard' && (
          <CommandCenterView
            triggerQuery={triggerAssistantQuery}
            products={filteredProducts}
            routes={currentUser.role === 'store_user' ? [] : routes}
            isLoadingData={isLoadingData}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshData}
            lastUpdated={lastUpdated}
            userRole={currentUser.role}
            currentUserName={currentUser.name}
            filters={filters}
            onNavigateTab={handleTabChange}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryIntelligenceView
            triggerQuery={triggerAssistantQuery}
            products={filteredProducts}
            isLoadingData={isLoadingData}
            onClose={goBackToDashboard}
            onUpdateProduct={handleUpdateProduct}
            addAuditLog={addAuditLog}
          />
        )}
        {activeTab === 'logistics' &&
          (currentUser.role === 'admin' ||
            currentUser.role === 'sysadmin' ||
            currentUser.role === 'logistics_user') && (
            <LogisticsCommandView
              triggerQuery={triggerAssistantQuery}
              routes={routes}
              onClose={goBackToDashboard}
            />
          )}
        {activeTab === 'assistant' && (
          <DecisionCopilotView
            initialQuery={pendingQuery}
            clearInitialQuery={() => setPendingQuery(null)}
            onClose={goBackToDashboard}
          />
        )}
        {activeTab === 'profile' && (
          <MyProfileView
            user={currentUser}
            onUpdate={handleUpdateProfile}
            onClose={goBackToDashboard}
          />
        )}
        {activeTab === 'usermanagement' && currentUser.role === 'sysadmin' && (
          <IdentityAccessView
            users={systemUsers}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddUser={handleAddUser}
            currentSysAdminId={currentUser.id}
            onClose={goBackToDashboard}
            addAuditLog={addAuditLog}
            currentUser={currentUser}
            auditLogs={auditLogs}
            products={products}
          />
        )}
        {activeTab === 'useractions' &&
          (currentUser.role === 'admin' || currentUser.role === 'sysadmin') && (
            <ActionIntelligenceView
              onClose={goBackToDashboard}
              products={products}
              users={systemUsers}
            />
          )}
        {activeTab === 'forecastreview' &&
          (currentUser.role === 'admin' || currentUser.role === 'sysadmin') && (
            <ForecastGovernanceView
              userRole={currentUser.role}
              currentUserName={currentUser.name}
              filters={filters}
              onRefreshData={handleRefreshData}
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
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

      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out bg-slate-900
        md:relative md:translate-x-0 md:w-72
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          user={currentUser}
          onLogout={handleLogout}
        />
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      {/* Floating AI Advisor button - accessible to all roles with advisor access */}
      {(currentUser.role === 'admin' ||
        currentUser.role === 'sysadmin' ||
        currentUser.role === 'store_user' ||
        currentUser.role === 'logistics_user') && (
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
