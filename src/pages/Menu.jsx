import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { menuService } from '../services/menuService';
import { useCart } from '../context/CartContext';
import { FoodCard } from '../components/FoodCard';
import { FoodDetailsModal } from './FoodDetailsModal';
import { Search, ShoppingBag, Sparkles, Utensils, Flame } from 'lucide-react';

export const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const { setTableNumber, totalCount, total } = useCart();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const tbl = searchParams.get('table');
    if (tbl) setTableNumber(Number(tbl));
  }, [searchParams, setTableNumber]);

  useEffect(() => {
    const load = async () => {
      const cats = await menuService.getCategories();
      const items = await menuService.getMenuItems();
      setCategories(cats || []);
      setMenuItems(items || []);
    };
    load();
    const unsub = menuService.subscribeToMenu(() => load());
    return () => unsub();
  }, []);

  const filteredItems = React.useMemo(() => {
    return menuItems.filter(item => {
      if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28">
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* Vibrant Navy Blue + White Gradient Hero Banner */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 p-4 sm:p-6 text-white shadow-xl overflow-hidden border border-blue-900/50">
          {/* Decorative background glow circles */}
          <div className="absolute -top-12 -right-12 w-40 h-40 sm:w-56 sm:h-56 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 sm:w-56 sm:h-56 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                Delicious Dining <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Freshly prepared meals delivered straight to your table.
              </p>
            </div>

            {/* Right Chef Cartoon Illustration */}
            <div className="shrink-0 flex items-center justify-center">
              <img 
                src="/chef.png" 
                alt="Chef Cooking" 
                className="w-24 h-24 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain drop-shadow-2xl shrink-0 transform hover:scale-105 transition-transform"
                onError={(e) => { e.target.src = 'https://w7.pngwing.com/pngs/356/205/png-transparent-chef-cooking-chef-food-hand-cook-thumbnail.png'; }}
              />
            </div>
          </div>
        </div>

        {/* Responsive Search Toolbar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search delicious food dishes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs transition"
          />
        </div>

        {/* Categories Horizontal Pill Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('ALL')} 
            className={`px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              selectedCategory === 'ALL' 
                ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 scale-105' 
                : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-blue-50/50 hover:border-blue-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> All Delicacies
          </button>
          {categories.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedCategory(c.id)} 
              className={`px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all duration-200 ${
                selectedCategory === c.id 
                  ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 scale-105' 
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-blue-50/50 hover:border-blue-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Food Items Counter */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-blue-700" />
            <span>Menu Items</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-black">
              {filteredItems.length}
            </span>
          </h2>
        </div>

        {/* 2-Column Responsive Mobile Food Card Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
            {filteredItems.map(item => (
              <FoodCard key={item.id} item={item} onSelect={setSelectedItem} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-md mx-auto my-6">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-black text-slate-800 text-sm sm:text-base">No Food Items Found</h3>
            <p className="text-slate-500 text-xs mt-1">Try changing your search terms or category filter.</p>
          </div>
        )}
      </div>

      {selectedItem && (
        <FoodDetailsModal item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {/* Floating Sticky Checkout Bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-40 max-w-xl mx-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] sm:text-[11px] text-blue-700 font-extrabold block">Order Summary</span>
              <span className="font-black text-xs sm:text-base text-slate-900">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} • <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">₹{total.toFixed(2)}</span>
              </span>
            </div>
            <Link 
              to="/cart" 
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-900 text-white font-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 text-decoration-none transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" /> View Cart
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
