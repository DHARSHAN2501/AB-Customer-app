import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const FoodCard = ({ item, onSelect }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const cartEntry = cartItems.find(ci => ci.menuItem.id === item.id);
  const currentQty = cartEntry ? cartEntry.quantity : 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(item, 1);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateQuantity(item.id, currentQty + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    updateQuantity(item.id, currentQty - 1);
  };



  return (
    <div 
      onClick={() => onSelect(item)}
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between group h-full food-card"
    >
      <div className="relative h-32 sm:h-48 w-full bg-slate-100 overflow-hidden">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />


      </div>

      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
        <div>
          <h3 className="font-black text-slate-900 text-xs sm:text-base group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
            {item.name}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100 mt-auto gap-1">
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Price</span>
            <span className="text-sm sm:text-lg font-black text-slate-900">₹{item.price}</span>
          </div>

          {currentQty > 0 ? (
            <div className="flex items-center bg-blue-50 border border-blue-200/80 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 gap-1 shadow-2xs">
              <button 
                onClick={handleDecrement} 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-white text-blue-700 font-black border border-blue-200/80 flex items-center justify-center hover:bg-blue-100 transition"
              >
                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <span className="font-black text-blue-900 text-xs px-1">{currentQty}</span>
              <button 
                onClick={handleIncrement} 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-black flex items-center justify-center shadow-xs hover:from-blue-800 hover:to-indigo-900 transition"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAdd} 
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-900 text-white text-[11px] sm:text-xs font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1 shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
