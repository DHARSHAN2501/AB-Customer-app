import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { calculateGST } from '../utils/currency';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = (function(){ try { return localStorage.getItem('smart_rest_cart'); } catch(e) { return null; } })();
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [tableNumber, setTableNumber] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTable = params.get('table');
      if (urlTable && !isNaN(urlTable)) {
        const num = Number(urlTable);
        (function(){ try { localStorage.setItem('smart_rest_active_table', num); } catch(e) {} })();
        return num;
      }
      const saved = (function(){ try { return localStorage.getItem('smart_rest_active_table'); } catch(e) { return null; } })();
      const num = (saved && !isNaN(saved)) ? Number(saved) : 0;
      if (num === 11 || num === 12) {
        try { localStorage.removeItem('smart_rest_active_table'); } catch(e) {}
        return 0;
      }
      return num;
    } catch (e) {
      return 0;
    }
  });

  useEffect(() => {
    (function(){ try { localStorage.setItem('smart_rest_cart', JSON.stringify(cartItems)); } catch(e) {} })();
  }, [cartItems]);

  const addToCart = useCallback((menuItem, quantity = 1, special_instruction = '') => {
    setCartItems(prev => {
      const idx = prev.findIndex(ci => ci.menuItem.id === menuItem.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity,
          special_instruction: special_instruction || updated[idx].special_instruction
        };
        return updated;
      }
      return [...prev, { menuItem, quantity, special_instruction }];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCartItems(prev => prev.filter(ci => ci.menuItem.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, quantity } : ci));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    (function(){ try { localStorage.removeItem('smart_rest_cart'); } catch(e) {} })();
  }, []);

  const { subtotal, tax, total, totalCount } = useMemo(() => {
    let sub = 0;
    let count = 0;
    for (const ci of cartItems) {
      sub += ci.menuItem.price * ci.quantity;
      count += ci.quantity;
    }
    const gst = calculateGST(sub);
    return { subtotal: gst.subtotal, tax: gst.tax, total: gst.total, totalCount: count };
  }, [cartItems]);

  const contextValue = useMemo(() => ({
    cartItems,
    tableNumber,
    setTableNumber,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    tax,
    total,
    totalCount
  }), [cartItems, tableNumber, addToCart, updateQuantity, removeFromCart, clearCart, subtotal, tax, total, totalCount]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
