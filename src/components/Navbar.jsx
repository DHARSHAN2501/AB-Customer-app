import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Utensils, ShoppingBag, Clock, Receipt } from 'lucide-react';

export const Navbar = () => {
  const { totalCount, tableNumber } = useCart();
  const location = useLocation();

  const storedTable = (function() {
    try {
      const s = localStorage.getItem('smart_rest_active_table');
      return (s && !isNaN(s)) ? Number(s) : 0;
    } catch(e) { return 0; }
  })();
  const currentTable = (tableNumber && tableNumber > 0) ? tableNumber : storedTable;

  const activeOrderId = (function() {
    try {
      return localStorage.getItem('smart_rest_active_order_id') || 
             localStorage.getItem('smart_rest_active_order') || 
             localStorage.getItem('smart_rest_active_order_number');
    } catch(e) { return null; }
  })();

  const menuUrl = currentTable > 0 ? `/menu?table=${currentTable}` : '/menu';
  const trackUrl = activeOrderId ? `/order-tracking/${activeOrderId}` : (currentTable > 0 ? `/order-tracking?table=${currentTable}` : '/order-tracking');
  const billUrl = activeOrderId ? `/bill?order=${activeOrderId}` : (currentTable > 0 ? `/bill?table=${currentTable}` : '/bill');
  const cartUrl = currentTable > 0 ? `/cart?table=${currentTable}` : '/cart';

  const isMenu = location.pathname.startsWith('/menu');
  const isTracking = location.pathname.startsWith('/order-tracking');
  const isBill = location.pathname.startsWith('/bill');
  const isCart = location.pathname.startsWith('/cart');
  const isReview = location.pathname.startsWith('/review');

  const getPageTitle = () => {
    if (isMenu) return 'Menu';
    if (isTracking) return 'Track Order';
    if (isBill) return 'Bill';
    if (isCart) return 'Cart';
    if (isReview) return 'Review';
    return 'Menu';
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-all duration-300">
        {/* Top Navy Blue Accent Line */}
        <div className="h-1 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-500 w-full" />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 overflow-hidden">
          
          {/* Logo & Dynamic Current Page Name */}
          <Link to={menuUrl} className="flex items-center gap-2 sm:gap-3 group text-decoration-none min-w-0 shrink">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-slate-950 text-lg sm:text-xl tracking-tight leading-none block">
                {getPageTitle()}
              </span>
            </div>
          </Link>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Track Orders Link (Desktop/Tablet) */}
            <Link 
              to={trackUrl} 
              className={`hidden md:flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-2xl text-decoration-none transition-all duration-200 ${
                isTracking 
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20' 
                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 border border-transparent hover:border-blue-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Track Orders</span>
            </Link>

            {/* Bill Link (Desktop/Tablet) */}
            <Link 
              to={billUrl} 
              className={`hidden md:flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-2xl text-decoration-none transition-all duration-200 ${
                isBill 
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20' 
                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 border border-transparent hover:border-blue-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Bill</span>
            </Link>

            {/* Cart Button */}
            <Link 
              to={cartUrl} 
              className={`relative p-2.5 sm:px-4 sm:py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 text-decoration-none transition-all duration-300 active:scale-95 shrink-0 ${
                isCart 
                  ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50' 
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-900 text-white shadow-md shadow-blue-500/25'
              }`}
              aria-label="Cart"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white stroke-[2.2]" />
                {totalCount > 0 && (
                  <span className="absolute -top-2.5 -right-3.5 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-pulse">
                    {totalCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-black text-xs tracking-wide ml-1">Cart</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Panel (<768px) - Styled matching Admin App */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 z-50 py-2 px-4 sm:px-8 flex items-center justify-around shadow-[0_-8px_20px_-4px_rgba(15,23,42,0.06)]">
        <Link 
          to={menuUrl} 
          title="Menu"
          className={`p-2.5 rounded-xl text-decoration-none flex items-center justify-center transition-all duration-200 relative ${
            isMenu 
              ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 px-3 py-1.5' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Menu"
        >
          <Utensils className="w-5 h-5 shrink-0" />
        </Link>

        <Link 
          to={trackUrl} 
          title="Track Orders"
          className={`p-2.5 rounded-xl text-decoration-none flex items-center justify-center transition-all duration-200 relative ${
            isTracking 
              ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 px-3 py-1.5' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Track Orders"
        >
          <Clock className="w-5 h-5 shrink-0" />
        </Link>

        <Link 
          to={billUrl} 
          title="Bill"
          className={`p-2.5 rounded-xl text-decoration-none flex items-center justify-center transition-all duration-200 relative ${
            isBill 
              ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 px-3 py-1.5' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Bill"
        >
          <Receipt className="w-5 h-5 shrink-0" />
        </Link>

        <Link 
          to={cartUrl} 
          title="Cart"
          className={`p-2.5 rounded-xl text-decoration-none flex items-center justify-center transition-all duration-200 relative ${
            isCart 
              ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 px-3 py-1.5' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Cart"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 shrink-0" />
            {totalCount > 0 && (
              <span className={`absolute -top-2 -right-3 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs ${
                isCart ? 'bg-red-500 border border-white' : 'bg-red-600 border border-white'
              }`}>
                {totalCount}
              </span>
            )}
          </div>
        </Link>
      </nav>
    </>
  );
};
