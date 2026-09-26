import {
  Admin,
  Category,
  Seller,
  Customer,
  Product,
  Review,
  Order,
  CartItem,
  Address,
  SellerStatus,
  ProductStatus,
  OrderStatus,
  TopRatedProduct,
  TopSeller,
  TrendingProduct,
  UserRole,
} from '../types';
import { db as localDb } from '../db/rawSqlDatabase';

const AUTH_SESSION_MARKER_KEY = 'marketpulse_session_active';
const LEGACY_AUTH_TOKEN_KEY = 'marketpulse_auth_token';
const PUBLIC_API_REQUESTS = new Set([
  'POST /api/auth/login',
  'POST /api/customers',
  'POST /api/sellers',
]);
const SESSION_BOOTSTRAP_REQUESTS = new Set([
  'POST /api/auth/login',
  'POST /api/customers',
  'POST /api/sellers',
]);

export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  return window.localStorage.getItem(AUTH_SESSION_MARKER_KEY) === '1';
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_SESSION_MARKER_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
}

function storeSessionMarker(): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(AUTH_SESSION_MARKER_KEY, '1');
}

function notifyUnauthorized(): void {
  const hadStoredToken = hasStoredSession();
  clearAuthToken();
  if (hadStoredToken && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('marketpulse:unauthorized'));
  }
}

function getRequestKey(url: string, method?: string): string {
  const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const path = new URL(url, baseUrl).pathname.replace(/\/+$/, '') || '/';
  return `${(method || 'GET').toUpperCase()} ${path}`;
}

async function validateSessionBeforeRequest(): Promise<void> {
  const response = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized();
    throw new Error(`Session validation failed (HTTP ${response.status})`);
  }
  const session = await response.json();
  if (!session?.authenticated || !session.user) {
    notifyUnauthorized();
    throw new Error('Unauthorized: Missing or invalid token');
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  const requestKey = getRequestKey(url, method);
  const isPublic = PUBLIC_API_REQUESTS.has(requestKey);
  const isSessionBootstrap = SESSION_BOOTSTRAP_REQUESTS.has(requestKey);
  const hasSession = hasStoredSession();

  if (hasSession && !isSessionBootstrap) await validateSessionBeforeRequest();
  if (!hasSession && !isPublic) {
    notifyUnauthorized();
    throw new Error('Unauthorized: Missing or invalid token');
  }

  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  if (!res.ok) {
    if (res.status === 401) {
      notifyUnauthorized();
    }
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.error) errorMsg = errorData.error;
      else if (errorData?.message) errorMsg = errorData.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function withLocalCatalogFallback<T>(request: Promise<T>, getLocalData: () => T): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (typeof window === 'undefined' || !hasStoredSession()) throw error;
    await validateSessionBeforeRequest();
    console.warn('Catalog API unavailable; using the local SQL catalog.', error);
    return getLocalData();
  }
}

interface AuthEnvelope<T> {
  success: boolean;
  expiresIn: number;
  role: UserRole;
  entity: T;
}

async function registerAndAuthenticate<T>(url: string, data: unknown): Promise<T> {
  const response = await fetchJson<AuthEnvelope<T>>(url, { method: 'POST', body: JSON.stringify(data) });
  if (response.success) storeSessionMarker();
  return response.entity;
}

// Full-stack API Client connected directly to Cloud SQL (PostgreSQL)
export const api = {
  // Database Status
  getDbStatus: async () => fetchJson<{ connected: boolean; provider: string; database: string }>('/api/db/status'),

  // Categories
  getCategories: async (): Promise<Category[]> =>
    withLocalCatalogFallback(fetchJson<Category[]>('/api/categories'), () => localDb.getCategories()),
  createCategory: async (Name: string): Promise<Category> =>
    fetchJson<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ Name }),
    }),
  updateCategory: async (id: string, Name: string): Promise<Category> =>
    fetchJson<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ Name }),
    }),
  deleteCategory: async (id: string) =>
    fetchJson<void>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Sellers
  getSellers: async (): Promise<Seller[]> =>
    withLocalCatalogFallback(fetchJson<Seller[]>('/api/sellers'), () =>
      localDb.getSellers().map(({ Password: _password, ...seller }) => seller)),
  createSeller: async (data: Partial<Seller> & { Username?: string }): Promise<Seller> =>
    registerAndAuthenticate<Seller>('/api/sellers', data),
  updateSellerStatus: async (id: string, Status: SellerStatus): Promise<{ Seller_ID: string; Status: string }> =>
    fetchJson<{ Seller_ID: string; Status: string }>(`/api/sellers/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ Status }),
    }),

  // Products
  getProducts: async (params?: { sellerId?: string; categoryId?: string; search?: string; status?: string }): Promise<Product[]> => {
    const searchParams = new URLSearchParams();
    if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
    if (params?.categoryId && params.categoryId !== 'all') searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    const queryString = searchParams.toString();
    return withLocalCatalogFallback(
      fetchJson<Product[]>(`/api/products${queryString ? `?${queryString}` : ''}`),
      () => localDb.getProducts(params)
        .filter((product) => product.Product_Status === 'active')
        .filter((product) => !params?.search || product.Name.toLowerCase().includes(params.search.toLowerCase()) || product.Description.toLowerCase().includes(params.search.toLowerCase()))
    );
  },
  getTopRatedProducts: async (): Promise<TopRatedProduct[]> =>
    withLocalCatalogFallback(fetchJson<TopRatedProduct[]>('/api/stats/top-products'), () => {
      const categories = localDb.getCategories();
      const sellers = localDb.getSellers();
      return localDb.getProducts()
        .filter((product) => product.Product_Status === 'active')
        .flatMap((product) => {
          const seller = sellers.find((item) => item.Seller_ID === product.Seller_ID);
          const productReviews = localDb.getReviews({ productId: product.Product_ID });
          if (seller?.Status !== 'approved' || productReviews.length < 3) return [];
          return [{
            product_id: product.Product_ID,
            product_name: product.Name,
            category_name: categories.find((item) => item.Category_ID === product.Category_ID)?.Name || 'General',
            seller_name: seller.Name,
            price: product.Price,
            average_rating: Math.round(productReviews.reduce((sum, review) => sum + review.Rating, 0) / productReviews.length * 10) / 10,
            total_reviews: productReviews.length,
          }];
        })
        .sort((left, right) => right.average_rating - left.average_rating || right.total_reviews - left.total_reviews)
        .slice(0, 12);
    }),
  getTopSellers: async (): Promise<TopSeller[]> =>
    withLocalCatalogFallback(fetchJson<TopSeller[]>('/api/stats/top-sellers'), () => {
      const products = localDb.getProducts().filter((product) => product.Product_Status === 'active');
      const reviews = localDb.getReviews();
      return localDb.getSellers()
        .filter((seller) => seller.Status === 'approved')
        .flatMap((seller) => {
          const sellerProducts = products.filter((product) => product.Seller_ID === seller.Seller_ID);
          const productIds = new Set(sellerProducts.map((product) => product.Product_ID));
          const sellerReviews = reviews.filter((review) => productIds.has(review.Product_ID));
          if (sellerReviews.length < 5) return [];
          return [{
            seller_id: seller.Seller_ID,
            seller_name: seller.Name,
            total_active_products: sellerProducts.length,
            total_lifetime_reviews: sellerReviews.length,
            overall_average_rating: Math.round(sellerReviews.reduce((sum, review) => sum + review.Rating, 0) / sellerReviews.length * 100) / 100,
          }];
        })
        .sort((left, right) => right.overall_average_rating - left.overall_average_rating || right.total_lifetime_reviews - left.total_lifetime_reviews)
        .slice(0, 10);
    }),
  getTrendingProducts: async (): Promise<TrendingProduct[]> =>
    withLocalCatalogFallback(fetchJson<TrendingProduct[]>('/api/stats/trending-products'), () => {
      const categories = localDb.getCategories();
      const products = localDb.getProducts().filter((product) => product.Product_Status === 'active');
      const cartRows = localDb.query<{ customer_id: string; product_id: string; quantity: number }>(
        'SELECT customer_id, product_id, quantity FROM cart'
      ).rows;
      const demandByProduct = new Map<string, { customers: Set<string>; units: number }>();
      for (const cartRow of cartRows) {
        const demand = demandByProduct.get(cartRow.product_id) || { customers: new Set<string>(), units: 0 };
        demand.customers.add(cartRow.customer_id);
        demand.units += Number(cartRow.quantity) || 0;
        demandByProduct.set(cartRow.product_id, demand);
      }
      return products.flatMap((product) => {
        const demand = demandByProduct.get(product.Product_ID);
        const category = categories.find((item) => item.Category_ID === product.Category_ID);
        if (!demand || !category) return [];
        return [{
          product_id: product.Product_ID,
          product_name: product.Name,
          category_name: category.Name,
          price: product.Price,
          available_stock: product.Stock,
          distinct_customers_wanting_this: demand.customers.size,
          total_units_in_carts: demand.units,
        }];
      })
        .sort((left, right) => right.total_units_in_carts - left.total_units_in_carts || right.distinct_customers_wanting_this - left.distinct_customers_wanting_this)
        .slice(0, 10);
    }),
  createProduct: async (data: Partial<Product>): Promise<Product> =>
    fetchJson<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> =>
    fetchJson<Product>(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateProductStatus: async (id: string, Product_Status: ProductStatus): Promise<{ success: boolean; id: string; Product_Status: ProductStatus }> =>
    fetchJson<{ success: boolean; id: string; Product_Status: ProductStatus }>(`/api/products/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ Product_Status }) }),
  deleteProduct: async (id: string): Promise<void> =>
    fetchJson<void>(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Customers
  getCustomers: async (): Promise<Customer[]> => fetchJson<Customer[]>('/api/customers'),
  createCustomer: async (data: Partial<Customer> & { Username?: string }): Promise<Customer> =>
    registerAndAuthenticate<Customer>('/api/customers', data),
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> =>
    fetchJson<Customer>(`/api/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Admins
  getAdmins: async (): Promise<Admin[]> => fetchJson<Admin[]>('/api/admins'),
  createAdmin: async (data: Partial<Admin> & { Username?: string }): Promise<Admin> =>
    registerAndAuthenticate<Admin>('/api/admins', data),

  // Auth Login: Across all devices with Cloud SQL Postgres
  login: async (usernameOrEmail: string, password: string): Promise<{ success: boolean; expiresIn: number; role: UserRole; entity: any; message?: string }> => {
    const result = await fetchJson<{ success: boolean; expiresIn: number; role: UserRole; entity: any; message?: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: usernameOrEmail, password }),
    });
    if (result.success) storeSessionMarker();
    return result;
  },
  getCurrentUser: async (): Promise<{ authenticated: boolean; user: { role: UserRole; entity: Customer | Seller | Admin } | null }> =>
    fetchJson('/api/auth/me'),
  logout: async (): Promise<void> => {
    if (hasStoredSession()) {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status === 401) {
        clearAuthToken();
        return;
      }
      if (!response.ok) throw new Error('Could not invalidate the server session. Please try logging out again.');
    }
    clearAuthToken();
  },

  // Cart
  getCart: async (customerId: string): Promise<CartItem[]> =>
    fetchJson<CartItem[]>(`/api/cart?customerId=${encodeURIComponent(customerId)}`),
  addToCart: async (Customer_ID: string, Product_ID: string, Quantity: number = 1): Promise<CartItem> =>
    fetchJson<CartItem>('/api/cart', { method: 'POST', body: JSON.stringify({ Customer_ID, Product_ID, Quantity }) }),
  updateCartQuantity: async (cartId: string, Quantity: number): Promise<void> => {
    await fetchJson(`/api/cart/${encodeURIComponent(cartId)}`, { method: 'PATCH', body: JSON.stringify({ Quantity }) });
  },
  removeFromCart: async (cartId: string): Promise<void> =>
    fetchJson<void>(`/api/cart/${encodeURIComponent(cartId)}`, { method: 'DELETE' }),

  // Orders
  getOrders: async (params?: { customerId?: string; sellerId?: string }): Promise<Order[]> => {
    const searchParams = new URLSearchParams();
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
    const queryString = searchParams.toString();
    return fetchJson<Order[]>(`/api/orders${queryString ? `?${queryString}` : ''}`);
  },
  createOrder: async (orderData: { Customer_ID: string; Items: any[]; Shipping_Address: Address; Billing_Address: Address; Subtotal: number; Shipping_Fee: number; Additional_Info?: string }): Promise<Order> =>
    fetchJson<Order>('/api/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  updateOrderStatus: async (id: string, Status: string): Promise<void> => {
    await fetchJson(`/api/orders/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ Status }) });
  },

  // Reviews
  getReviews: async (params?: { productId?: string; sellerId?: string }): Promise<Review[]> => {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
    const queryString = searchParams.toString();
    return withLocalCatalogFallback(fetchJson<Review[]>(`/api/reviews${queryString ? `?${queryString}` : ''}`), () => {
      const localReviews = localDb.getReviews({ productId: params?.productId });
      if (!params?.sellerId || params.productId) return localReviews;
      const sellerProductIds = new Set(localDb.getProducts({ sellerId: params.sellerId }).map((product) => product.Product_ID));
      return localReviews.filter((review) => sellerProductIds.has(review.Product_ID));
    });
  },
  createReview: async (data: { Product_ID: string; Customer_ID: string; Customer_Name: string; Review_text: string; Rating: number }): Promise<Review> =>
    fetchJson<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Admin-only operations
  getStats: async (): Promise<any> => fetchJson<any>('/api/stats'),
  resetSeed: async (): Promise<{ success: boolean; message: string }> =>
    fetchJson<{ success: boolean; message: string }>('/api/reset-seed', { method: 'POST' }),
};

export const db = api;

export function formatCurrency(amount: number): string {
  const formattedAmount = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Tk ${formattedAmount}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

