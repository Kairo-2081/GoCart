import React from 'react';
import { UserRole, Customer, Seller, Admin } from '../types';
import {
  ShoppingBag,
  ShoppingCart,
  PackageCheck,
  User,
  Store,
  ShieldCheck,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';

export type NavigationTab =
  | 'storefront'
  | 'orders'
  | 'profile'
  | 'seller-dashboard'
  | 'admin-dashboard';

interface NavbarProps {
  isLoggedIn: boolean;
  currentRole: UserRole;
  currentCustomer: Customer | null;
  currentSeller: Seller | null;
  admin: Admin | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn,
  currentRole,
  currentCustomer,
  currentSeller,
  admin,
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  onOpenLogin,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('storefront')}>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                GoCart
              </span>
              <span className="block text-[11px] text-slate-600 dark:text-zinc-400 font-serif italic underline underline-offset-3 decoration-indigo-500/60">
                a scalable, multi-vendor e-commerce marketplace
              </span>
            </div>
          </div>

          {/* Navigation Links according to Active Role and Login State */}
          <nav className="hidden md:flex items-center gap-1">
            {/* If NOT logged in: Guest Navigation */}
            {!isLoggedIn && (
              <button
                onClick={() => setActiveTab('storefront')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'storefront'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                Storefront Catalog
              </button>
            )}

            {/* If Logged in as CUSTOMER */}
            {isLoggedIn && currentRole === 'customer' && (
              <>
                <button
                  onClick={() => setActiveTab('storefront')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'storefront'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  Storefront Catalog
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  My Orders & Tracking
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
              </>
            )}

            {/* If Logged in as SELLER */}
            {isLoggedIn && currentRole === 'seller' && (
              <>
                <button
                  onClick={() => setActiveTab('seller-dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'seller-dashboard'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Seller Studio
                </button>
                <button
                  onClick={() => setActiveTab('storefront')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'storefront'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  Preview Storefront
                </button>
              </>
            )}

            {/* If Logged in as ADMIN */}
            {isLoggedIn && currentRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Governance
                </button>
                <button
                  onClick={() => setActiveTab('storefront')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'storefront'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  Public Storefront
                </button>
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>
            )}

            {/* Cart Button (Always accessible or when Customer) */}
            {(!isLoggedIn || currentRole === 'customer') && (
              <button
                onClick={onOpenCart}
                className="relative p-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors focus:outline-none cursor-pointer"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* User Session Auth Button */}
            {!isLoggedIn ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
