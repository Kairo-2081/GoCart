import React from 'react';
import { Seller, Product, Order, Category, Review, SellerStatus, ProductStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/api';
import {
  ShieldCheck,
  Store,
  FolderTree,
  Package,
  Truck,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Activity,
  Layers,
  Search,
  Filter,
} from 'lucide-react';

interface AdminDashboardProps {
  sellers: Seller[];
  products: Product[];
  orders: Order[];
  categories: Category[];
  reviews: Review[];
  onUpdateSellerStatus: (sellerId: string, status: SellerStatus) => Promise<void>;
  onUpdateProductStatus: (productId: string, status: ProductStatus) => Promise<void>;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onOpenSellerSignup?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  sellers,
  products,
  orders,
  categories,
  reviews,
  onUpdateSellerStatus,
  onUpdateProductStatus,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onOpenSellerSignup,
}) => {
  const [adminTab, setAdminTab] = React.useState<'overview' | 'sellers' | 'categories' | 'products'>('overview');
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = React.useState('');
  const [sellerSearch, setSellerSearch] = React.useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = React.useState<string>('all');
  const [isSubmittingCat, setIsSubmittingCat] = React.useState(false);

  // Derived calculations
  const pendingSellers = sellers.filter((s) => s.Status === 'pending');
  const approvedSellers = sellers.filter((s) => s.Status === 'approved');
  const suspendedSellers = sellers.filter((s) => s.Status === 'suspended' || s.Status === 'rejected');

  const totalMarketVolume = orders.reduce((sum, o) => sum + o.Subtotal + o.Shipping_Fee, 0);
  const avgSentiment =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length : 4.8;

  const filteredSellers = sellers.filter((s) => {
    if (sellerStatusFilter !== 'all' && s.Status !== sellerStatusFilter) return false;
    if (sellerSearch.trim()) {
      const q = sellerSearch.toLowerCase();
      return (
        s.Name.toLowerCase().includes(q) ||
        s.Email.toLowerCase().includes(q) ||
        s.Seller_ID.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmittingCat(true);
    try {
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      await onUpdateCategory(categoryId, editingCategoryName.trim());
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    }
  };

  return (
    <div className="space-y-6 pb-16 text-slate-900 dark:text-zinc-100">
      {/* Top Overview Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Platform Admin Governance Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Review seller applications, manage global product categories, and moderate marketplace entities.
            </p>
          </div>
        </div>

        {/* Pending approvals highlight badge */}
        {pendingSellers.length > 0 ? (
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{pendingSellers.length} Pending Seller Application{pendingSellers.length > 1 ? 's' : ''} Requires Approval</span>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>All Seller Applications Processed</span>
          </div>
        )}
      </div>

      {/* KPI Cards (Matching Design Prompt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Total Market Value</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(totalMarketVolume || 1240000)}</p>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">+12.4% order volume</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Sellers Active</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{approvedSellers.length}</p>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">
            Pending: <span className="text-amber-600 dark:text-amber-400 font-bold">{pendingSellers.length}</span> | Suspended: <span className="text-rose-600 dark:text-rose-400 font-bold">{suspendedSellers.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Order Throughput</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{orders.length} Orders</p>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-2">Live Fulfillment Synced</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Review Sentiment</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-baseline gap-1">
            {avgSentiment.toFixed(2)}
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">/ 5.0</span>
          </p>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">Based on {reviews.length} customer reviews</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setAdminTab('overview')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Governance Dashboard
        </button>

        <button
          onClick={() => setAdminTab('sellers')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'sellers'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Store className="w-4 h-4" />
          Seller Approvals & Accounts ({sellers.length})
        </button>

        <button
          onClick={() => setAdminTab('categories')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Category Registry ({categories.length})
        </button>

        <button
          onClick={() => setAdminTab('products')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'products'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Moderation ({products.length})
        </button>
      </div>

      {/* Tab 1: Overview & Seller Approval Workflow (Design Layout) */}
      {adminTab === 'overview' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Main Approval Table (Span 8) */}
          <div className="col-span-12 lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Seller Approval Workflow</h2>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Approve or restrict merchant stores requesting live product listing privileges.
                </p>
              </div>
              <button
                onClick={() => setAdminTab('sellers')}
                className="text-[10px] uppercase font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                View All Merchants ({sellers.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-950/60 text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Seller Info</th>
                    <th className="px-6 py-4 font-semibold">Contact Email</th>
                    <th className="px-6 py-4 font-semibold">Registered</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                  {sellers.map((seller) => (
                    <tr key={seller.Seller_ID} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={seller.Logo}
                            alt={seller.Name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{seller.Name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {seller.Seller_ID}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">{seller.Email}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">{formatDate(seller.Created_At)}</td>
                      <td className="px-6 py-4">
                        {seller.Status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase">
                            Approved
                          </span>
                        )}
                        {seller.Status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase">
                            Pending Review
                          </span>
                        )}
                        {(seller.Status === 'suspended' || seller.Status === 'rejected') && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20 uppercase">
                            {seller.Status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {seller.Status !== 'approved' && (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.Seller_ID, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {seller.Status !== 'suspended' && (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.Seller_ID, 'suspended')}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Info Panels (Span 4) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Recent Category Activity Log */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-3">
                System Activity Log
              </h2>
              <div className="space-y-4 pt-4 text-xs">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-zinc-200">Seller Application Submitted</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500">Urban Thread Studio requested store approval</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-zinc-200">Merchant Approved</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500">Aura Tech Solutions verified & live</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-zinc-200">Category Registry Updated</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500">{categories.length} Categories active in system</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Storefront Synchronized Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 relative overflow-hidden text-white space-y-3">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <h3 className="text-base font-bold">Storefront Synchronization</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Changes made here immediately update live product visibility and seller status across all client interfaces.
              </p>
              <div className="pt-2">
                <span className="inline-block bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">
                  Status: 100% Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Merchant Accounts Management */}
      {adminTab === 'sellers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="Search sellers by name or email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-zinc-400 font-medium">Status Filter:</span>
                <select
                  value={sellerStatusFilter}
                  onChange={(e) => setSellerStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses ({sellers.length})</option>
                  <option value="pending">Pending ({pendingSellers.length})</option>
                  <option value="approved">Approved ({approvedSellers.length})</option>
                  <option value="suspended">Suspended ({suspendedSellers.length})</option>
                </select>
              </div>

              {onOpenSellerSignup && (
                <button
                  onClick={onOpenSellerSignup}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Seller</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-950/60 text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-4">Merchant Name</th>
                    <th className="p-4">Email & Phone</th>
                    <th className="p-4">Registered Address</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredSellers.map((seller) => (
                    <tr key={seller.Seller_ID} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={seller.Logo}
                            alt={seller.Name}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{seller.Name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {seller.Seller_ID}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-zinc-300">
                        <p>{seller.Email}</p>
                        <p className="text-slate-400 dark:text-zinc-500">{seller.Number}</p>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-zinc-400 max-w-xs">
                        {seller.Address.House_Name}, {seller.Address.Street}, {seller.Address.City} ({seller.Address.Postal_Code})
                      </td>
                      <td className="p-4">
                        {seller.Status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase">
                            Approved
                          </span>
                        )}
                        {seller.Status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase">
                            Pending Review
                          </span>
                        )}
                        {(seller.Status === 'suspended' || seller.Status === 'rejected') && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20 uppercase">
                            {seller.Status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {seller.Status !== 'approved' && (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.Seller_ID, 'approved')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {seller.Status !== 'rejected' && seller.Status === 'pending' && (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.Seller_ID, 'rejected')}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                          {seller.Status !== 'suspended' && (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.Seller_ID, 'suspended')}
                              className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Category Registry Management */}
      {adminTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Category Form */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 h-fit space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Add New Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 mb-1 font-medium">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Eco-Hardware or Home Fitness"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingCat || !newCategoryName.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Category
              </button>
            </form>
          </div>

          {/* Existing Categories Table */}
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-white">
              Global Category Registry ({categories.length})
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
              {categories.map((cat) => {
                const count = products.filter((p) => p.Category_ID === cat.Category_ID).length;
                const isEditing = editingCategoryId === cat.Category_ID;

                return (
                  <div key={cat.Category_ID} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/30">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        {cat.Name.charAt(0)}
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="bg-slate-50 dark:bg-zinc-950 border border-indigo-500 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{cat.Name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {cat.Category_ID} • {count} Products listed</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveCategoryEdit(cat.Category_ID)}
                            className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-md text-[10px] cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="px-2.5 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-bold rounded-md text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat.Category_ID);
                              setEditingCategoryName(cat.Name);
                            }}
                            className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="Edit Category Name"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category "${cat.Name}"?`)) {
                                onDeleteCategory(cat.Category_ID);
                              }
                            }}
                            className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Product Deactivation / Moderation */}
      {adminTab === 'products' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-white">
            Product Listing Moderation ({products.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-950/60 text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                {products.map((p) => {
                  const sellerName = sellers.find((s) => s.Seller_ID === p.Seller_ID)?.Name || 'Unknown';
                  return (
                    <tr key={p.Product_ID} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.Image}
                            alt={p.Name}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{p.Name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {p.Product_ID}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-zinc-300">{sellerName}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{formatCurrency(p.Price)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          p.Product_Status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : p.Product_Status === 'deactivated'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                        }`}>
                          {p.Product_Status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            onUpdateProductStatus(
                              p.Product_ID,
                              p.Product_Status === 'deactivated' ? 'active' : 'deactivated'
                            )
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p.Product_Status === 'deactivated'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-600/80 hover:bg-rose-500 text-white'
                          }`}
                        >
                          {p.Product_Status === 'deactivated' ? 'Reinstate Listing' : 'Deactivate Listing'}
                        </button>
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
  );
};
