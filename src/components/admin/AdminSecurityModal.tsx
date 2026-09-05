import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, X, Lock, Eye, EyeOff } from 'lucide-react';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ADMIN_SECURITY_KEY = 'ADMIN123';

export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [securityKey, setSecurityKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityKey.trim().toUpperCase() === ADMIN_SECURITY_KEY) {
      setError(null);
      setSecurityKey('');
      onSuccess();
    } else {
      setError('Invalid Security Key! Please check the key and try again.');
    }
  };

  const handleAutoFillKey = () => {
    setSecurityKey(ADMIN_SECURITY_KEY);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-purple-900/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Security Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Restricted portal for authorized administrators</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-200 rounded-xl flex items-center justify-between gap-2">
            <div>
               <strong>Master Security Key:</strong> <code className="bg-purple-200 dark:bg-purple-900/60 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN123</code>
            </div>
            <button
              type="button"
              onClick={handleAutoFillKey}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-md transition-colors text-[11px] cursor-pointer shrink-0"
            >
              Fill Key
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
              Enter Admin Security Key *
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                required
                placeholder="Enter security key..."
                value={securityKey}
                onChange={(e) => {
                  setSecurityKey(e.target.value);
                  setError(null);
                }}
                className="w-full p-2.5 pl-9 pr-10 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <KeyRound className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verify & Enter Console
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
