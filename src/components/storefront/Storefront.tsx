import React from 'react';
import { Product, Category, Seller, Review } from '../../types';
import { ProductCard } from './ProductCard';
import { formatCurrency } from '../../lib/api';
import { Search, Sparkles, SlidersHorizontal, ShoppingBag } from 'lucide-react';

interface StorefrontProps {
  products: Product[];
  categories: Category[];
  sellers: Seller[];
  reviews: Review[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  products,
  categories,
  sellers,
  reviews,
  onSelectProduct,
  onAddToCart,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stockFilter, setStockFilter] = React.useState<'all' | 'inStock'>('all');
  const [maxPrice, setMaxPrice] = React.useState<number>(500);

  // Approved sellers for storefront view
  const approvedSellerIds = new Set(
    sellers.filter((s) => s.Status === 'approved').map((s) => s.Seller_ID)
  );

  const filteredProducts = products.filter((p) => {
    // Only show active products from approved sellers in storefront
    if (!approvedSellerIds.has(p.Seller_ID)) return false;
    if (p.Product_Status === 'deactivated') return false;

    if (selectedCategory !== 'all' && p.Category_ID !== selectedCategory) return false;
    if (stockFilter === 'inStock' && p.Stock <= 0) return false;
    if (p.Price > maxPrice) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.Name.toLowerCase().includes(q);
      const matchDesc = p.Description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 text-slate-900 dark:text-zinc-100">
      {/* Search & Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            GoCart Storefront • <span className="underline underline-offset-3 decoration-indigo-400/80 font-serif italic">a scalable, multi-vendor e-commerce marketplace</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Discover Quality Products & Verified Merchants
            </h1>
            <p className="text-zinc-300 text-xs md:text-sm mt-2 leading-relaxed">
              Explore authentic merchandise across categories with real-time stock levels, reviews, and encrypted tracking.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, specs, or merchant..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Category Pills & Sub-filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              All Categories ({products.filter((p) => approvedSellerIds.has(p.Seller_ID) && p.Product_Status !== 'deactivated').length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) => p.Category_ID === cat.Category_ID && approvedSellerIds.has(p.Seller_ID) && p.Product_Status !== 'deactivated'
              ).length;
              return (
                <button
                  key={cat.Category_ID}
                  onClick={() => setSelectedCategory(cat.Category_ID)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.Category_ID
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  {cat.Name} ({count})
                </button>
              );
            })}
          </div>

          {/* Sub-filters (Price slider & Stock Toggle) */}
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs shadow-xs">
            <div className="flex items-center gap-2 px-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="text-slate-600 dark:text-zinc-400 font-medium">Max Price:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(maxPrice)}</span>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 accent-indigo-600 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setStockFilter(stockFilter === 'all' ? 'inStock' : 'all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                stockFilter === 'inStock'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {stockFilter === 'inStock' ? '✓ In Stock Only' : 'Show All Stock'}
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No products found</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search query, price filter, or selecting another category.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setMaxPrice(500);
              setStockFilter('all');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Catalog Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.Product_ID}
              product={prod}
              category={categories.find((c) => c.Category_ID === prod.Category_ID)}
              seller={sellers.find((s) => s.Seller_ID === prod.Seller_ID)}
              reviews={reviews}
              onSelect={onSelectProduct}
              onAddToCart={(p, e) => {
                e.stopPropagation();
                onAddToCart(p, 1);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
