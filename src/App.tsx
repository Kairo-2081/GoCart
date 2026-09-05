import React from 'react';
import {
  UserRole,
  Customer,
  Seller,
  Admin,
  Category,
  Product,
  Order,
  CartItem,
  Review,
  SellerStatus,
  ProductStatus,
} from './types';
import { api, db } from './lib/api';
import { LandingPage } from './components/LandingPage';
import { Navbar, NavigationTab } from './components/Navbar';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Storefront } from './components/storefront/Storefront';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { SellerSignupModal } from './components/seller/SellerSignupModal';
import { CustomerSignupModal } from './components/customer/CustomerSignupModal';
import { AdminSignupModal } from './components/admin/AdminSignupModal';
import { AdminSecurityModal } from './components/admin/AdminSecurityModal';
import { LoginModal } from './components/LoginModal';
import { CustomerOrders } from './components/customer/CustomerOrders';
import { CustomerProfile } from './components/customer/CustomerProfile';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RefreshCw, LayoutGrid, Database } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = React.useState<'landing' | 'app'>('landing');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [currentRole, setCurrentRole] = React.useState<UserRole>('customer');
  const [activeTab, setActiveTab] = React.useState<NavigationTab>('storefront');

  // Logged-in Entities
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [selectedSeller, setSelectedSeller] = React.useState<Seller | null>(null);
  const [selectedAdmin, setSelectedAdmin] = React.useState<Admin | null>(null);

  // Theme State ('dark' | 'light')
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marketpulse_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('marketpulse_theme', theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Core Entity States (Directly from Raw SQL Database)
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [sellers, setSellers] = React.useState<Seller[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);

  // UI Modals
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = React.useState<Product | null>(null);
  const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = React.useState(false);
  const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = React.useState(false);
  const [isAdminRegistrationOpen, setIsAdminRegistrationOpen] = React.useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [isAdminSecurityModalOpen, setIsAdminSecurityModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load all data from Raw SQL Database Engine
  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, sels, prods, custs, ords, revs, fetchedAdmins] = await Promise.all([
        api.getCategories(),
        api.getSellers(),
        api.getProducts(),
        api.getCustomers(),
        api.getOrders(),
        api.getReviews(),
        api.getAdmins(),
      ]);

      setCategories(cats);
      setSellers(sels);
      setProducts(prods);
      setCustomers(custs);
      setOrders(ords);
      setReviews(revs);
      setAdmins(fetchedAdmins);
    } catch (err) {
      console.error('Failed to load raw SQL data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load customer cart when selectedCustomer changes
  React.useEffect(() => {
    if (selectedCustomer && isLoggedIn) {
      api
        .getCart(selectedCustomer.Customer_ID)
        .then(setCart)
        .catch((err) => console.error('Error fetching cart:', err));
    } else {
      setCart([]);
    }
  }, [selectedCustomer, isLoggedIn]);

  // Handle Login: by Username & Password simply!
  const handleLoginSuccess = (role: UserRole, entity: any) => {
    setIsLoggedIn(true);
    setCurrentRole(role);

    if (role === 'customer') {
      setSelectedCustomer(entity as Customer);
      setSelectedSeller(null);
      setSelectedAdmin(null);
      setActiveTab('storefront');
    } else if (role === 'seller') {
      setSelectedSeller(entity as Seller);
      setSelectedCustomer(null);
      setSelectedAdmin(null);
      setActiveTab('seller-dashboard');
    } else if (role === 'admin') {
      setSelectedAdmin(entity as Admin);
      setSelectedCustomer(null);
      setSelectedSeller(null);
      setActiveTab('admin-dashboard');
    }

    setViewMode('app');
  };

  // Handle Log Out: Cleanly resets authentication state
  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedCustomer(null);
    setSelectedSeller(null);
    setSelectedAdmin(null);
    setCurrentRole('customer');
    setActiveTab('storefront');
    setCart([]);
  };

  // Cart operations
  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!isLoggedIn || !selectedCustomer) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      await api.addToCart(selectedCustomer.Customer_ID, product.Product_ID, quantity);
      const updatedCart = await api.getCart(selectedCustomer.Customer_ID);
      setCart(updatedCart);
      setIsCartOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to add item to cart');
    }
  };

  const handleUpdateCartQuantity = async (cartId: string, quantity: number) => {
    if (!selectedCustomer) return;
    try {
      if (quantity <= 0) {
        await api.removeFromCart(cartId);
      } else {
        await api.updateCartQuantity(cartId, quantity);
      }
      const updatedCart = await api.getCart(selectedCustomer.Customer_ID);
      setCart(updatedCart);
    } catch (err: any) {
      console.error('Cart quantity update error:', err);
    }
  };

  const handleRemoveFromCart = async (cartId: string) => {
    if (!selectedCustomer) return;
    try {
      await api.removeFromCart(cartId);
      const updatedCart = await api.getCart(selectedCustomer.Customer_ID);
      setCart(updatedCart);
    } catch (err: any) {
      console.error('Remove from cart error:', err);
    }
  };

  // Order Placement
  const handlePlaceOrder = async (orderData: any) => {
    if (!selectedCustomer) {
      setIsLoginModalOpen(true);
      throw new Error('Please sign in to place order');
    }
    const newOrder = await api.createOrder(orderData);
    setOrders((prev) => [newOrder, ...prev]);
    const [updatedCart, updatedProds] = await Promise.all([
      api.getCart(selectedCustomer.Customer_ID),
      api.getProducts(),
    ]);
    setCart(updatedCart);
    setProducts(updatedProds);
    return newOrder;
  };

  // Review Submission
  const handleSubmitReview = async (productId: string, rating: number, reviewText: string) => {
    if (!isLoggedIn || !selectedCustomer) {
      setIsLoginModalOpen(true);
      return;
    }
    const newRev = await api.createReview({
      Product_ID: productId,
      Customer_ID: selectedCustomer.Customer_ID,
      Customer_Name: selectedCustomer.Name,
      Review_text: reviewText,
      Rating: rating,
    });
    setReviews((prev) => [newRev, ...prev]);
  };

  // Customer Profile update
  const handleUpdateCustomer = async (updated: Customer) => {
    try {
      await api.updateCustomer(updated.Customer_ID, updated);
      setSelectedCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.Customer_ID === updated.Customer_ID ? updated : c)));
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  // Product CRUD (Seller)
  const handleSaveProduct = async (data: Partial<Product>) => {
    if (data.Product_ID) {
      await api.updateProduct(data.Product_ID, data);
      const updatedList = await api.getProducts();
      setProducts(updatedList);
    } else {
      const created = await api.createProduct(data);
      setProducts((prev) => [created, ...prev]);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.Product_ID !== productId));
  };

  const handleUpdateProductStatus = async (productId: string, status: ProductStatus) => {
    await api.updateProductStatus(productId, status);
    const updatedList = await api.getProducts();
    setProducts(updatedList);
  };

  // Order Status update (Seller)
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    await api.updateOrderStatus(orderId, status);
    const updatedOrders = await api.getOrders();
    setOrders(updatedOrders);
  };

  // Admin Seller Governance
  const handleUpdateSellerStatus = async (sellerId: string, status: SellerStatus) => {
    await api.updateSellerStatus(sellerId, status);
    const updatedSellers = await api.getSellers();
    setSellers(updatedSellers);
    if (selectedSeller && selectedSeller.Seller_ID === sellerId) {
      const refreshedSeller = updatedSellers.find((s) => s.Seller_ID === sellerId);
      if (refreshedSeller) setSelectedSeller(refreshedSeller);
    }
  };

  // Category CRUD (Admin)
  const handleCreateCategory = async (name: string) => {
    const created = await api.createCategory(name);
    setCategories((prev) => [...prev, created]);
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    const updated = await api.updateCategory(id, name);
    setCategories((prev) => prev.map((c) => (c.Category_ID === updated.Category_ID ? updated : c)));
  };

  const handleDeleteCategory = async (id: string) => {
    await api.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.Category_ID !== id));
  };

  // New Customer Registration
  const handleRegisterCustomer = async (customerData: Partial<Customer> & { Username?: string }): Promise<Customer> => {
    const newCustomer = await api.createCustomer(customerData);
    setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);
    setIsLoggedIn(true);
    setCurrentRole('customer');
    setActiveTab('storefront');
    setViewMode('app');
    return newCustomer;
  };

  // New Seller Registration
  const handleRegisterSeller = async (sellerData: Partial<Seller> & { Username?: string }): Promise<Seller> => {
    const newSeller = await api.createSeller(sellerData);
    setSellers((prev) => [...prev, newSeller]);
    setSelectedSeller(newSeller);
    setIsLoggedIn(true);
    setCurrentRole('seller');
    setActiveTab('seller-dashboard');
    setViewMode('app');
    return newSeller;
  };

  // New Admin Registration
  const handleRegisterAdmin = async (adminData: Partial<Admin> & { Username?: string }): Promise<Admin> => {
    const newAdmin = await api.createAdmin(adminData);
    setAdmins((prev) => [...prev, newAdmin]);
    setSelectedAdmin(newAdmin);
    setIsLoggedIn(true);
    setCurrentRole('admin');
    setActiveTab('admin-dashboard');
    setViewMode('app');
    return newAdmin;
  };

  // Get active user entity
  const currentUserEntity =
    currentRole === 'customer'
      ? selectedCustomer
      : currentRole === 'seller'
      ? selectedSeller
      : selectedAdmin;

  const defaultAdmin = selectedAdmin || (admins.length > 0 ? admins[0] : {
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
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-mono text-zinc-400">Initializing Raw SQL Database...</p>
      </div>
    );
  }

  // Render Landing Page
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          customers={customers}
          sellers={sellers}
          admin={defaultAdmin}
          admins={admins}
          dbStatus={{ connected: true, provider: 'Raw SQL Database Engine', database: 'marketpulse_db' }}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onEnterAsGuest={() => {
            setViewMode('app');
            setActiveTab('storefront');
          }}
          onOpenCustomerSignup={() => setIsCustomerRegistrationOpen(true)}
          onOpenSellerSignup={() => setIsSellerRegistrationOpen(true)}
          onOpenAdminSignup={() => setIsAdminRegistrationOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <CustomerSignupModal
          isOpen={isCustomerRegistrationOpen}
          onClose={() => setIsCustomerRegistrationOpen(false)}
          onRegisterCustomer={handleRegisterCustomer}
          onSuccessRegistered={(newCustomer) => {
            setSelectedCustomer(newCustomer);
            setIsLoggedIn(true);
            setCurrentRole('customer');
            setActiveTab('storefront');
            setViewMode('app');
          }}
        />

        <SellerSignupModal
          isOpen={isSellerRegistrationOpen}
          onClose={() => setIsSellerRegistrationOpen(false)}
          onRegisterSeller={handleRegisterSeller}
          onSuccessRegistered={(newSeller) => {
            setSelectedSeller(newSeller);
            setIsLoggedIn(true);
            setCurrentRole('seller');
            setActiveTab('seller-dashboard');
            setViewMode('app');
          }}
        />

        <AdminSignupModal
          isOpen={isAdminRegistrationOpen}
          onClose={() => setIsAdminRegistrationOpen(false)}
          onRegisterAdmin={handleRegisterAdmin}
          onSuccessRegistered={(newAdmin) => {
            setSelectedAdmin(newAdmin);
            setIsLoggedIn(true);
            setCurrentRole('admin');
            setActiveTab('admin-dashboard');
            setViewMode('app');
          }}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans flex flex-col antialiased transition-colors duration-200">
      {/* Top Bar with Landing option & Raw SQL status */}
      <div className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400">
        <button
          onClick={() => setViewMode('landing')}
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

      {/* Role Switcher Bar - Notice: In-profile switching is REMOVED when logged in! */}
      <RoleSwitcher
        isLoggedIn={isLoggedIn}
        currentRole={currentRole}
        currentUserEntity={currentUserEntity}
        onOpenCustomerSignup={() => setIsCustomerRegistrationOpen(true)}
        onOpenSellerSignup={() => setIsSellerRegistrationOpen(true)}
        onOpenAdminSignup={() => setIsAdminRegistrationOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Header & Navbar */}
      <Navbar
        isLoggedIn={isLoggedIn}
        currentRole={currentRole}
        currentCustomer={selectedCustomer}
        currentSeller={selectedSeller}
        admin={selectedAdmin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((sum, item) => sum + item.Quantity, 0)}
        onOpenCart={() => {
          if (!isLoggedIn || !selectedCustomer) {
            setIsLoginModalOpen(true);
          } else {
            setIsCartOpen(true);
          }
        }}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* Storefront Tab */}
        {activeTab === 'storefront' && (
          <Storefront
            products={products}
            categories={categories}
            sellers={sellers}
            reviews={reviews}
            onSelectProduct={(p) => setSelectedProductForDetail(p)}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Customer Orders Tab */}
        {activeTab === 'orders' && selectedCustomer && (
          <CustomerOrders currentCustomer={selectedCustomer} orders={orders} />
        )}

        {/* Customer Profile Tab */}
        {activeTab === 'profile' && selectedCustomer && (
          <CustomerProfile
            currentCustomer={selectedCustomer}
            onUpdateCustomer={handleUpdateCustomer}
          />
        )}

        {/* Seller Dashboard Tab */}
        {activeTab === 'seller-dashboard' && selectedSeller && (
          <SellerDashboard
            currentSeller={selectedSeller}
            products={products}
            categories={categories}
            orders={orders}
            reviews={reviews}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateProductStatus={handleUpdateProductStatus}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {/* Admin Dashboard Tab */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard
            sellers={sellers}
            products={products}
            orders={orders}
            categories={categories}
            reviews={reviews}
            onUpdateSellerStatus={handleUpdateSellerStatus}
            onUpdateProductStatus={handleUpdateProductStatus}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onOpenSellerSignup={() => setIsSellerRegistrationOpen(true)}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductForDetail}
        category={categories.find((c) => c.Category_ID === selectedProductForDetail?.Category_ID)}
        seller={sellers.find((s) => s.Seller_ID === selectedProductForDetail?.Seller_ID)}
        reviews={reviews}
        currentCustomer={selectedCustomer || null}
        onClose={() => setSelectedProductForDetail(null)}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Cart Drawer */}
      {selectedCustomer && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={() => setIsCheckoutOpen(true)}
        />
      )}

      {/* Checkout Modal */}
      {selectedCustomer && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          currentCustomer={selectedCustomer}
          cartItems={cart}
          onPlaceOrder={handlePlaceOrder}
          onOrderSuccess={() => {
            setActiveTab('orders');
          }}
        />
      )}

      {/* Customer Signup Modal */}
      <CustomerSignupModal
        isOpen={isCustomerRegistrationOpen}
        onClose={() => setIsCustomerRegistrationOpen(false)}
        onRegisterCustomer={handleRegisterCustomer}
        onSuccessRegistered={(newCustomer) => {
          setSelectedCustomer(newCustomer);
          setIsLoggedIn(true);
          setCurrentRole('customer');
          setActiveTab('storefront');
          setViewMode('app');
        }}
      />

      {/* Seller Signup Modal */}
      <SellerSignupModal
        isOpen={isSellerRegistrationOpen}
        onClose={() => setIsSellerRegistrationOpen(false)}
        onRegisterSeller={handleRegisterSeller}
        onSuccessRegistered={(newSeller) => {
          setSelectedSeller(newSeller);
          setIsLoggedIn(true);
          setCurrentRole('seller');
          setActiveTab('seller-dashboard');
          setViewMode('app');
        }}
      />

      {/* Admin Signup Modal */}
      <AdminSignupModal
        isOpen={isAdminRegistrationOpen}
        onClose={() => setIsAdminRegistrationOpen(false)}
        onRegisterAdmin={handleRegisterAdmin}
        onSuccessRegistered={(newAdmin) => {
          setSelectedAdmin(newAdmin);
          setIsLoggedIn(true);
          setCurrentRole('admin');
          setActiveTab('admin-dashboard');
          setViewMode('app');
        }}
      />

      {/* Login Modal with Username & Password */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
