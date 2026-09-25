import React from 'react';
import { api } from '../lib/api';
import { AuthEntity, useAuth } from '../contexts/AuthContext';
import {
  Admin,
  Category,
  Customer,
  Order,
  Product,
  ProductStatus,
  Review,
  Seller,
  SellerStatus,
  UserRole,
} from '../types';

interface UseMarketDataOptions {
  refreshCart: () => Promise<unknown>;
}

export function useMarketData({ refreshCart }: UseMarketDataOptions) {
  const { currentRole, currentUser, isLoading: isAuthLoading, isLoggedIn, updateCurrentUser } = useAuth();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [sellers, setSellers] = React.useState<Seller[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const hadAuthenticatedUser = React.useRef(false);

  const loadInitialData = React.useCallback(async () => {
    try {
      const [loadedCategories, loadedSellers, loadedProducts, loadedReviews] = await Promise.all([
        api.getCategories(), api.getSellers(), api.getProducts(), api.getReviews(),
      ]);
      setCategories(loadedCategories);
      setSellers(loadedSellers);
      setProducts(loadedProducts);
      setReviews(loadedReviews);
    } catch (error) {
      console.error('Failed to load public catalog data:', error);
    }
  }, []);

  const loadRoleData = React.useCallback(async (role: UserRole, entity: AuthEntity) => {
    try {
      if (role === 'customer') {
        const customer = entity as Customer;
        setOrders(await api.getOrders({ customerId: customer.Customer_ID }));
      } else if (role === 'seller') {
        const seller = entity as Seller;
        const [sellerProducts, sellerOrders] = await Promise.all([
          api.getProducts({ sellerId: seller.Seller_ID }),
          api.getOrders({ sellerId: seller.Seller_ID }),
        ]);
        setProducts((current) => [
          ...sellerProducts,
          ...current.filter((product) => !sellerProducts.some((item) => item.Product_ID === product.Product_ID)),
        ]);
        setOrders(sellerOrders);
      } else {
        const [allCustomers, allOrders, allAdmins, allProducts] = await Promise.all([
          api.getCustomers(), api.getOrders(), api.getAdmins(), api.getProducts(),
        ]);
        setCustomers(allCustomers);
        setOrders(allOrders);
        setAdmins(allAdmins);
        setProducts(allProducts);
      }
    } catch (error) {
      console.error(`Failed to load ${role} data:`, error);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    void loadInitialData().finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [loadInitialData]);

  React.useEffect(() => {
    if (isAuthLoading) return;
    if (!isLoggedIn || !currentUser) {
      setOrders([]);
      setCustomers([]);
      setAdmins([]);
      if (hadAuthenticatedUser.current) {
        hadAuthenticatedUser.current = false;
        void loadInitialData();
      }
      return;
    }
    hadAuthenticatedUser.current = true;
    void loadRoleData(currentRole, currentUser);
  }, [currentRole, currentUser, isAuthLoading, isLoggedIn, loadInitialData, loadRoleData]);

  const handlePlaceOrder = React.useCallback(async (orderData: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Customer['Address'];
    Billing_Address: Customer['Address'];
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }) => {
    const newOrder = await api.createOrder(orderData);
    setOrders((previous) => [newOrder, ...previous]);
    const [_, updatedProducts] = await Promise.all([refreshCart(), api.getProducts()]);
    setProducts(updatedProducts as Product[]);
    return newOrder;
  }, [refreshCart]);

  const handleSubmitReview = React.useCallback(async (productId: string, rating: number, reviewText: string) => {
    const customer = currentRole === 'customer' ? currentUser as Customer | null : null;
    if (!isLoggedIn || !customer) throw new Error('Please sign in as a customer to leave a review.');
    const newReview = await api.createReview({
      Product_ID: productId,
      Customer_ID: customer.Customer_ID,
      Customer_Name: customer.Name,
      Review_text: reviewText,
      Rating: rating,
    });
    setReviews((previous) => [newReview, ...previous]);
  }, [currentRole, currentUser, isLoggedIn]);

  const handleUpdateCustomer = React.useCallback(async (updated: Customer) => {
    try {
      await api.updateCustomer(updated.Customer_ID, updated);
      updateCurrentUser(updated);
      setCustomers((previous) => previous.map((customer) => customer.Customer_ID === updated.Customer_ID ? updated : customer));
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    }
  }, [updateCurrentUser]);

  const handleSaveProduct = React.useCallback(async (data: Partial<Product>) => {
    if (data.Product_ID) {
      await api.updateProduct(data.Product_ID, data);
      setProducts(await api.getProducts());
    } else {
      const created = await api.createProduct(data);
      setProducts((previous) => [created, ...previous]);
    }
  }, []);

  const handleDeleteProduct = React.useCallback(async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts((previous) => previous.filter((product) => product.Product_ID !== productId));
  }, []);

  const handleUpdateProductStatus = React.useCallback(async (productId: string, status: ProductStatus) => {
    await api.updateProductStatus(productId, status);
    setProducts(await api.getProducts());
  }, []);

  const handleUpdateOrderStatus = React.useCallback(async (orderId: string, status: string) => {
    await api.updateOrderStatus(orderId, status);
    setOrders(await api.getOrders());
  }, []);

  const handleUpdateSellerStatus = React.useCallback(async (sellerId: string, status: SellerStatus) => {
    await api.updateSellerStatus(sellerId, status);
    const updatedSellers = await api.getSellers();
    setSellers(updatedSellers);
    if (currentRole === 'seller' && currentUser && (currentUser as Seller).Seller_ID === sellerId) {
      const refreshedSeller = updatedSellers.find((seller) => seller.Seller_ID === sellerId);
      if (refreshedSeller) updateCurrentUser(refreshedSeller);
    }
  }, [currentRole, currentUser, updateCurrentUser]);

  const handleCreateCategory = React.useCallback(async (name: string) => {
    const created = await api.createCategory(name);
    setCategories((previous) => [...previous, created]);
  }, []);

  const handleUpdateCategory = React.useCallback(async (id: string, name: string) => {
    const updated = await api.updateCategory(id, name);
    setCategories((previous) => previous.map((category) => category.Category_ID === updated.Category_ID ? updated : category));
  }, []);

  const handleDeleteCategory = React.useCallback(async (id: string) => {
    await api.deleteCategory(id);
    setCategories((previous) => previous.filter((category) => category.Category_ID !== id));
  }, []);

  const handleRegisterCustomer = React.useCallback((data: Partial<Customer> & { Username?: string }) => api.createCustomer(data), []);

  const handleRegisterSeller = React.useCallback(async (data: Partial<Seller> & { Username?: string }) => {
    const created = await api.createSeller(data);
    setSellers((previous) => [created, ...previous]);
    return created;
  }, []);

  const handleRegisterAdmin = React.useCallback(async (data: Partial<Admin> & { Username?: string }) => {
    const created = await api.createAdmin(data);
    setAdmins((previous) => [...previous, created]);
    return created;
  }, []);

  return {
    isLoading,
    categories,
    sellers,
    products,
    customers,
    orders,
    reviews,
    admins,
    loadInitialData,
    loadRoleData,
    handlePlaceOrder,
    handleSubmitReview,
    handleUpdateCustomer,
    handleSaveProduct,
    handleDeleteProduct,
    handleUpdateProductStatus,
    handleUpdateOrderStatus,
    handleUpdateSellerStatus,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleRegisterCustomer,
    handleRegisterSeller,
    handleRegisterAdmin,
  };
}