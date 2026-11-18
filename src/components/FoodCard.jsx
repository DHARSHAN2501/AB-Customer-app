import React, { useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { showToast } from './Toast';

const FoodCardView = React.memo(({ item, currentQty, onSelect, onAdd, onIncrement, onDecrement }) => (
  <div 
    onClick={() => onSelect(item)}
    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between group h-full food-card"
  >
    <div className="relative h-44 sm:h-48 w-full bg-slate-100 overflow-hidden">
      <img
        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
        alt={item.name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
        }}
        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
      
      {item.category_name && (
        <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs">
          {item.category_name}
        </span>
      )}

      {item.is_catering && (
        <span className="absolute top-2.5 right-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md animate-pulse">
          Party Pack
        </span>
      )}
    </div>

    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
      <div>
        <h3 className="font-black text-slate-900 text-base group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
          {item.name}
        </h3>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Price</span>
          <span className="text-lg font-black text-slate-900">${item.price}</span>
        </div>

        {currentQty > 0 ? (
          <div className="flex items-center bg-blue-50 border border-blue-200/80 rounded-2xl p-1 gap-1.5 shadow-2xs">
            <button 
              onClick={onDecrement} 
              className="w-7 h-7 rounded-xl bg-white text-blue-700 font-black border border-blue-200/80 flex items-center justify-center hover:bg-blue-100 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-blue-900 text-xs px-1.5">{currentQty}</span>
            <button 
              onClick={onIncrement} 
              className="w-7 h-7 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-black flex items-center justify-center shadow-xs hover:from-blue-800 hover:to-indigo-900 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onAdd} 
            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-1 shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>
    </div>
  </div>
));

export const FoodCard = ({ item, onSelect }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const cartEntry = cartItems.find(ci => ci.menuItem.id === item.id);
  const currentQty = cartEntry ? cartEntry.quantity : 0;

  const handleAdd = useCallback((e) => {
    e.stopPropagation();
    addToCart(item, 1);
    showToast({
      title: 'Added',
      message: `${item.name} added to cart.`,
      variant: 'success',
      duration: 2200
    });
  }, [addToCart, item]);

  const handleIncrement = useCallback((e) => {
    e.stopPropagation();
    updateQuantity(item.id, currentQty + 1);
  }, [updateQuantity, item.id, currentQty]);

  const handleDecrement = useCallback((e) => {
    e.stopPropagation();
    updateQuantity(item.id, currentQty - 1);
  }, [updateQuantity, item.id, currentQty]);

  return (
    <FoodCardView
      item={item}
      currentQty={currentQty}
      onSelect={onSelect}
      onAdd={handleAdd}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
    />
  );
};
