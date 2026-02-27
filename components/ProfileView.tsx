
import React, { useState } from 'react';
import { User } from '../types';

interface ProfileViewProps {
  user: User;
  onUpdate: (updates: Partial<User>) => void;
  onClose: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    password: user.password || user.username,
    confirmPassword: user.password || user.username
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsSuccess(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    onUpdate({
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      password: formData.password
    });
    
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 relative">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-20"
        title="Back to Dashboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 md:p-12 text-white">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-blue-600 flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-slate-800">
              {user.name.charAt(0)}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
              <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-xs mt-1">{user.role.replace('_', ' ')}</p>
              {user.assignedStore && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 border border-slate-700">
                  📍 {user.assignedStore}
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Identity Details</h3>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username (Immutable)</label>
                <input 
                  type="text" 
                  value={user.username} 
                  disabled 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-bold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direct Phone</label>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Security Override</h3>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-6">
                <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
                  Security Note: Changing your password will update your credentials across all PODS connected nodes. Ensure your new secret is at least 8 characters.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              {isSuccess && (
                <p className="text-green-600 text-xs font-black uppercase tracking-widest flex items-center">
                  <span className="mr-2">✅</span> Profile Synchronization Complete
                </p>
              )}
              {error && (
                <p className="text-red-600 text-xs font-black uppercase tracking-widest flex items-center">
                  <span className="mr-2">⚠️</span> {error}
                </p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full md:w-auto bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-10 py-4 rounded-xl hover:bg-black transition-all shadow-xl active:scale-[0.98]"
            >
              Commit Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileView;
