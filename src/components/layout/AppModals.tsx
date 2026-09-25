import React from 'react';
import { Admin, CartItem, Category, Customer, Order, Product, Review, Seller, UserRole } from '../../types';
import { LoginModal } from '../LoginModal';
import { AdminSignupModal } from '../admin/AdminSignupModal';
import { CustomerSignupModal } from '../customer/CustomerSignupModal';
import { SellerSignupModal } from '../seller/SellerSignupModal';
import { CartDrawer } from '../storefront/CartDrawer';
import { CheckoutModal } from '../storefront/CheckoutModal';
import { ProductDetailModal } from '../storefront/ProductDetailModal';

export type AppModalName = 'cart' | 'checkout' | 'customerSignup' | 'sellerSignup' | 'adminSignup' | 'login';

export interface AppModalState {
  cart: boolean;
  checkout: boolean;
  customerSignup: boolean;
  sellerSignup: boolean;
  adminSignup: boolean;
  login: boolean;
}

interface AppModalsProps {
  modalState: AppModalState;
  setModalOpen: (name: AppModalName, isOpen: boolean) => void;
  isAppView: boolean;
  selectedProduct: Product | null;
  onClearSelectedProduct: () => void;
  categories: Category[];
  sellers: Seller[];
  reviews: Review[];
  currentCustomer: Customer | null;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  onSubmitReview: (productId: string, rating: number, reviewText: string) => Promise<void>;
  onUpdateCartQuantity: (cartId: string, quantity: number) => void;
  onRemoveCartItem: (cartId: string) => void;
  onPlaceOrder: (orderData: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Customer['Address'];
    Billing_Address: Customer['Address'];
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }) => Promise<Order>;
  onOrderSuccess: () => void;
  onRegisterCustomer: (data: Partial<Customer> & { Username?: string }) => Promise<Customer>;
  onRegisterSeller: (data: Partial<Seller> & { Username?: string }) => Promise<Seller>;
  onRegisterAdmin: (data: Partial<Admin> & { Username?: string }) => Promise<Admin>;
  onCustomerRegistered: (customer: Customer) => void;
  onSellerRegistered: (seller: Seller) => void;
  onLoginSuccess: (role: UserRole, entity: any) => void;
}

export function AppModals({
  modalState,
  setModalOpen,
  isAppView,
  selectedProduct,
  onClearSelectedProduct,
  categories,
  sellers,
  reviews,
  currentCustomer,
  cart,
  onAddToCart,
  onSubmitReview,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onPlaceOrder,
  onOrderSuccess,
  onRegisterCustomer,
  onRegisterSeller,
  onRegisterAdmin,
  onCustomerRegistered,
  onSellerRegistered,
  onLoginSuccess,
}: AppModalsProps) {
  return (
    <>
      <ProductDetailModal
        product={isAppView ? selectedProduct : null}
        category={categories.find((category) => category.Category_ID === selectedProduct?.Category_ID)}
        seller={sellers.find((seller) => seller.Seller_ID === selectedProduct?.Seller_ID)}
        reviews={reviews}
        currentCustomer={currentCustomer}
        onClose={onClearSelectedProduct}
        onAddToCart={onAddToCart}
        onSubmitReview={onSubmitReview}
        onOpenLogin={() => setModalOpen('login', true)}
      />

      {currentCustomer && (
        <CartDrawer
          isOpen={isAppView && modalState.cart}
          onClose={() => setModalOpen('cart', false)}
          cartItems={cart}
          onUpdateQuantity={onUpdateCartQuantity}
          onRemoveItem={onRemoveCartItem}
          onCheckout={() => setModalOpen('checkout', true)}
        />
      )}

      {currentCustomer && (
        <CheckoutModal
          isOpen={isAppView && modalState.checkout}
          onClose={() => setModalOpen('checkout', false)}
          currentCustomer={currentCustomer}
          cartItems={cart}
          onPlaceOrder={onPlaceOrder}
          onOrderSuccess={onOrderSuccess}
        />
      )}

      <CustomerSignupModal
        isOpen={modalState.customerSignup}
        onClose={() => setModalOpen('customerSignup', false)}
        onRegisterCustomer={onRegisterCustomer}
        onSuccessRegistered={onCustomerRegistered}
      />

      <SellerSignupModal
        isOpen={modalState.sellerSignup}
        onClose={() => setModalOpen('sellerSignup', false)}
        onRegisterSeller={onRegisterSeller}
        onSuccessRegistered={onSellerRegistered}
      />

      <AdminSignupModal
        isOpen={modalState.adminSignup}
        onClose={() => setModalOpen('adminSignup', false)}
        onRegisterAdmin={onRegisterAdmin}
        onSuccessRegistered={() => setModalOpen('adminSignup', false)}
      />

      <LoginModal
        isOpen={modalState.login}
        onClose={() => setModalOpen('login', false)}
        onLoginSuccess={onLoginSuccess}
      />
    </>
  );
}