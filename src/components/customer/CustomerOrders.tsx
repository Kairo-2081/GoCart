import React from 'react';
import { Customer, Order } from '../../types';
import { formatCurrency, formatDate } from '../../lib/api';
import { Package, Truck, CheckCircle2, Clock, MapPin, Search, ChevronRight, AlertCircle } from 'lucide-react';

interface CustomerOrdersProps {
  currentCustomer: Customer;
  orders: Order[];
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({ currentCustomer, orders }) => {
  const [searchTracking, setSearchTracking] = React.useState('');

  const customerOrders = orders.filter((o) => o.Customer_ID === currentCustomer.Customer_ID);

  const filteredOrders = customerOrders.filter((o) => {
    if (!searchTracking.trim()) return true;
    const q = searchTracking.toLowerCase();
    return (
      o.Tracking_ID.toLowerCase().includes(q) ||
      o.Order_ID.toLowerCase().includes(q) ||
      o.Items.some((item) => item.Name.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
            <Truck className="w-3.5 h-3.5" /> Shipped & In Transit
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Processing Order
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Package className="w-3.5 h-3.5" /> Order Placed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Title & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Order History & Tracking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking package dispatches for Customer: <strong className="text-slate-700 dark:text-slate-200">{currentCustomer.Name}</strong> ({currentCustomer.Email})
          </p>
        </div>

        {/* Search by Tracking ID */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTracking}
            onChange={(e) => setSearchTracking(e.target.value)}
            placeholder="Filter by Tracking ID (e.g. TRK-)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No orders found</h3>
          <p className="text-xs text-slate-500">
            {searchTracking ? 'No orders match your search criteria.' : 'You have not placed any orders yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div
              key={order.Order_ID}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Order Bar Header */}
              <div className="p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      ID: {order.Order_ID}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-mono font-extrabold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
                      Tracking #: {order.Tracking_ID}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Placed on {formatDate(order.Order_Placed_At)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {getStatusBadge(order.Status)}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(order.Subtotal + order.Shipping_Fee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Content */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Purchased Items List */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Order Items ({order.Items.length})
                  </h4>

                  <div className="space-y-2">
                    {order.Items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.Image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                            alt={item.Name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{item.Name}</span>
                            <span className="text-slate-500">
                              Quantity: {item.Quantity} • {formatCurrency(item.Price)} each
                            </span>
                          </div>
                        </div>

                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.Price * item.Quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.Additional_Info && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Note: {order.Additional_Info}</span>
                    </div>
                  )}
                </div>

                {/* Shipping & Payment Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Delivery Address
                  </h4>
                  <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">{currentCustomer.Name}</p>
                    <p>{order.Shipping_Address.House_Name}, {order.Shipping_Address.Street}</p>
                    <p>{order.Shipping_Address.City}, {order.Shipping_Address.Postal_Code}</p>
                    {order.Shipping_Address.Additional_Info && (
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        "{order.Shipping_Address.Additional_Info}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.Subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping Fee</span>
                      <span>{order.Shipping_Fee === 0 ? 'FREE' : formatCurrency(order.Shipping_Fee)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
