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
  UserRole,
} from '../types';

const AUTH_TOKEN_KEY = 'marketpulse_auth_token';

export function getAuthToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function storeAuthToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) clearAuthToken();
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
  return res.json();
}

interface AuthEnvelope<T> {
  success: boolean;
  token: string;
  expiresIn: number;
  role: UserRole;
  entity: T;
}

async function registerAndAuthenticate<T>(url: string, data: unknown): Promise<T> {
  const response = await fetchJson<AuthEnvelope<T>>(url, { method: 'POST', body: JSON.stringify(data) });
  if (response.success && response.token) storeAuthToken(response.token);
  return response.entity;
}

// Full-stack API Client connected directly to Cloud SQL (PostgreSQL)
export const api = {
  // Database Status
  getDbStatus: async () => fetchJson<{ connected: boolean; provider: string; database: string }>('/api/db/status'),

  // Categories
  getCategories: async (): Promise<Category[]> => fetchJson<Category[]>('/api/categories'),
  createCategory: async (Name: string): Promise<Category> =>
    fetchJson<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ Name }),
    }),
  updateCategory: async (id: string, Name: string): Promise<Category> =>
    fetchJson<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ Name }),
    }),
  deleteCategory: async (id: string) =>
    fetchJson<{ success: boolean }>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Sellers
  getSellers: async (): Promise<Seller[]> => fetchJson<Seller[]>('/api/sellers'),
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
    return fetchJson<Product[]>(`/api/products${queryString ? `?${queryString}` : ''}`);
  },
  createProduct: async (data: Partial<Product>): Promise<Product> =>
    fetchJson<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> =>
    fetchJson<Product>(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProductStatus: async (id: string, Product_Status: ProductStatus): Promise<{ success: boolean; id: string; Product_Status: ProductStatus }> =>
    fetchJson<{ success: boolean; id: string; Product_Status: ProductStatus }>(`/api/products/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ Product_Status }) }),
  deleteProduct: async (id: string): Promise<{ success: boolean }> =>
    fetchJson<{ success: boolean }>(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Customers
  getCustomers: async (): Promise<Customer[]> => fetchJson<Customer[]>('/api/customers'),
  createCustomer: async (data: Partial<Customer> & { Username?: string }): Promise<Customer> =>
    registerAndAuthenticate<Customer>('/api/customers', data),
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> =>
    fetchJson<Customer>(`/api/customers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Admins
  getAdmins: async (): Promise<Admin[]> => fetchJson<Admin[]>('/api/admins'),
  createAdmin: async (data: Partial<Admin> & { Username?: string }): Promise<Admin> =>
    registerAndAuthenticate<Admin>('/api/admins', data),

  // Auth Login: Across all devices with Cloud SQL Postgres
  login: async (usernameOrEmail: string, password: string, role?: UserRole): Promise<{ success: boolean; token: string; expiresIn: number; role: UserRole; entity: any; message?: string }> => {
    const result = await fetchJson<{ success: boolean; token: string; expiresIn: number; role: UserRole; entity: any; message?: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: usernameOrEmail, password, role }),
    });
    if (result.success && result.token) storeAuthToken(result.token);
    return result;
  },
  getCurrentUser: async (): Promise<{ authenticated: boolean; user: { role: UserRole; entity: Customer | Seller | Admin } | null }> =>
    fetchJson('/api/auth/me'),
  logout: clearAuthToken,

  // Cart
  getCart: async (customerId: string): Promise<CartItem[]> =>
    fetchJson<CartItem[]>(`/api/cart?customerId=${encodeURIComponent(customerId)}`),
  addToCart: async (Customer_ID: string, Product_ID: string, Quantity: number = 1): Promise<CartItem> =>
    fetchJson<CartItem>('/api/cart', { method: 'POST', body: JSON.stringify({ Customer_ID, Product_ID, Quantity }) }),
  updateCartQuantity: async (cartId: string, Quantity: number): Promise<void> => {
    await fetchJson(`/api/cart/${encodeURIComponent(cartId)}`, { method: 'PUT', body: JSON.stringify({ Quantity }) });
  },
  removeFromCart: async (cartId: string): Promise<{ success: boolean }> =>
    fetchJson<{ success: boolean }>(`/api/cart/${encodeURIComponent(cartId)}`, { method: 'DELETE' }),

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
    return fetchJson<Review[]>(`/api/reviews${queryString ? `?${queryString}` : ''}`);
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
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

