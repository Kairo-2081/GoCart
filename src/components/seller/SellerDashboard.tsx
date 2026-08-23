import React from 'react';
import { Seller, Product, Order, Review, Category, ProductStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/api';
import { SellerProductModal } from './SellerProductModal';
import { StarRating } from '../StarRating';
import {
  Store,
  Package,
  ShoppingBag,
  Star,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  MapPin,
  Tag,
} from 'lucide-react';

interface SellerDashboardProps {
  currentSeller: Seller;
  products: Product[];
  categories: Category[];
  orders: Order[];
  reviews: Review[];
  onSaveProduct: (data: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateProductStatus: (productId: string, status: ProductStatus) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: string) => Promise<void>;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  currentSeller,
  products,
  categories,
  orders,
  reviews,
  onSaveProduct,
  onDeleteProduct,
  onUpdateProductStatus,
  onUpdateOrderStatus,
}) => {
  const [activeTab, setActiveTab] = React.useState<'products' | 'orders' | 'reviews'>('products');
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [productToEdit, setProductToEdit] = React.useState<Product | null>(null);

  // Filter entities specific to this seller
  const sellerProducts = products.filter((p) => p.Seller_ID === currentSeller.Seller_ID);
  const sellerOrders = orders.filter((o) =>
    o.Items.some((item) => item.Seller_ID === currentSeller.Seller_ID)
  );

  const sellerProductIds = new Set(sellerProducts.map((p) => p.Product_ID));
  const sellerReviews = reviews.filter((r) => sellerProductIds.has(r.Product_ID));

  const totalSalesRevenue = sellerOrders.reduce((sum, order) => {
    const sellerItems = order.Items.filter((i) => i.Seller_ID === currentSeller.Seller_ID);
    return sum + sellerItems.reduce((acc, item) => acc + item.Price * item.Quantity, 0);
  }, 0);

  const avgSellerRating =
    sellerReviews.length > 0
      ? sellerReviews.reduce((sum, r) => sum + r.Rating, 0) / sellerReviews.length
      : 0;

  const getApprovalStatusBanner = () => {
    switch (currentSeller.Status) {
      case 'approved':
        return (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-bold">Account Approved & Verified Live:</strong> Your store is active on MarketPulse storefront catalog.
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
              Live Verified
            </span>
          </div>
        );
      case 'pending':
        return (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="font-bold">Awaiting Admin Approval:</strong> Your seller application is pending review. You can create product listings now, but they will not be visible to customers until Admin approves your account.
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase bg-amber-500 text-white px-2.5 py-1 rounded-lg">
              Pending Review
            </span>
          </div>
        );
      case 'suspended':
      case 'rejected':
        return (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="font-bold">Account Restricted ({currentSeller.Status}):</strong> Your seller account has been flagged by platform administration.
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase bg-rose-600 text-white px-2.5 py-1 rounded-lg">
              Restricted
            </span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Seller Store Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentSeller.Logo}
              alt={currentSeller.Name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {currentSeller.Name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mt-0.5">
                {currentSeller.Description}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                <span>ID: {currentSeller.Seller_ID}</span>
                <span>•</span>
                <span>{currentSeller.Email}</span>
                <span>•</span>
                <span>Member since {formatDate(currentSeller.Created_At)}</span>
              </div>
            </div>
          </div>

          <button
            disabled={currentSeller.Status !== 'approved'}
            onClick={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
              currentSeller.Status !== 'approved'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            }`}
          >
            <Plus className="w-4 h-4" />
            + Add New Product Listing
          </button>
        </div>

        {getApprovalStatusBanner()}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Products Listed
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {sellerProducts.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Sales Revenue
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalSalesRevenue)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Incoming Orders
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {sellerOrders.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Store Rating
            </span>
            <div className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center gap-1">
              {avgSellerRating > 0 ? avgSellerRating.toFixed(1) : 'N/A'}
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Star className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-3 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Catalog Management ({sellerProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          Incoming Orders & Status Fulfillment ({sellerOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-5 py-3 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Star className="w-4 h-4" />
          Customer Product Reviews ({sellerReviews.length})
        </button>
      </div>

      {/* Tab Content */}

      {/* Tab 1: Product Management */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {sellerProducts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No products created yet</h3>
              <p className="text-xs text-slate-500">
                Click "+ Add New Product Listing" above to publish products under your seller brand.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Product Details</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock Inventory</th>
                      <th className="p-4">Voucher</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sellerProducts.map((p) => {
                      const catName = categories.find((c) => c.Category_ID === p.Category_ID)?.Name || 'General';
                      return (
                        <tr key={p.Product_ID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.Image}
                                alt={p.Name}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 dark:border-slate-700"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{p.Name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {p.Product_ID}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{catName}</td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white">{formatCurrency(p.Price)}</td>
                          <td className="p-4 font-semibold">
                            {p.Stock > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">{p.Stock} in stock</span>
                            ) : (
                              <span className="text-rose-600 font-bold">Out of stock</span>
                            )}
                          </td>
                          <td className="p-4">
                            {p.Voucher ? (
                              <span className="bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
                                {p.Voucher}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() =>
                                onUpdateProductStatus(
                                  p.Product_ID,
                                  p.Product_Status === 'active' ? 'inactive' : 'active'
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                p.Product_Status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {p.Product_Status}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setProductToEdit(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${p.Name}" permanently?`)) {
                                    onDeleteProduct(p.Product_ID);
                                  }
                                }}
                                className="p-1.5 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Incoming Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {sellerOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No incoming orders yet</h3>
              <p className="text-xs text-slate-500">
                Orders containing your seller products will appear here for fulfillment status updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerOrders.map((order) => {
                const myItems = order.Items.filter((i) => i.Seller_ID === currentSeller.Seller_ID);
                const myTotal = myItems.reduce((acc, i) => acc + i.Price * i.Quantity, 0);

                return (
                  <div
                    key={order.Order_ID}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          Order #{order.Order_ID}
                        </span>
                        <span className="text-slate-400 ml-2 font-mono">Tracking: {order.Tracking_ID}</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          Placed on {formatDate(order.Order_Placed_At)}
                        </span>
                      </div>

                      {/* Fulfillment Status Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Update Status:</span>
                        <select
                          value={order.Status}
                          onChange={(e) => onUpdateOrderStatus(order.Order_ID, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="placed">Placed (Pending)</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped (In Transit)</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Items from this seller */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="font-semibold text-slate-500 uppercase text-[10px]">Your Products in this order</span>
                        {myItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <span>{item.Quantity}x {item.Name}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.Price * item.Quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="font-semibold text-slate-500 uppercase text-[10px]">Destination Address</span>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {order.Shipping_Address.House_Name}, {order.Shipping_Address.Street}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          {order.Shipping_Address.City}, {order.Shipping_Address.Postal_Code}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {sellerReviews.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Star className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No product reviews yet</h3>
              <p className="text-xs text-slate-500">
                Customer reviews and star ratings left on your products will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sellerReviews.map((rev) => {
                const prod = products.find((p) => p.Product_ID === rev.Product_ID);
                return (
                  <div
                    key={rev.Review_ID}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{rev.Customer_Name}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(rev.Created_At)}</span>
                      </div>
                      <StarRating rating={rev.Rating} size="sm" />
                    </div>

                    {prod && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        Product: {prod.Name}
                      </div>
                    )}

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                      "{rev.Review_text}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Product Create/Edit Modal */}
      <SellerProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
        categories={categories}
        currentSeller={currentSeller}
        onSaveProduct={(data) => onSaveProduct(data)}
      />
    </div>
  );
};
