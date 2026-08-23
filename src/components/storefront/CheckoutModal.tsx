import React from 'react';
import { Customer, CartItem, Address, Order } from '../../types';
import { formatCurrency } from '../../lib/api';
import { X, CheckCircle2, Truck, ShieldCheck, MapPin, CreditCard, ArrowRight, Package } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer: Customer;
  cartItems: CartItem[];
  onPlaceOrder: (orderData: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Address;
    Billing_Address: Address;
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }) => Promise<Order>;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  currentCustomer,
  cartItems,
  onPlaceOrder,
  onOrderSuccess,
}) => {
  const [shippingAddress, setShippingAddress] = React.useState<Address>({
    Street: currentCustomer.Address?.Street || '',
    House_Name: currentCustomer.Address?.House_Name || '',
    City: currentCustomer.Address?.City || '',
    Postal_Code: currentCustomer.Address?.Postal_Code || '',
    Additional_Info: currentCustomer.Address?.Additional_Info || '',
  });

  const [useSameBilling, setUseSameBilling] = React.useState(true);
  const [billingAddress, setBillingAddress] = React.useState<Address>({
    Street: currentCustomer.Address?.Street || '',
    House_Name: currentCustomer.Address?.House_Name || '',
    City: currentCustomer.Address?.City || '',
    Postal_Code: currentCustomer.Address?.Postal_Code || '',
    Additional_Info: '',
  });

  const [additionalNotes, setAdditionalNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdOrder, setCreatedOrder] = React.useState<Order | null>(null);

  React.useEffect(() => {
    if (currentCustomer.Address) {
      setShippingAddress({
        Street: currentCustomer.Address.Street || '',
        House_Name: currentCustomer.Address.House_Name || '',
        City: currentCustomer.Address.City || '',
        Postal_Code: currentCustomer.Address.Postal_Code || '',
        Additional_Info: currentCustomer.Address.Additional_Info || '',
      });
    }
  }, [currentCustomer]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.Product?.Price || 0;
    return acc + price * item.Quantity;
  }, 0);

  const shippingFee = subtotal > 150 ? 0 : 5.0;
  const grandTotal = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress.Street || !shippingAddress.City || !shippingAddress.Postal_Code) {
      alert('Please complete all required shipping address fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cartItems.map((item) => ({
        Product_ID: item.Product_ID,
        Name: item.Product?.Name || 'Product',
        Price: item.Product?.Price || 0,
        Quantity: item.Quantity,
        Image: item.Product?.Image || '',
        Seller_ID: item.Product?.Seller_ID || '',
      }));

      const order = await onPlaceOrder({
        Customer_ID: currentCustomer.Customer_ID,
        Items: orderItems,
        Shipping_Address: shippingAddress,
        Billing_Address: useSameBilling ? shippingAddress : billingAddress,
        Subtotal: subtotal,
        Shipping_Fee: shippingFee,
        Additional_Info: additionalNotes,
      });

      setCreatedOrder(order);
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Secure Checkout Flow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {createdOrder ? (
            /* Order Success State */
            <div className="text-center py-10 space-y-6 max-w-lg mx-auto animate-fade-in">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Order Placed Successfully!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Thank you, <strong className="text-slate-700 dark:text-slate-200">{currentCustomer.Name}</strong>. Your order is registered in the system.
                </p>
              </div>

              {/* Tracking ID Badge */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-center space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                  Unique Package Tracking ID
                </span>
                <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-widest">
                  {createdOrder.Tracking_ID}
                </div>
                <p className="text-[11px] text-slate-500">
                  Status: <span className="font-semibold text-emerald-600 uppercase">Order Placed</span> • Estimated Dispatch: 24 Hours
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination Address:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    {createdOrder.Shipping_Address.House_Name}, {createdOrder.Shipping_Address.Street}, {createdOrder.Shipping_Address.City} ({createdOrder.Shipping_Address.Postal_Code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal + Fee:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(createdOrder.Subtotal + createdOrder.Shipping_Fee)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    onOrderSuccess(createdOrder);
                    onClose();
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" /> View My Orders & Live Tracking
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Purchasing Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{currentCustomer.Name}</span>
                  <span className="text-slate-500 block">{currentCustomer.Email} • {currentCustomer.Number}</span>
                </div>
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  {currentCustomer.Customer_ID}
                </span>
              </div>

              {/* Shipping Address Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Shipping Address (Linked to Address Entity)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">House / Apartment / Unit</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.House_Name}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, House_Name: e.target.value })}
                      placeholder="e.g. Apt 4B or Villa 12"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Street Address</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.Street}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, Street: e.target.value })}
                      placeholder="e.g. 742 Evergreen Terrace"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">City</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.City}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, City: e.target.value })}
                      placeholder="e.g. Springfield"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Postal / ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.Postal_Code}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, Postal_Code: e.target.value })}
                      placeholder="e.g. 97477"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium text-xs">Delivery Instructions / Additional Info</label>
                  <input
                    type="text"
                    value={shippingAddress.Additional_Info}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, Additional_Info: e.target.value })}
                    placeholder="e.g. Leave package at front gate or call upon arrival"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Billing Address Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={useSameBilling}
                    onChange={(e) => setUseSameBilling(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Billing address same as shipping address
                </label>

                {!useSameBilling && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Billing Address</span>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="House / Unit"
                        value={billingAddress.House_Name}
                        onChange={(e) => setBillingAddress({ ...billingAddress, House_Name: e.target.value })}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={billingAddress.Street}
                        onChange={(e) => setBillingAddress({ ...billingAddress, Street: e.target.value })}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={billingAddress.City}
                        onChange={(e) => setBillingAddress({ ...billingAddress, City: e.target.value })}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={billingAddress.Postal_Code}
                        onChange={(e) => setBillingAddress({ ...billingAddress, Postal_Code: e.target.value })}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items & Fee Summary */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Order Summary ({cartItems.length} Products)
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.Cart_ID} className="flex justify-between items-center text-xs">
                      <span className="truncate max-w-[240px] text-slate-700 dark:text-slate-300">
                        {item.Quantity}x {item.Product?.Name}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency((item.Product?.Price || 0) * item.Quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Shipping Fee</span>
                    <span>{shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1">
                    <span>Total Charged</span>
                    <span className="text-blue-600 dark:text-blue-400 text-base">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-98"
                >
                  {isSubmitting ? (
                    'Generating Order & Tracking ID...'
                  ) : (
                    <>
                      <span>Confirm & Place Order ({formatCurrency(grandTotal)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
