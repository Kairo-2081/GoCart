import React from 'react';
import { UserRole, Customer, Seller, Admin } from '../types';
import {
  ShoppingBag,
  Users,
  Store,
  ShieldCheck,
  Database,
  ArrowRight,
  Sparkles,
  UserPlus,
  LogIn,
  Sun,
  Moon,
  KeyRound,
} from 'lucide-react';

interface LandingPageProps {
  customers: Customer[];
  sellers: Seller[];
  admin: Admin;
  admins?: Admin[];
  dbStatus: { connected: boolean; provider: string; database: string };
  onOpenLogin: () => void;
  onEnterAsGuest: () => void;
  onOpenCustomerSignup?: () => void;
  onOpenSellerSignup: () => void;
  onOpenAdminSignup?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  customers,
  sellers,
  admin,
  dbStatus,
  onOpenLogin,
  onEnterAsGuest,
  onOpenCustomerSignup,
  onOpenSellerSignup,
  onOpenAdminSignup,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden transition-colors duration-200">
      {/* Background Subtle Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-200 dark:border-zinc-800/80 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GoCart</span>
            <span className="text-xs text-slate-600 dark:text-zinc-400 block font-serif italic underline underline-offset-3 decoration-indigo-500/60">
              a scalable, multi-vendor e-commerce marketplace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
          )}

          {/* Database Engine Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium shadow-xs">
            <Database className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-slate-600 dark:text-zinc-300">
              Engine: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Raw SQL Local DB</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Hero */}
      <div className="max-w-5xl mx-auto w-full py-12 z-10 space-y-10 my-auto">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            Raw SQL Architecture • Direct Query Engine
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Welcome to GoCart
          </h1>

          {/* Classy Subtitle with refined typographic styling */}
          <div className="pt-0.5 pb-1">
            <p className="text-base sm:text-lg text-slate-800 dark:text-zinc-200 font-medium tracking-wide">
              <span className="underline underline-offset-8 decoration-indigo-500/60 decoration-2 italic font-serif">
                a scalable, multi-vendor e-commerce marketplace
              </span>
            </p>
          </div>

          {/* Second line describing direct login & SQL capabilities */}
          <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto pt-1">
            Sign in simply with your <strong className="text-slate-800 dark:text-zinc-200 font-semibold">Username and Password</strong>. Customer, Merchant, and Administrator accounts operate directly on raw SQL statements without intermediate APIs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Username &amp; Password</span>
            </button>
            <button
              onClick={onEnterAsGuest}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold text-sm rounded-xl border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
            >
              <span>Browse Catalog as Guest</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Portal Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:border-indigo-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-200/50 dark:border-indigo-800/50">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer Portal</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Browse products, manage shopping cart, place tracked orders, and write verified product reviews.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-6">
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Customer Login
              </button>
              {onOpenCustomerSignup && (
                <button
                  onClick={onOpenCustomerSignup}
                  className="w-full py-2 px-4 text-center text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  + Create New Customer Account
                </button>
              )}
            </div>
          </div>

          {/* Seller Portal Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:border-emerald-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-200/50 dark:border-emerald-800/50">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Merchant Studio</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Manage inventory, add &amp; edit products, fulfill customer orders, and track fulfillment status.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-6">
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Merchant Login
              </button>
              <button
                onClick={onOpenSellerSignup}
                className="w-full py-2 px-4 text-center text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                + Register as New Merchant
              </button>
            </div>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:border-purple-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl border border-purple-200/50 dark:border-purple-800/50">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Governance</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Approve/reject seller applications, curate product catalogs, manage taxonomy, and monitor revenue.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-6">
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Admin Login
              </button>
              {onOpenAdminSignup && (
                <button
                  onClick={onOpenAdminSignup}
                  className="w-full py-2 px-4 text-center text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  + Register Admin Officer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full py-4 text-center text-xs text-slate-500 dark:text-zinc-500 border-t border-slate-200 dark:border-zinc-800/80">
        <strong className="font-semibold text-slate-800 dark:text-zinc-300">GoCart</strong> • <span className="underline underline-offset-2 decoration-indigo-500/60">a scalable, multi-vendor e-commerce marketplace</span> • Direct Raw SQL Engine
      </div>
    </div>
  );
};
