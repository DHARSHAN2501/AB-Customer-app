import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { menuService } from '../services/menuService';
import { getCategoryImage, DEFAULT_CATEGORY_IMAGE } from '../constants/categories';
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
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react';

export const CustomerMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTableNumber, totalCount, total } = useCart();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // When null, we display the Menu Categories showcase loaded from DB.
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

  const categoriesRef = React.useRef([]);
  categoriesRef.current = categories;

  const loadMenu = async ({ forceRefresh = false, categoriesChanged = true, itemsChanged = true } = {}) => {
    try {
      const [cats, items] = await Promise.all([
        categoriesChanged ? menuService.getCategories(forceRefresh) : Promise.resolve(null),
        itemsChanged ? menuService.getMenuItems(forceRefresh) : Promise.resolve(null)
      ]);
      const catList = Array.isArray(cats) ? cats : categoriesRef.current;
      if (Array.isArray(cats)) {
        setCategories(catList);
      }
      if (Array.isArray(items)) {
        const normalizedItems = items.map(it => {
          const rawCat = String(it.category_name || it.category_id || '').trim();
          const matched = catList.find(
            c => c.id === rawCat || String(c.name || '').trim().toLowerCase() === rawCat.toLowerCase()
          );
          const resolvedCat = matched ? matched.name : rawCat;
          return {
            ...it,
            category_id: resolvedCat,
            category_name: resolvedCat
          };
        });
        setMenuItems(normalizedItems);
      }
      setDbError(null);
    } catch (e) {
      console.warn('CustomerMenu load error:', e);
      setDbError(e?.message || 'Unable to load menu categories from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    const unsub = menuService.subscribeToMenu((scope) => {
      loadMenu({
        forceRefresh: true,
        categoriesChanged: scope?.categoriesChanged ?? true,
        itemsChanged: scope?.itemsChanged ?? true
      });
    });
    return () => unsub();
  }, []);

  // Compute item count per category dynamically
  const categoryCounts = useMemo(() => {
    const counts = {};
    if (!Array.isArray(menuItems) || menuItems.length === 0) return counts;
    menuItems.forEach(item => {
      const cat = item.category_name || item.category_id;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [menuItems]);

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
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-slate-200/90 bg-slate-900 aspect-[21/9] sm:aspect-[24/9] max-h-[160px] sm:max-h-[230px] md:max-h-[280px] relative">
          <img 
            src="/customer-banner.jpg?v=3" 
            alt="Arunachala Bhavan Pure Vegetarian - Temple of Taste" 
            className="w-full h-full object-cover block"
          />
        </div>

        {/* Responsive Search Toolbar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search dishes (e.g. Dosa, Biryani, Coffee)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-11 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
              aria-label="Clear search"
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
          <section className="space-y-3.5 sm:space-y-4">
            {dbError && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                    {dbError}. Ensure <code className="bg-amber-100 px-1.5 py-0.5 rounded">public.categories</code> is set up in Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadMenu({ forceRefresh: true })}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Explore Categories
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {categories.length} sections · Handcrafted pure vegetarian
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Pure Veg
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 animate-pulse flex items-center justify-between gap-3.5 sm:gap-4"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/70 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4.5 w-36 rounded-md bg-slate-200/70" />
                        <div className="h-3 w-48 rounded bg-slate-100" />
                        <div className="h-2.5 w-24 rounded bg-slate-100/70" />
                      </div>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 shrink-0" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 && !dbError ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-md mx-auto my-6 space-y-2">
                <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-black text-slate-800 text-sm sm:text-base">No Menu Categories Available</h3>
                <p className="text-slate-500 text-xs">
                  Menu categories will appear here once added in Admin Menu Management.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {categories.map((cat) => {
                  const count = categoryCounts[cat.name] || 0;
                  return (
                    <button
                      key={cat.id || cat.no || cat.name}
                      onClick={() => handleSelectCategory(cat.name)}
                      className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-blue-50/40 p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex items-center justify-between gap-3.5 sm:gap-4 group cursor-pointer active:scale-[0.985] text-left"
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                        {/* Food Photography Thumbnail */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs shrink-0 group-hover:shadow-md transition-shadow">
                          <img
                            src={getCategoryImage(cat)}
                            alt={cat.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = DEFAULT_CATEGORY_IMAGE;
                            }}
                          />
                        </div>

                        {/* Title, Badge, Tagline & Dish Count */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight leading-snug">
                              {cat.name}
                            </h3>
                            {cat.badge && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 shrink-0">
                                {cat.badge}
                              </span>
                            )}
                          </div>

                          {cat.tagline && (
                            <p className="text-xs text-slate-500 font-medium line-clamp-1 leading-normal">
                              {cat.tagline}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                            {count > 0 ? (
                              <span>{count} {count === 1 ? 'dish available' : 'dishes available'}</span>
                            ) : (
                              <span>Explore menu</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Circle Pill */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all duration-300 shrink-0 shadow-2xs group-hover:shadow-md group-hover:translate-x-0.5">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* =========================================================================
            VIEW 2: SINGLE CATEGORY DISHES VIEW (Shown when a category is clicked)
            OR SEARCH RESULTS VIEW
           ========================================================================= */}
        {(selectedCategory || searchQuery.trim()) && (
          <section className="space-y-4">
            
            {/* Unified Category Header & Quick Switcher Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-5 space-y-3.5">
              {/* Top Row: Back + Thumbnail + Title & Dish Count */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={handleBackToCategories}
                    aria-label="Back to All Categories"
                    title="Back to All Categories"
                    className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {selectedCategoryMeta ? (
                    <img
                      src={getCategoryImage(selectedCategoryMeta)}
                      alt={selectedCategoryMeta.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-200/80 shadow-2xs shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_CATEGORY_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                      <Search className="w-5 h-5 text-blue-700" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                      {searchQuery ? 'Search Results' : 'Menu Category'}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight truncate">
                        {searchQuery ? `"${searchQuery}"` : (selectedCategoryMeta?.name || selectedCategory)}
                      </h2>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0">
                        {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition shrink-0 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-blue-700" />
                  <span>All Categories</span>
                </button>
              </div>

              {/* Integrated Quick Category Switcher Pills */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> All
                </button>
                {categories.map(c => {
                  const isCur = selectedCategory === c.name;
                  return (
                    <button
                      type="button"
                      key={c.id || c.no}
                      onClick={() => handleSelectCategory(c.name)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isCur
                          ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm shadow-blue-500/20'
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

            {/* Dishes Grid: Shows ONLY items for the selected category */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-6">
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
                {totalCount} {totalCount === 1 ? 'item' : 'items'} • <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">${total.toFixed(2)}</span>
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
