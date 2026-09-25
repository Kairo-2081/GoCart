import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Admin,
  Customer,
  Product,
  ProductStatus,
  Seller,
  SellerStatus,
  UserRole,
} from './types';
import { api, getAuthToken } from './lib/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useCart } from './hooks/useCart';
import { useMarketData } from './hooks/useMarketData';
import { LandingPage } from './components/LandingPage';
import { NavigationTab } from './components/Navbar';
import { Storefront } from './components/storefront/Storefront';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { CustomerOrders } from './components/customer/CustomerOrders';
import { CustomerProfile } from './components/customer/CustomerProfile';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AppModalName, AppModalState, AppModals } from './components/layout/AppModals';
import { MainLayout } from './components/layout/MainLayout';

const protectedTabRoles: Partial<Record<NavigationTab, UserRole>> = {
  orders: 'customer',
  profile: 'customer',
  'seller-dashboard': 'seller',
  'admin-dashboard': 'admin',
};

function AuthenticationGuard({
  authorized,
  onRequestLogin,
  children,
}: {
  authorized: boolean;
  onRequestLogin: () => void;
  children: React.ReactNode;
}) {
  if (authorized) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h2 className="text-lg font-semibold">Sign in required</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
        Sign in with an account that has access to this section.
      </p>
      <button
        onClick={onRequestLogin}
        className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Continue to sign in
      </button>
    </div>
  );
}

function AppContent() {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const cart = useCart();
  const market = useMarketData({ refreshCart: cart.refreshCart });
  const [viewMode, setViewMode] = React.useState<'landing' | 'app'>('landing');
  const [activeTab, setActiveTab] = React.useState<NavigationTab>('storefront');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [modalState, setModalState] = React.useState<AppModalState>({
    cart: false,
    checkout: false,
    customerSignup: false,
    sellerSignup: false,
    adminSignup: false,
    login: false,
  });

  const setModalOpen = (name: AppModalName, isOpen: boolean) => {
    setModalState((previous) => ({ ...previous, [name]: isOpen }));
  };

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setModalState((previous) => ({ ...previous, cart: false, checkout: false, login: true }));
      void market.loadInitialData();
    };
    window.addEventListener('marketpulse:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('marketpulse:unauthorized', handleUnauthorized);
  }, [market.loadInitialData]);

  const currentCustomer = auth.currentRole === 'customer' ? auth.currentUser as Customer | null : null;
  const currentSeller = auth.currentRole === 'seller' ? auth.currentUser as Seller | null : null;
  const currentAdmin = auth.currentRole === 'admin' ? auth.currentUser as Admin | null : null;
  const defaultAdmin: Admin = market.admins[0] || {
    Admin_ID: 'ADM-1',
    Name: 'Sarah Jenkins (Admin)',
    Email: 'admin@marketplace.com',
    Number: '+1 (800) 555-0199',
    Address: {
      House_Name: 'HQ Tower Floor 15',
      Street: '1 Marketplace Way',
      City: 'San Jose',
      Postal_Code: '95113',
    },
  };

  const handleLoginSuccess = (role: UserRole, entity: Customer | Seller | Admin) => {
    auth.login(role, entity);
    setActiveTab(role === 'customer' ? 'storefront' : role === 'seller' ? 'seller-dashboard' : 'admin-dashboard');
    setViewMode('app');
  };

  const handleLogout = () => {
    auth.logout();
    setActiveTab('storefront');
    setModalState((previous) => ({ ...previous, cart: false, checkout: false }));
  };

  const validateAuthForPage = async (tab: NavigationTab): Promise<boolean> => {
    const requiredRole = protectedTabRoles[tab];
    if (!getAuthToken()) {
      if (requiredRole) setModalOpen('login', true);
      return !requiredRole;
    }

    try {
      const result = await api.getCurrentUser();
      const user = result.user;
      const hasRoleEntity = user && (
        (user.role === 'customer' && Boolean((user.entity as Customer)?.Customer_ID)) ||
        (user.role === 'seller' && Boolean((user.entity as Seller)?.Seller_ID)) ||
        (user.role === 'admin' && Boolean((user.entity as Admin)?.Admin_ID))
      );
      if (!result.authenticated || !user || !hasRoleEntity || (requiredRole && user.role !== requiredRole)) {
        setModalOpen('login', true);
        return false;
      }
      return true;
    } catch {
      setModalOpen('login', true);
      return false;
    }
  };

  const handleTabChange = async (tab: NavigationTab) => {
    if (await validateAuthForPage(tab)) setActiveTab(tab);
  };

  const handleAddToCart = async (product: Product, quantity = 1) => {
    if (!auth.isLoggedIn || !currentCustomer) {
      setModalOpen('login', true);
      return;
    }
    try {
      await cart.addToCart(product, quantity);
      setModalOpen('cart', true);
    } catch (error: any) {
      alert(error.message || 'Failed to add item to cart');
    }
  };

  const handleUpdateCartQuantity = async (cartId: string, quantity: number) => {
    try {
      await cart.updateQuantity(cartId, quantity);
    } catch (error) {
      console.error('Cart quantity update error:', error);
    }
  };

  const handleRemoveCartItem = async (cartId: string) => {
    try {
      await cart.removeFromCart(cartId);
    } catch (error) {
      console.error('Remove from cart error:', error);
    }
  };

  const handleSubmitReview = async (productId: string, rating: number, reviewText: string) => {
    if (!auth.isLoggedIn || !currentCustomer) {
      setModalOpen('login', true);
      return;
    }
    await market.handleSubmitReview(productId, rating, reviewText);
  };

  const handlePlaceOrder = async (orderData: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Customer['Address'];
    Billing_Address: Customer['Address'];
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }) => {
    if (!currentCustomer) {
      setModalOpen('login', true);
      throw new Error('Please sign in to place order');
    }
    return market.handlePlaceOrder(orderData);
  };

  const handleNavigateHome = async () => {
    if (await validateAuthForPage(activeTab)) setViewMode('landing');
  };

  if (auth.isLoading || market.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-mono text-zinc-400">Initializing Raw SQL Database...</p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingPage
          customers={market.customers}
          sellers={market.sellers}
          admin={defaultAdmin}
          admins={market.admins}
          dbStatus={{ connected: true, provider: 'Raw SQL Database Engine', database: 'marketpulse_db' }}
          onOpenLogin={() => setModalOpen('login', true)}
          onEnterAsGuest={() => {
            setViewMode('app');
            setActiveTab('storefront');
          }}
          onOpenCustomerSignup={() => setModalOpen('customerSignup', true)}
          onOpenSellerSignup={() => setModalOpen('sellerSignup', true)}
          onOpenAdminSignup={auth.isLoggedIn && auth.currentRole === 'admin' ? () => setModalOpen('adminSignup', true) : undefined}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <MainLayout
          isLoggedIn={auth.isLoggedIn}
          currentRole={auth.currentRole}
          currentCustomer={currentCustomer}
          currentSeller={currentSeller}
          admin={currentAdmin}
          activeTab={activeTab}
          setActiveTab={(tab) => { void handleTabChange(tab); }}
          cartCount={cart.cart.reduce((sum, item) => sum + item.Quantity, 0)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCart={() => {
            if (!currentCustomer) setModalOpen('login', true);
            else setModalOpen('cart', true);
          }}
          onOpenLogin={() => setModalOpen('login', true)}
          onLogout={handleLogout}
          onOpenCustomerSignup={() => setModalOpen('customerSignup', true)}
          onOpenSellerSignup={() => setModalOpen('sellerSignup', true)}
          onOpenAdminSignup={auth.currentRole === 'admin' ? () => setModalOpen('adminSignup', true) : undefined}
          onNavigateHome={() => { void handleNavigateHome(); }}
        >
          {activeTab === 'storefront' && (
            <Storefront
              products={market.products}
              categories={market.categories}
              sellers={market.sellers}
              reviews={market.reviews}
              onSelectProduct={setSelectedProduct}
              onAddToCart={handleAddToCart}
            />
          )}

          {activeTab === 'orders' && (
            <AuthenticationGuard authorized={auth.isLoggedIn && auth.currentRole === 'customer' && Boolean(currentCustomer?.Customer_ID)} onRequestLogin={() => setModalOpen('login', true)}>
              {currentCustomer && <CustomerOrders currentCustomer={currentCustomer} orders={market.orders} />}
            </AuthenticationGuard>
          )}

          {activeTab === 'profile' && (
            <AuthenticationGuard authorized={auth.isLoggedIn && auth.currentRole === 'customer' && Boolean(currentCustomer?.Customer_ID)} onRequestLogin={() => setModalOpen('login', true)}>
              {currentCustomer && <CustomerProfile currentCustomer={currentCustomer} onUpdateCustomer={market.handleUpdateCustomer} />}
            </AuthenticationGuard>
          )}

          {activeTab === 'seller-dashboard' && (
            <AuthenticationGuard authorized={auth.isLoggedIn && auth.currentRole === 'seller' && Boolean(currentSeller?.Seller_ID)} onRequestLogin={() => setModalOpen('login', true)}>
              {currentSeller && (
                <SellerDashboard
                  currentSeller={currentSeller}
                  products={market.products}
                  categories={market.categories}
                  orders={market.orders}
                  reviews={market.reviews}
                  onSaveProduct={market.handleSaveProduct}
                  onDeleteProduct={market.handleDeleteProduct}
                  onUpdateProductStatus={(id, status: ProductStatus) => market.handleUpdateProductStatus(id, status)}
                  onUpdateOrderStatus={market.handleUpdateOrderStatus}
                />
              )}
            </AuthenticationGuard>
          )}

          {activeTab === 'admin-dashboard' && (
            <AuthenticationGuard authorized={auth.isLoggedIn && auth.currentRole === 'admin' && Boolean(currentAdmin?.Admin_ID)} onRequestLogin={() => setModalOpen('login', true)}>
              <AdminDashboard
                sellers={market.sellers}
                products={market.products}
                orders={market.orders}
                categories={market.categories}
                reviews={market.reviews}
                onUpdateSellerStatus={(id, status: SellerStatus) => market.handleUpdateSellerStatus(id, status)}
                onUpdateProductStatus={(id, status: ProductStatus) => market.handleUpdateProductStatus(id, status)}
                onCreateCategory={market.handleCreateCategory}
                onUpdateCategory={market.handleUpdateCategory}
                onDeleteCategory={market.handleDeleteCategory}
                onOpenSellerSignup={() => setModalOpen('sellerSignup', true)}
              />
            </AuthenticationGuard>
          )}
        </MainLayout>
      )}

      <AppModals
        modalState={modalState}
        setModalOpen={setModalOpen}
        isAppView={viewMode === 'app'}
        selectedProduct={selectedProduct}
        onClearSelectedProduct={() => setSelectedProduct(null)}
        categories={market.categories}
        sellers={market.sellers}
        reviews={market.reviews}
        currentCustomer={currentCustomer}
        cart={cart.cart}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
        onUpdateCartQuantity={(id, quantity) => { void handleUpdateCartQuantity(id, quantity); }}
        onRemoveCartItem={(id) => { void handleRemoveCartItem(id); }}
        onPlaceOrder={handlePlaceOrder}
        onOrderSuccess={() => {
          setModalOpen('checkout', false);
          void handleTabChange('orders');
        }}
        onRegisterCustomer={market.handleRegisterCustomer}
        onRegisterSeller={market.handleRegisterSeller}
        onRegisterAdmin={market.handleRegisterAdmin}
        onCustomerRegistered={(customer) => handleLoginSuccess('customer', customer)}
        onSellerRegistered={(seller) => handleLoginSuccess('seller', seller)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}