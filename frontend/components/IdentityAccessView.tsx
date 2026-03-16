import React, { useEffect, useMemo, useState } from 'react';
import { User, Role, AuditLog, Product } from '../types';
import { exportAuditLogsCsv, fetchAuditLogs } from '../services/auditService';

type AuditCategoryFilter = AuditLog['category'] | 'all';
type AuditSeverityFilter = AuditLog['severity'] | 'all';

interface IdentityAccessViewProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
  currentSysAdminId: string;
  onClose: () => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  currentUser: User;
  auditLogs: AuditLog[];
  products: Product[];
}

const IdentityAccessView: React.FC<IdentityAccessViewProps> = ({
  users,
  onUpdateUser,
  onDeleteUser,
  onAddUser,
  currentSysAdminId,
  onClose,
  addAuditLog,
  currentUser,
  auditLogs,
  products,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogsView, setShowLogsView] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsData, setLogsData] = useState<AuditLog[]>(auditLogs);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<AuditCategoryFilter>('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<AuditSeverityFilter>('all');
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'status'>>({
    name: '',
    username: '',
    role: 'store_user',
    email: '',
    phoneNumber: '',
    password: '',
    assignedStore: undefined, // For store_user selection
  });

  // Extract unique stores from products
  const uniqueStores = Array.from(new Set(products.map((p) => p.store))).sort();

  useEffect(() => {
    setLogsData(auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    if (!showLogsView) {
      return;
    }

    let cancelled = false;

    const loadLogs = async () => {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const fromTimestamp = auditFromDate
          ? new Date(`${auditFromDate}T00:00:00.000`).getTime()
          : undefined;
        const toTimestamp = auditToDate
          ? new Date(`${auditToDate}T23:59:59.999`).getTime()
          : undefined;

        const loaded = await fetchAuditLogs({
          limit: 500,
          category: auditCategoryFilter === 'all' ? undefined : auditCategoryFilter,
          severity: auditSeverityFilter === 'all' ? undefined : auditSeverityFilter,
          userId: auditUserFilter === 'all' ? undefined : auditUserFilter,
          from: fromTimestamp,
          to: toTimestamp,
        });
        if (!cancelled) {
          setLogsData(loaded);
        }
      } catch (error) {
        console.error('Failed to load filtered audit logs:', error);
        if (!cancelled) {
          setLogsError('Could not load fresh logs. Showing last available snapshot.');
          setLogsData(auditLogs);
        }
      } finally {
        if (!cancelled) {
          setLogsLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      cancelled = true;
    };
  }, [
    showLogsView,
    auditCategoryFilter,
    auditSeverityFilter,
    auditUserFilter,
    auditFromDate,
    auditToDate,
    auditLogs,
  ]);

  const displayedAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    if (!query) {
      return logsData;
    }

    return logsData.filter((log) => {
      return (
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query)
      );
    });
  }, [logsData, auditSearch]);

  const auditSummary = useMemo(() => {
    const now = Date.now();
    const last24hCutoff = now - 24 * 60 * 60 * 1000;

    return {
      total: displayedAuditLogs.length,
      critical: displayedAuditLogs.filter((log) => log.severity === 'critical').length,
      warnings: displayedAuditLogs.filter((log) => log.severity === 'warning').length,
      last24h: displayedAuditLogs.filter((log) => log.timestamp >= last24hCutoff).length,
    };
  }, [displayedAuditLogs]);

  const handleExportLogs = () => {
    const fromTimestamp = auditFromDate
      ? new Date(`${auditFromDate}T00:00:00.000`).getTime()
      : undefined;
    const toTimestamp = auditToDate ? new Date(`${auditToDate}T23:59:59.999`).getTime() : undefined;

    void exportAuditLogsCsv({
      limit: 1000,
      category: auditCategoryFilter === 'all' ? undefined : auditCategoryFilter,
      severity: auditSeverityFilter === 'all' ? undefined : auditSeverityFilter,
      userId: auditUserFilter === 'all' ? undefined : auditUserFilter,
      from: fromTimestamp,
      to: toTimestamp,
    });
  };

  const handleToggleStatus = (user: User) => {
    const nextStatusMap: Record<User['status'], User['status']> = {
      active: 'paused',
      paused: 'deactivated',
      deactivated: 'active',
    };
    const newStatus = nextStatusMap[user.status];
    onUpdateUser(user.id, { status: newStatus });
    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'USER_STATUS_CHANGE',
      details: `Changed status for @${user.username} from ${user.status} to ${newStatus}`,
      category: 'system',
      severity: 'info',
    });
  };

  const handleUnlockUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    onUpdateUser(userId, { isLocked: false, failedLoginAttempts: 0 });
    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'USER_UNLOCK',
      details: `Unlocked account for @${user?.username || userId}`,
      category: 'security',
      severity: 'warning',
    });
    alert('SYSTEM ALERT: Account has been unlocked. Failed attempts reset.');
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassUser && newPassword) {
      onUpdateUser(resetPassUser.id, { password: newPassword });
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'PASSWORD_RESET',
        details: `Reset password for @${resetPassUser.username}`,
        category: 'security',
        severity: 'critical',
      });
      setResetPassUser(null);
      setNewPassword('');
      alert(`SYSTEM ALERT: Password for @${resetPassUser.username} has been successfully reset.`);
    }
  };

  const executeDeletion = () => {
    if (deleteConfirmUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_DELETE',
        details: `Permanently deleted user @${deleteConfirmUser.username}`,
        category: 'provisioning',
        severity: 'critical',
      });
      onDeleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that store_user has a store assigned
    if (newUser.role === 'store_user' && !newUser.assignedStore) {
      alert('SYSTEM ALERT: Store Manager must be assigned to a store.');
      return;
    }

    // Default password to username if not specified
    const finalPassword = newUser.password || newUser.username;

    // Don't send assignedStore for non-store_user roles
    const userToAdd = {
      ...newUser,
      password: finalPassword,
      status: 'active',
      assignedStore: newUser.role === 'store_user' ? newUser.assignedStore : undefined,
    };

    onAddUser(userToAdd);
    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'USER_PROVISION',
      details: `Provisioned new node for @${newUser.username} with role ${newUser.role}${newUser.assignedStore ? ` at store ${newUser.assignedStore}` : ''}`,
      category: 'provisioning',
      severity: 'info',
    });
    setShowAddModal(false);
    setNewUser({
      name: '',
      username: '',
      role: 'store_user',
      email: '',
      phoneNumber: '',
      password: '',
      assignedStore: undefined,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-12 md:pr-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center">
            User Command Center
            <span className="ml-3 px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-widest">
              SysAdmin Level
            </span>
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Global access control, security credential resets, and node provisioning.
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={() => setShowLogsView(true)}
            className="flex-1 md:flex-none bg-blue-100 text-blue-700 px-6 py-4 md:py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition active:scale-95 flex items-center justify-center"
          >
            <span className="mr-2">📜</span>
            Audit Logs
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 md:py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition shadow-2xl shadow-slate-900/20 active:scale-95 flex items-center justify-center"
          >
            <span className="mr-2 text-lg">+</span>
            Provision New Node
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors hidden md:block"
            title="Back to Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-slate-400"
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
          </button>
        </div>
        {/* Absolute X for mobile */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 md:hidden hover:bg-slate-200 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-slate-400"
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
        </button>
      </header>

      {/* Admin Help Banner */}
      <div className="bg-blue-600 rounded-[1.5rem] p-5 text-white flex items-center justify-between shadow-xl shadow-blue-900/20">
        <div className="flex items-center">
          <div className="hidden sm:flex w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-4 text-xl">
            💡
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider">Administrative Controls</h4>
            <p className="text-[11px] opacity-90 font-medium mt-0.5">
              As System Admin, use <span className="font-bold underline">Unlock Node</span> to
              restore access for locked accounts (10 failed attempts).
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Managed Nodes
          </div>
          <div className="text-3xl font-black text-slate-900">{users.length}</div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Active Operations
          </div>
          <div className="text-3xl font-black text-green-600">
            {users.filter((u) => u.status === 'active').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Locked Accounts
          </div>
          <div className="text-3xl font-black text-red-600">
            {users.filter((u) => u.isLocked).length}
          </div>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
          Node Management Cards
        </h3>
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
          >
            <div className="p-5 flex items-start justify-between border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg ${u.isLocked ? 'bg-red-600' : 'bg-slate-900'}`}
                >
                  {u.isLocked ? '🔒' : u.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{u.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    @{u.username}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => handleToggleStatus(u)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    u.status === 'active'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : u.status === 'paused'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  {u.status}
                </button>
                {u.isLocked && (
                  <span className="text-[8px] font-black text-red-600 uppercase">
                    SYSTEM LOCKED
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Access Role
                </span>
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                  {u.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Node Scope
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">
                  {u.assignedStore || 'Global Network'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex flex-col gap-2 border-t border-slate-100">
              {u.isLocked && (
                <button
                  onClick={() => handleUnlockUser(u.id)}
                  className="w-full bg-green-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/10 flex items-center justify-center active:scale-95"
                >
                  <span className="mr-2">🔓</span> Unlock Node Access
                </button>
              )}

              <button
                onClick={() => setResetPassUser(u)}
                className="w-full bg-blue-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 flex items-center justify-center active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Reset Password
              </button>

              {u.id !== currentSysAdminId ? (
                <button
                  onClick={() => setDeleteConfirmUser(u)}
                  className="w-full bg-red-100 text-red-700 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Permanently Delete
                </button>
              ) : (
                <div className="text-center py-2 text-[10px] font-black text-slate-400 uppercase italic">
                  Current Active Session
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  User Identity
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Access Scope
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Operational Status
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  System Controls
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-105 ${u.isLocked ? 'bg-red-600' : 'bg-slate-900'}`}
                      >
                        {u.isLocked ? '🔒' : u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{u.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center">
                          @{u.username}
                          {u.isLocked && (
                            <span className="ml-2 text-[8px] text-red-600 font-black border border-red-200 px-1 rounded">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                        {u.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {u.assignedStore || 'Global Network'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                        u.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : u.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end items-center space-x-3">
                      {u.isLocked && (
                        <button
                          onClick={() => handleUnlockUser(u.id)}
                          className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center"
                        >
                          <span className="mr-1.5">🔓</span>
                          Unlock Node
                        </button>
                      )}

                      <button
                        onClick={() => setResetPassUser(u)}
                        className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
                        Reset Pass
                      </button>

                      {u.id !== currentSysAdminId ? (
                        <button
                          onClick={() => setDeleteConfirmUser(u)}
                          className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest mr-4">
                          Current Session
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlays */}

      {/* Audit Logs Modal */}
      {showLogsView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  System Audit Trail
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Real-time security & operation logging
                </p>
              </div>
              <button
                onClick={() => setShowLogsView(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-400"
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
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Total Events
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{auditSummary.total}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                    Critical
                  </p>
                  <p className="text-2xl font-black text-red-700 mt-1">{auditSummary.critical}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Warnings
                  </p>
                  <p className="text-2xl font-black text-amber-700 mt-1">{auditSummary.warnings}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    Last 24h
                  </p>
                  <p className="text-2xl font-black text-blue-700 mt-1">{auditSummary.last24h}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={auditCategoryFilter}
                  onChange={(e) => setAuditCategoryFilter(e.target.value as AuditCategoryFilter)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">All Categories</option>
                  <option value="security">Security</option>
                  <option value="auth">Auth</option>
                  <option value="provisioning">Provisioning</option>
                  <option value="system">System</option>
                </select>

                <select
                  value={auditSeverityFilter}
                  onChange={(e) => setAuditSeverityFilter(e.target.value as AuditSeverityFilter)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>

                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">All Users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username})
                    </option>
                  ))}
                </select>

                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  type="search"
                  placeholder="Search action/details"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                  <span className="uppercase tracking-widest text-[9px]">From</span>
                  <input
                    value={auditFromDate}
                    onChange={(e) => setAuditFromDate(e.target.value)}
                    type="date"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  />
                </label>

                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                  <span className="uppercase tracking-widest text-[9px]">To</span>
                  <input
                    value={auditToDate}
                    onChange={(e) => setAuditToDate(e.target.value)}
                    type="date"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  />
                </label>
              </div>

              {logsError && (
                <div className="mb-4 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {logsError}
                </div>
              )}

              <div className="space-y-3">
                {logsLoading ? (
                  <div className="text-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                      Loading audit entries
                    </p>
                  </div>
                ) : displayedAuditLogs.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-4xl mb-4">📂</div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                      No audit entries found
                    </p>
                  </div>
                ) : (
                  displayedAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start space-x-4 hover:bg-slate-100/50 transition-colors"
                    >
                      <div
                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          log.severity === 'critical'
                            ? 'bg-red-500 animate-pulse'
                            : log.severity === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                        }`}
                      ></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              log.category === 'security'
                                ? 'bg-red-100 text-red-700'
                                : log.category === 'auth'
                                  ? 'bg-amber-100 text-amber-700'
                                  : log.category === 'provisioning'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-900 mb-1">{log.action}</div>
                        <div className="text-[11px] text-slate-600 font-medium mb-2">
                          {log.details}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                          Initiated by: <span className="text-slate-900">{log.userName}</span> (@
                          {users.find((u) => u.id === log.userId)?.username || 'unknown'})
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Showing last 500 entries (filtered)
              </p>
              <button
                onClick={handleExportLogs}
                className="text-[10px] font-black text-blue-700 uppercase tracking-widest hover:underline"
              >
                Export CSV (Current Filter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Provision New Node
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Security Clearance: Level 4
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-400"
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
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      System Handle
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                      placeholder="jdoe_01"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Access Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all appearance-none"
                  >
                    <option value="store_user">Store Manager</option>
                    <option value="logistics_user">Logistics Analyst</option>
                    <option value="admin">Regional Admin</option>
                    <option value="sysadmin">System Admin</option>
                  </select>
                </div>

                {newUser.role === 'store_user' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Assigned Store
                    </label>
                    <select
                      required
                      value={newUser.assignedStore || ''}
                      onChange={(e) => setNewUser({ ...newUser, assignedStore: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all appearance-none"
                    >
                      <option value="">Select Store</option>
                      {uniqueStores.map((store) => (
                        <option key={store} value={store}>
                          {store}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                    placeholder="j.doe@pods.ai"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Initial Pass-Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                    placeholder="Defaults to System Handle"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-2xl shadow-slate-900/20 uppercase tracking-widest text-xs"
                  >
                    Confirm Provisioning
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Reset Pass-Token
                </h3>
                <button
                  onClick={() => setResetPassUser(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-400"
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
                </button>
              </div>

              <div className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs text-blue-700 font-bold leading-relaxed">
                  You are resetting credentials for{' '}
                  <span className="font-black">@{resetPassUser.username}</span>. This action will be
                  logged in the security audit trail.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    New Pass-Token
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/20 uppercase tracking-widest text-xs"
                >
                  Update Credentials
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-red-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 md:p-10">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
                ⚠️
              </div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Critical Action
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-2">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-black text-slate-900">@{deleteConfirmUser.username}</span>?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={executeDeletion}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 transition-all active:scale-[0.98] shadow-2xl shadow-red-900/20 uppercase tracking-widest text-xs"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                  Abort Protocol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityAccessView;
