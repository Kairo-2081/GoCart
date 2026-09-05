import React from 'react';
import { Product, Category, Seller, Review, Customer } from '../../types';
import { StarRating } from '../StarRating';
import { formatCurrency, formatDate } from '../../lib/api';
import {
  X,
  ShoppingCart,
  Tag,
  Store,
  MapPin,
  CheckCircle2,
  MessageSquare,
  Send,
  UserCheck,
  LogIn,
  Check,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  category?: Category;
  seller?: Seller;
  reviews: Review[];
  currentCustomer?: Customer | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onSubmitReview: (productId: string, rating: number, reviewText: string) => void;
  onOpenLogin?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  category,
  seller,
  reviews,
  currentCustomer,
  onClose,
  onAddToCart,
  onSubmitReview,
  onOpenLogin,
}) => {
  const [quantity, setQuantity] = React.useState(1);
  const [newRating, setNewRating] = React.useState(5);
  const [newReviewText, setNewReviewText] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [reviewSubmittedMessage, setReviewSubmittedMessage] = React.useState('');
  const [imgError, setImgError] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

  if (!product) return null;

  const productReviews = reviews.filter((r) => r.Product_ID === product.Product_ID);
  const avgRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.Rating, 0) / productReviews.length
      : 0;

  const isOutOfStock = Number(product.Stock) <= 0;
  const isDeactivated = product.Product_Status === 'deactivated';

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      await onSubmitReview(product.Product_ID, newRating, newReviewText.trim());
      setNewReviewText('');
      setReviewSubmittedMessage('Thank you! Your review has been recorded.');
      setTimeout(() => setReviewSubmittedMessage(''), 4000);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddToCartClick = () => {
    if (isOutOfStock || isDeactivated) return;
    setJustAdded(true);
    onAddToCart(product, quantity);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 500);
  };

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {category?.Name || 'Product Detail'}
            </span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="text-xs text-slate-500 dark:text-zinc-500 font-mono">ID: {product.Product_ID}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Product Image */}
            <div className="space-y-4">
              <div className="aspect-square w-full rounded-2xl bg-slate-100 dark:bg-zinc-950 overflow-hidden border border-slate-200 dark:border-zinc-800 relative">
                <img
                  src={imgError || !product.Image ? defaultPlaceholder : product.Image}
                  alt={product.Name}
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {product.Voucher && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                    <Tag className="w-4 h-4" />
                    Voucher: {product.Voucher}
                  </div>
                )}
              </div>

              {/* Seller Info Box */}
              {seller && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 flex items-start gap-3">
                  <img
                    src={seller.Logo || defaultPlaceholder}
                    alt={seller.Name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultPlaceholder;
                    }}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                  />
                  <div className="flex-1 text-xs space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 truncate">
                        <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{seller.Name}</span>
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase shrink-0">
                        Verified Merchant
                      </span>
                    </div>
                    {seller.Description && (
                      <p className="text-slate-600 dark:text-zinc-300 line-clamp-2">{seller.Description}</p>
                    )}
                    {seller.Address && (
                      <p className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-mono text-[11px] pt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {seller.Address.Street}, {seller.Address.City} ({seller.Address.Postal_Code})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Product Meta & Actions */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                  {product.Name}
                </h1>

                {/* Rating Summary */}
                <div className="flex items-center gap-3">
                  <StarRating rating={avgRating} size="md" showText totalReviews={productReviews.length} />
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Fast Dispatch
                  </span>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold block">
                      Price
                    </span>
                    <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(Number(product.Price) || 0)}
                    </span>
                  </div>
                  {product.Voucher && (
                    <span className="text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg">
                      Use code <code className="font-bold">{product.Voucher}</code>
                    </span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                    Product Details
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {product.Description || 'No description provided.'}
                  </p>
                </div>

                {/* Specs pills */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Category</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{category?.Name || 'General'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Available Inventory</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{product.Stock} units</span>
                  </div>
                </div>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Quantity:</span>
                  <div className="flex items-center border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-bold text-slate-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(Math.max(1, Number(product.Stock) || 99), q + 1))}
                      className="px-3 py-1.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock || isDeactivated}
                  onClick={handleAddToCartClick}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isOutOfStock || isDeactivated
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                      : justAdded
                      ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-98'
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Added to Shopping Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Add {quantity} Item{quantity > 1 ? 's' : ''} to Cart • {formatCurrency(Number(product.Price) * quantity)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Customer Reviews ({productReviews.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Verified customer ratings and feedback
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="lg" showText totalReviews={productReviews.length} />
              </div>
            </div>

            {/* Write a Review Form or Guest Login Prompt */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 space-y-3">
              {currentCustomer ? (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Leave a Review as {currentCustomer.Name}
                  </h3>

                  {reviewSubmittedMessage && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                      {reviewSubmittedMessage}
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Your Rating:</span>
                      <StarRating
                        rating={newRating}
                        interactive
                        size="md"
                        onRatingChange={(r) => setNewRating(r)}
                      />
                      <span className="text-xs font-bold text-amber-500">{newRating} / 5 Stars</span>
                    </div>

                    <textarea
                      rows={2}
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      placeholder="Share your experience with this product..."
                      className="w-full p-3 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-zinc-100 placeholder-slate-400"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingReview || !newReviewText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Review</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">
                      Want to write a review?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Sign in with your customer account to leave a verified rating.
                    </span>
                  </div>
                  {onOpenLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLogin();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In to Review</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Reviews List */}
            {productReviews.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-400 italic text-center py-4">
                No reviews yet for this product. Be the first to leave a review!
              </p>
            ) : (
              <div className="space-y-3">
                {productReviews.map((rev) => (
                  <div
                    key={rev.Review_ID}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                          {(rev.Customer_Name || 'U').charAt(0)}
                        </div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {rev.Customer_Name || 'Verified Buyer'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatDate(rev.Created_At)}</span>
                    </div>
                    <StarRating rating={rev.Rating} size="sm" />
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                      {rev.Review_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
