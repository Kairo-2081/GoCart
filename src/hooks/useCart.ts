import React from 'react';
import { api } from '../lib/api';
import { CartItem, Customer, Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useCart() {
  const { currentRole, currentUser, isLoggedIn } = useAuth();
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const customerId = currentRole === 'customer'
    ? (currentUser as Customer | null)?.Customer_ID ?? null
    : null;

  const refreshCart = React.useCallback(async () => {
    if (!isLoggedIn || !customerId) {
      setCart([]);
      return [];
    }
    const updatedCart = await api.getCart(customerId);
    setCart(updatedCart);
    return updatedCart;
  }, [customerId, isLoggedIn]);

  React.useEffect(() => {
    let active = true;
    if (!isLoggedIn || !customerId) {
      setCart([]);
      return;
    }

    api.getCart(customerId)
      .then((items) => { if (active) setCart(items); })
      .catch((error) => console.error('Error fetching cart:', error));
    return () => { active = false; };
  }, [customerId, isLoggedIn]);

  const addToCart = React.useCallback(async (product: Product, quantity = 1) => {
    if (!customerId) throw new Error('Please sign in as a customer to add items to your cart.');
    await api.addToCart(customerId, product.Product_ID, quantity);
    return refreshCart();
  }, [customerId, refreshCart]);

  const updateQuantity = React.useCallback(async (cartId: string, quantity: number) => {
    if (!customerId) return;
    if (quantity <= 0) await api.removeFromCart(cartId);
    else await api.updateCartQuantity(cartId, quantity);
    await refreshCart();
  }, [customerId, refreshCart]);

  const removeFromCart = React.useCallback(async (cartId: string) => {
    if (!customerId) return;
    await api.removeFromCart(cartId);
    await refreshCart();
  }, [customerId, refreshCart]);

  return { cart, refreshCart, addToCart, updateQuantity, removeFromCart };
}