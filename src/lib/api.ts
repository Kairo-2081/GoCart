import { db, rawSql } from '../db/rawSqlDatabase';
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

export { db, rawSql };

// Re-export the API surface using pure client-side Raw SQL statements (No fetch / No REST API)
export const api = {
  // Categories
  getCategories: async (): Promise<Category[]> => db.getCategories(),
  createCategory: async (Name: string): Promise<Category> => db.createCategory(Name),
  updateCategory: async (id: string, Name: string): Promise<Category> => db.updateCategory(id, Name),
  deleteCategory: async (id: string) => db.deleteCategory(id),

  // Sellers
  getSellers: async (): Promise<Seller[]> => db.getSellers(),
  createSeller: async (data: Partial<Seller> & { Username?: string }): Promise<Seller> => db.createSeller(data),
  updateSellerStatus: async (id: string, Status: SellerStatus): Promise<void> => {
    db.updateSellerStatus(id, Status);
  },

  // Products
  getProducts: async (params?: { sellerId?: string; categoryId?: string; search?: string; status?: string }): Promise<Product[]> => {
    let prods = db.getProducts(params);
    if (params?.search) {
      const q = params.search.toLowerCase();
      prods = prods.filter((p) => p.Name.toLowerCase().includes(q) || p.Description.toLowerCase().includes(q));
    }
    return prods;
  },
  createProduct: async (data: Partial<Product>): Promise<Product> => db.createProduct(data),
  updateProduct: async (id: string, data: Partial<Product>): Promise<void> => {
    db.updateProduct(id, data);
  },
  updateProductStatus: async (id: string, Product_Status: ProductStatus): Promise<void> => {
    db.updateProductStatus(id, Product_Status);
  },
  deleteProduct: async (id: string): Promise<{ success: boolean }> => {
    db.deleteProduct(id);
    return { success: true };
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => db.getCustomers(),
  createCustomer: async (data: Partial<Customer> & { Username?: string }): Promise<Customer> => db.createCustomer(data),
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<void> => {
    db.updateCustomer(id, data);
  },

  // Admins
  getAdmins: async (): Promise<Admin[]> => db.getAdmins(),
  createAdmin: async (data: Partial<Admin> & { Username?: string }): Promise<Admin> => db.createAdmin(data),

  // Auth Login: By Username & Password simply!
  login: async (usernameOrEmail: string, password: string, _role?: UserRole): Promise<{ success: boolean; role: UserRole; entity: any; message?: string }> => {
    return db.login(usernameOrEmail, password);
  },

  // Cart
  getCart: async (customerId: string): Promise<CartItem[]> => db.getCart(customerId),
  addToCart: async (Customer_ID: string, Product_ID: string, Quantity: number = 1): Promise<CartItem> =>
    db.addToCart(Customer_ID, Product_ID, Quantity),
  updateCartQuantity: async (cartId: string, Quantity: number): Promise<void> => {
    db.updateCartQuantity(cartId, Quantity);
  },
  removeFromCart: async (cartId: string): Promise<{ success: boolean }> => {
    db.removeFromCart(cartId);
    return { success: true };
  },

  // Orders
  getOrders: async (params?: { customerId?: string; sellerId?: string }): Promise<Order[]> => db.getOrders(params),
  createOrder: async (orderData: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Address;
    Billing_Address: Address;
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }): Promise<Order> => db.createOrder(orderData),
  updateOrderStatus: async (id: string, Status: string): Promise<void> => {
    db.updateOrderStatus(id, Status as OrderStatus);
  },

  // Reviews
  getReviews: async (params?: { productId?: string; sellerId?: string }): Promise<Review[]> => db.getReviews(params),
  createReview: async (data: {
    Product_ID: string;
    Customer_ID: string;
    Customer_Name: string;
    Review_text: string;
    Rating: number;
  }): Promise<Review> => db.createReview(data),

  // Reset Seed
  resetSeed: async (): Promise<{ success: boolean; message: string }> => db.resetSeed(),
};

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
