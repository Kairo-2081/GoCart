import React from 'react';
import { UserRole, Customer, Seller, Admin } from '../types';
import {
  Users,
  Store,
  ShieldCheck,
  LogIn,
  LogOut,
  UserPlus,
  Database,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface RoleSwitcherProps {
  isLoggedIn: boolean;
  currentRole: UserRole;
  currentUserEntity: Customer | Seller | Admin | null;
  onOpenCustomerSignup?: () => void;
  onOpenSellerSignup: () => void;
  onOpenAdminSignup?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  isLoggedIn,
  currentRole,
  currentUserEntity,
  onOpenCustomerSignup,
  onOpenSellerSignup,
  onOpenAdminSignup,
  onOpenLogin,
  onLogout,
}) => {
  // If user is LOGGED IN: Absolutely NO in-profile switching or role switching!
  if (isLoggedIn && currentUserEntity) {
    const roleBadgeColor =
      currentRole === 'admin'
        ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        : currentRole === 'seller'
        ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

    const roleName =
      currentRole === 'admin'
        ? 'Platform Admin'
        : currentRole === 'seller'
        ? `Merchant (${(currentUserEntity as Seller).Status?.toUpperCase() || 'SELLER'})`
        : 'Verified Customer';

    return (
      <div className="bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 px-4 py-2 text-xs border-b border-slate-200 dark:border-zinc-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Active Account Identity (Locked to current user session) */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] border ${roleBadgeColor}`}>
              <CheckCircle2 className="w-3 h-3" />
              {roleName}
            </span>
            <span className="text-slate-600 dark:text-zinc-400">
              Authenticated as:{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {currentUserEntity.Name}
              </strong>{' '}
              <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
                ({currentUserEntity.Email})
              </span>
            </span>
          </div>

          {/* User Controls: Only Logout & SQL Engine Status (No profile switching) */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-500 mr-2">
              <Database className="w-3 h-3 text-indigo-500" />
              Engine: Raw SQL (Local Store)
            </span>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 font-semibold rounded-lg border border-rose-500/20 transition-all cursor-pointer"
              title="Log out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is GUEST / NOT LOGGED IN:
  return (
    <div className="bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 px-4 py-2 text-xs border-b border-slate-200 dark:border-zinc-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px] border border-amber-500/20">
            Guest Mode
          </span>
          <span className="text-slate-600 dark:text-zinc-400 hidden sm:inline">
            You are browsing the public catalog. Sign in with username & password to place orders or manage stores.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Simple Login Button */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          {/* Registration Options */}
          {onOpenCustomerSignup && (
            <button
              onClick={onOpenCustomerSignup}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer font-medium"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Customer Signup</span>
            </button>
          )}

          {onOpenSellerSignup && (
            <button
              onClick={onOpenSellerSignup}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer font-medium"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Become a Seller</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
