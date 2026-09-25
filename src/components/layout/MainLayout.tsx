import React from 'react';
import { Database, LayoutGrid } from 'lucide-react';
import { Admin, Customer, Seller, UserRole } from '../../types';
import { Navbar, NavigationTab } from '../Navbar';
import { RoleSwitcher } from '../RoleSwitcher';

interface MainLayoutProps {
  children: React.ReactNode;
  isLoggedIn: boolean;
  currentRole: UserRole;
  currentCustomer: Customer | null;
  currentSeller: Seller | null;
  admin: Admin | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  cartCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenCustomerSignup: () => void;
  onOpenSellerSignup: () => void;
  onOpenAdminSignup?: () => void;
  onNavigateHome: () => void;
}

export function MainLayout({
  children,
  isLoggedIn,
  currentRole,
  currentCustomer,
  currentSeller,
  admin,
  activeTab,
  setActiveTab,
  cartCount,
  theme,
  onToggleTheme,
  onOpenCart,
  onOpenLogin,
  onLogout,
  onOpenCustomerSignup,
  onOpenSellerSignup,
  onOpenAdminSignup,
  onNavigateHome,
}: MainLayoutProps) {
  const currentUserEntity = currentCustomer || currentSeller || admin;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans flex flex-col antialiased transition-colors duration-200">
      <div className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Home / Portal Landing</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Raw SQL Mode</span>
          </span>
        </div>
      </div>

      <RoleSwitcher
        isLoggedIn={isLoggedIn}
        currentRole={currentRole}
        currentUserEntity={currentUserEntity}
        onOpenCustomerSignup={onOpenCustomerSignup}
        onOpenSellerSignup={onOpenSellerSignup}
        onOpenAdminSignup={onOpenAdminSignup}
        onOpenLogin={onOpenLogin}
        onLogout={onLogout}
      />

      <Navbar
        isLoggedIn={isLoggedIn}
        currentRole={currentRole}
        currentCustomer={currentCustomer}
        currentSeller={currentSeller}
        admin={admin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        onOpenLogin={onOpenLogin}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {children}
      </main>
    </div>
  );
}