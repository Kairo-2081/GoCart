import React from 'react';
import { Product, Category, Seller, Review } from '../../types';
import { StarRating } from '../StarRating';
import { formatCurrency } from '../../lib/api';
import { ShoppingCart, Tag, Store, Eye, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  category?: Category;
  seller?: Seller;
  reviews: Review[];
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  seller,
  reviews,
  onSelect,
  onAddToCart,
}) => {
  const productReviews = reviews.filter((r) => r.Product_ID === product.Product_ID);
  const avgRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.Rating, 0) / productReviews.length
      : 0;

  const isOutOfStock = product.Stock <= 0;
  const isDeactivated = product.Product_Status === 'deactivated';

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md dark:shadow-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-zinc-950 overflow-hidden">
        <img
          src={product.Image}
          alt={product.Name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Voucher Tag */}
        {product.Voucher && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {product.Voucher}
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute top-3 right-3">
          {isOutOfStock ? (
            <span className="bg-slate-900/80 dark:bg-zinc-950/90 backdrop-blur text-slate-200 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 dark:border-zinc-800">
              Out of Stock
            </span>
          ) : isDeactivated ? (
            <span className="bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Lock className="w-3 h-3" /> Deactivated
            </span>
          ) : (
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur">
              {product.Stock} in stock
            </span>
          )}
        </div>

        {/* Hover overlay preview action */}
        <div className="absolute inset-0 bg-slate-900/30 dark:bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/95 dark:bg-zinc-900/90 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Quick View
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Seller info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {category?.Name || 'General'}
            </span>
            {seller && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
                <Store className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                {seller.Name}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {product.Name}
          </h3>

          {/* Star Rating */}
          <div className="mt-2">
            <StarRating rating={avgRating} size="sm" showText totalReviews={productReviews.length} />
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider block font-semibold">Price</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(product.Price)}
            </span>
          </div>

          <button
            disabled={isOutOfStock || isDeactivated}
            onClick={(e) => onAddToCart(product, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isOutOfStock || isDeactivated
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
