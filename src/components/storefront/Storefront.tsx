import React from 'react';
import { Product, Category, Seller, Review } from '../../types';
import { ProductCard } from './ProductCard';
import { formatCurrency } from '../../lib/api';
import { Search, Sparkles, SlidersHorizontal, ShoppingBag, ArrowUpDown, X, Check } from 'lucide-react';

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
  const [sortBy, setSortBy] = React.useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('featured');
  
  // Calculate dynamic highest price from available products
  const maxPossiblePrice = React.useMemo(() => {
    if (products.length === 0) return 1000;
    const highest = Math.max(...products.map((p) => Number(p.Price) || 0));
    return Math.ceil(Math.max(highest + 50, 500));
  }, [products]);

  const [maxPrice, setMaxPrice] = React.useState<number>(1000);

  // Update maxPrice whenever maxPossiblePrice updates if initial
  React.useEffect(() => {
    setMaxPrice((prev) => (prev < maxPossiblePrice ? maxPossiblePrice : prev));
  }, [maxPossiblePrice]);

  // Approved sellers for storefront view (safe check - if sellers list is empty or seller is approved)
  const approvedSellerIds = React.useMemo(() => {
    const set = new Set<string>();
    sellers.forEach((s) => {
      if (!s.Status || s.Status.toLowerCase() === 'approved') {
        set.add(s.Seller_ID);
      }
    });
    return set;
  }, [sellers]);

  // Compute average ratings map for sorting
  const ratingMap = React.useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const prodRevs = reviews.filter((r) => r.Product_ID === p.Product_ID);
      const avg = prodRevs.length > 0 ? prodRevs.reduce((sum, r) => sum + r.Rating, 0) / prodRevs.length : 0;
      map.set(p.Product_ID, avg);
    });
    return map;
  }, [products, reviews]);

  const filteredProducts = React.useMemo(() => {
    const list = products.filter((p) => {
      // If sellers exist and product has seller, ensure seller is approved
      if (sellers.length > 0 && p.Seller_ID && approvedSellerIds.size > 0) {
        if (!approvedSellerIds.has(p.Seller_ID)) return false;
      }
      
      // Filter deactivated products
      if (p.Product_Status && p.Product_Status.toLowerCase() === 'deactivated') return false;

      // Filter by category
      if (selectedCategory !== 'all' && p.Category_ID !== selectedCategory) return false;

      // Filter by stock
      if (stockFilter === 'inStock' && Number(p.Stock) <= 0) return false;

      // Filter by price
      if (Number(p.Price) > maxPrice) return false;

      // Search query across name, description, category and merchant
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.Name || '').toLowerCase().includes(q);
        const matchDesc = (p.Description || '').toLowerCase().includes(q);
        const cat = categories.find((c) => c.Category_ID === p.Category_ID);
        const matchCat = cat ? cat.Name.toLowerCase().includes(q) : false;
        const sel = sellers.find((s) => s.Seller_ID === p.Seller_ID);
        const matchSel = sel ? sel.Name.toLowerCase().includes(q) : false;
        return matchName || matchDesc || matchCat || matchSel;
      }
      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.Price) - Number(b.Price);
      if (sortBy === 'price-desc') return Number(b.Price) - Number(a.Price);
      if (sortBy === 'rating') return (ratingMap.get(b.Product_ID) || 0) - (ratingMap.get(a.Product_ID) || 0);
      if (sortBy === 'newest') return (b.Product_ID || '').localeCompare(a.Product_ID || '');
      return 0; // featured default
    });
  }, [products, sellers, approvedSellerIds, selectedCategory, stockFilter, maxPrice, searchQuery, categories, sortBy, ratingMap]);

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
              Discover Quality Products &amp; Verified Merchants
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
              placeholder="Search products by title, specs, category, or merchant..."
              className="w-full pl-12 pr-10 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills & Sub-filters */}
      <div className="space-y-4">
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
            All Categories ({products.filter((p) => p.Product_Status !== 'deactivated').length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(
              (p) => p.Category_ID === cat.Category_ID && p.Product_Status !== 'deactivated'
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

        {/* Filter Toolbar: Sort & Price & Stock */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="text-slate-600 dark:text-zinc-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="featured">Featured / Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Listed</option>
              </select>
            </div>

            {/* Price Slider */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-zinc-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="text-slate-600 dark:text-zinc-400 font-medium">Max:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(maxPrice)}</span>
              <input
                type="range"
                min={20}
                max={maxPossiblePrice}
                step={10}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 md:w-32 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Stock Toggle */}
            <button
              onClick={() => setStockFilter(stockFilter === 'all' ? 'inStock' : 'all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === 'inStock'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {stockFilter === 'inStock' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>In Stock Only</span>
                </>
              ) : (
                <span>All Stock</span>
              )}
            </button>

            {/* Reset Filters button if any filter active */}
            {(selectedCategory !== 'all' || searchQuery !== '' || stockFilter !== 'all' || maxPrice < maxPossiblePrice) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setMaxPrice(maxPossiblePrice);
                  setStockFilter('all');
                  setSortBy('featured');
                }}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium cursor-pointer"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
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
              setMaxPrice(maxPossiblePrice);
              setStockFilter('all');
              setSortBy('featured');
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
