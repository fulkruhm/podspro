
import React, { useState } from 'react';
import { User, AuditLog } from '../types';

interface LoginViewProps {
  onLogin: (user: User, token: string, refreshToken: string) => void;
  systemUsers: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
}

export const INITIAL_USERS: User[] = [
  // SysAdmin
  { id: 'sys1', name: 'System Administrator', username: 'sysadmin', role: 'sysadmin', email: 'sysadmin@pods.ai', phoneNumber: '+1 (000) 0000', password: 'sysadmin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  // Admins
  { id: 'admin1', name: 'Matt', username: 'matt', role: 'admin', email: 'mattjohnson95@gmail.com', phoneNumber: '+1 (555) 0101', password: 'matt', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin2', name: 'Kevin', username: 'kevin', role: 'admin', email: 'kforr4@gmail.com', phoneNumber: '+1 (555) 0102', password: 'kevin', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin3', name: 'Gokul', username: 'gokul', role: 'admin', email: 'gokul.jd@gmail.com', phoneNumber: '+1 (555) 0103', password: 'gokul', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin4', name: 'Venki', username: 'venki', role: 'admin', email: 'vn28565@gmail.com', phoneNumber: '+1 (555) 0104', password: 'venki', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'admin5', name: 'Anoop', username: 'anoop', role: 'admin', email: 'mkanoop1984@gmail.com', phoneNumber: '+1 (555) 0105', password: 'anoop', status: 'active', failedLoginAttempts: 0, isLocked: false },
  // Store Users
  { id: 's1', name: 'Main St. Manager', username: 'main_st_user', role: 'store_user', assignedStore: 'Main St. Market', email: 'mainst@pods-retail.com', phoneNumber: '+1 (555) 0201', password: 'main_st_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 's2', name: 'Uptown Manager', username: 'uptown_user', role: 'store_user', assignedStore: 'Uptown Grocers', email: 'uptown@pods-retail.com', phoneNumber: '+1 (555) 0202', password: 'uptown_user', status: 'active', failedLoginAttempts: 0, isLocked: false },
  { id: 'l1', name: 'Logistics Analyst 1', username: 'log1', role: 'logistics_user', email: 'log1@pods-logistics.com', phoneNumber: '+1 (555) 0301', password: 'log1', status: 'active', failedLoginAttempts: 0, isLocked: false },
];

const LoginView: React.FC<LoginViewProps> = ({ onLogin, addAuditLog }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoHint, setShowDemoHint] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call backend login endpoint via relative path (proxied by nginx)
      console.log('[LoginView] Attempting login...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log('[LoginView] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        const token = data.token;
        const refreshToken = data.refreshToken;
        console.log('[LoginView] Login successful for user:', user.username);
        if (!token || !refreshToken) {
          setError('ERR_AUTH: Token not returned by authentication service');
          return;
        }
        
        onLogin(user, token, refreshToken);
        addAuditLog({
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_SUCCESS',
          details: `Successful login for @${user.username}`,
          category: 'auth',
          severity: 'info'
        });
      } else {
        const errorData = await response.json();
        console.log('[LoginView] Login failed:', errorData);
        setError(errorData.error || 'Login failed');
        
        addAuditLog({
          userId: 'unknown',
          userName: 'Unknown User',
          action: 'LOGIN_FAILURE',
          details: `Login attempt failed for @${username}: ${errorData.error}`,
          category: 'auth',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('[LoginView] Connection error:', error);
      setError('Connection error. Unable to authenticate.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0A0B0F] overflow-hidden font-mono selection:bg-blue-500/30">
      {/* High-Security Background Layers */}
      <div className="absolute inset-0 z-0">
        {/* Dot Grid */}
        <div className="absolute inset-0 bg-dot-grid opacity-10"></div>
        
        {/* Scanline Effect */}
        <div className="scanline"></div>

        {/* Hexagon/Circuit Pattern (SVG) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path d="M25 0 L50 14.4 L50 43.4 L25 57.8 L0 43.4 L0 14.4 Z" fill="none" stroke="#1A56FF" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
          </svg>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-[480px] w-full z-10 px-6 animate-in fade-in duration-1000">
        {/* Branding Area */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-full"></div>
              <svg className="w-12 h-12 text-blue-500 relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 className="text-8xl font-display text-white tracking-wider leading-none">PODS</h1>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <div className="h-[1px] w-12 bg-blue-500/30"></div>
            <p className="text-blue-400 uppercase tracking-[0.5em] text-[10px] font-bold">Optimization Engine</p>
            <div className="h-[1px] w-12 bg-blue-500/30"></div>
          </div>
        </div>

        {/* Mission-Critical Panel */}
        <div className="bg-[#12141C]/80 backdrop-blur-xl border border-blue-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(26,86,255,0.1)] relative overflow-hidden">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-400"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-400"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-400"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-400"></div>

          <div className="p-10 md:p-12">
            <div className="mb-10 flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.3em]">Node Authorization</h2>
                <p className="text-slate-500 text-[10px] mt-1">SECURE PROTOCOL v4.2.0</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-green-500/80 font-bold animate-pulse">● SYSTEM ONLINE</span>
              </div>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-10">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Handle</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-blue-500/30 py-3 text-sm font-medium text-white focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-700 glow-blue-focus"
                  placeholder="ID_IDENTIFIER"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Token</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-blue-500/30 py-3 text-sm font-medium text-white focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-700 glow-blue-focus"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 text-[10px] font-bold uppercase tracking-wider flex items-center animate-in shake duration-300">
                  <span className="mr-3">ERR_AUTH:</span> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#0A1A4D] to-[#1A56FF] text-white font-bold py-4 hover:brightness-110 transition-all active:scale-[0.99] shadow-[0_0_20px_rgba(26,86,255,0.3)] flex items-center justify-center group uppercase tracking-[0.3em] text-xs relative overflow-hidden"
              >
                {/* Pulse Animation Overlay */}
                <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none"></div>
                
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Authorize Node
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center">
              <div className="flex space-x-2">
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                  <span className="text-[8px] font-bold text-emerald-400 tracking-tighter">AES-256</span>
                </div>
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                  <span className="text-[8px] font-bold text-emerald-400 tracking-tighter">ISO-27001</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-600 tracking-widest">PODS_CORE_v4</span>
            </div>
          </div>
        </div>
        
        {/* Access Information */}
        <div className="mt-8 flex flex-col items-center">
          <button 
            onClick={() => setShowDemoHint(!showDemoHint)}
            className="text-slate-600 hover:text-blue-400 transition-colors text-[9px] font-bold uppercase tracking-[0.3em] flex items-center space-x-2"
          >
            <span>[ SYSTEM_INFO ]</span>
          </button>
          
          {showDemoHint && (
            <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-sm animate-in slide-in-from-bottom-2 duration-300 w-full">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest">Root_Protocols:</p>
                <div className="h-px flex-1 mx-4 bg-blue-500/10"></div>
              </div>
              <code className="text-[10px] text-blue-300 block">sysadmin / sysadmin</code>
              <p className="text-[9px] text-slate-600 mt-2 italic">Secondary: matt / matt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginView;
