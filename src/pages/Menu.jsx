import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { menuService } from '../services/menuService';
import { useCart } from '../context/CartContext';
import { FoodCard } from '../components/FoodCard';
import { FoodDetailsModal } from './FoodDetailsModal';
import { 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Utensils, 
  X, 
  PhoneCall, 
  MessageCircle, 
  LayoutGrid, 
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { MENU_CATEGORIES } from '../constants/categories';

export const CustomerMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTableNumber, totalCount, total } = useCart();

  const [categories, setCategories] = useState(MENU_CATEGORIES);
  const [menuItems, setMenuItems] = useState([]);
  
  // When null, we display the 20 Menu Categories showcase (never dumping dishes below).
  // When a category is clicked, only that category's items are shown.
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return searchParams.get('category') || null;
  });
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
      if (cats && cats.length > 0) setCategories(cats);
      if (items && items.length > 0) setMenuItems(items);
    };
    load();
    const unsub = menuService.subscribeToMenu(() => load());
    return () => unsub();
  }, []);

  // Compute item count per category dynamically
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(c => { counts[c.name] = 0; });
    menuItems.forEach(item => {
      const cat = item.category_name || item.category_id;
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      } else if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [categories, menuItems]);

  // Filter items according to the active category or active search query
  const filteredItems = useMemo(() => {
    if (!selectedCategory && !searchQuery.trim()) {
      return [];
    }

    return menuItems.filter(item => {
      const itemCat = item.category_name || item.category_id;

      if (selectedCategory && itemCat !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchCat = (itemCat || '').toLowerCase().includes(q);
        return matchName || matchCat;
      }

      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Select a category and scroll smoothly to view
  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to Menu Categories showcase
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find(c => c.name === selectedCategory || c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28">
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* Arunachala Bhavan Pure Vegetarian Brand Hero Banner */}
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-slate-900">
          <img 
            src="/customer-banner.jpg?v=3" 
            alt="Arunachala Bhavan Pure Vegetarian - Temple of Taste" 
            className="w-full h-auto max-h-[380px] object-cover block"
          />
        </div>

        {/* Responsive Search Toolbar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search any dish (e.g. Dosa, Biryani, Coffee, Paneer)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* =========================================================================
            VIEW 1: MENU CATEGORIES SHOWCASE (Shown when no category is selected)
            Never dumps dishes below - user clicks a menu to view its items.
           ========================================================================= */}
        {!selectedCategory && !searchQuery.trim() && (
          <section className="space-y-4">
            {/* 20 Menu Category Cards Grid with Real Dish Photos and White Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
              {categories.map((cat) => {
                const count = categoryCounts[cat.name] || 0;

                return (
                  <button
                    key={cat.id || cat.no}
                    onClick={() => handleSelectCategory(cat.name)}
                    className="bg-white hover:bg-slate-50/80 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden active:scale-98 hover:-translate-y-1"
                  >
                    {/* Real Dish Photography */}
                    <div className="relative h-28 sm:h-36 w-full rounded-2xl overflow-hidden mb-3 bg-slate-100 shadow-2xs">
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                    </div>

                    {/* Middle: Full Category Name & Tagline */}
                    <div className="my-1 space-y-0.5">
                      <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-blue-700 transition-colors leading-tight line-clamp-1">
                        {cat.name}
                      </h3>
                      {cat.tagline && (
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug line-clamp-1">
                          {cat.tagline}
                        </p>
                      )}
                    </div>

                    {/* Bottom Row: View action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end w-full">
                      <span className="text-slate-700 group-hover:text-blue-700 font-black text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition-all">
                        View Menu <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            VIEW 2: SINGLE CATEGORY DISHES VIEW (Shown when a category is clicked)
            OR SEARCH RESULTS VIEW
           ========================================================================= */}
        {(selectedCategory || searchQuery.trim()) && (
          <section className="space-y-4">
            
            {/* Top Navigation & Back Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <button
                onClick={handleBackToCategories}
                className="bg-white hover:bg-slate-100 text-slate-800 font-black text-xs sm:text-sm px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs inline-flex items-center gap-2 transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-blue-700" />
                <span>All Categories</span>
              </button>

              {selectedCategoryMeta && (
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedCategoryMeta.image_url}
                    alt={selectedCategoryMeta.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                    }}
                  />
                  <div className="text-right sm:text-left">
                    <span className="text-[10px] sm:text-xs text-blue-700 font-extrabold uppercase tracking-wider block">
                      Menu Category
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {selectedCategoryMeta.name}
                    </h2>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Category Switcher Pills */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 border border-slate-200/90 shadow-xs">
              <div className="flex gap-2 overflow-x-auto scrollbar-none py-0.5">
                <button
                  onClick={handleBackToCategories}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> All Categories
                </button>
                {categories.map(c => {
                  const isCur = selectedCategory === c.name;
                  return (
                    <button
                      key={c.id || c.no}
                      onClick={() => handleSelectCategory(c.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                        isCur
                          ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20 scale-102'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200/80 hover:border-blue-200'
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Catering Menu Banner when Catering Menu is clicked */}
            {selectedCategory === 'Catering Menu' && (
              <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 text-white p-5 sm:p-6 shadow-xl border border-amber-400/40 relative overflow-hidden">
                <div className="relative z-10 space-y-3">
                  <span className="inline-block bg-black/20 text-white font-black text-[10px] sm:text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                    🎉 Grand Catering & Bulk Orders
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black text-white">
                    Planning an Event, Wedding, or Family Gathering?
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-50 max-w-2xl font-medium leading-relaxed">
                    Arunachala Bhavan provides authentic pure vegetarian catering for 10 to 500+ guests. Choose from traditional banana leaf service, live cooking counters (Dosa & Prata), or modern buffet setups.
                  </p>
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <a 
                      href="tel:+919876543210" 
                      className="inline-flex items-center gap-2 bg-white text-orange-700 hover:bg-orange-50 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call for Catering
                    </a>
                    <a 
                      href="https://wa.me/919876543210?text=Hi%20Arunachala%20Bhavan%2C%20I%20would%20like%20to%20enquire%20about%20catering%20services" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Inquiry
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Category Dishes Counter Bar */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-blue-700" />
                <span>
                  {searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory}
                </span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                </span>
              </h3>
            </div>

            {/* Dishes Grid: Shows ONLY items for the selected category */}
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
                <p className="text-slate-500 text-xs mt-1">
                  Try checking another category or clearing your search.
                </p>
                <button 
                  onClick={handleBackToCategories}
                  className="mt-4 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to All Categories
                </button>
              </div>
            )}
          </section>
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
