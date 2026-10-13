
const memoryStore = new Map();

export const safeStorage = {
  getItem: (key) => {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch (e) {}
    return memoryStore.get(key) || null;
  },
  setItem: (key, val) => {
    try {
      window.localStorage.setItem(key, val);
    } catch (e) {}
    memoryStore.set(key, val);
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
    memoryStore.delete(key);
  }
};

// Automatically scrub any legacy test tables (11, 12) or test orders from browser storage
(function initStorageSanitization() {
  try {
    const actTbl = safeStorage.getItem('smart_rest_active_table');
    if (actTbl === '11' || actTbl === '12' || actTbl === 11 || actTbl === 12) {
      safeStorage.removeItem('smart_rest_active_table');
    }
    safeStorage.removeItem('smart_rest_active_order_t11');
    safeStorage.removeItem('smart_rest_active_order_t12');
  } catch (e) {}
})();

import { createClient } from '@supabase/supabase-js';

const REAL_SUPABASE_URL = 'https://thsuvmauyksxiltzutwx.supabase.co';
const REAL_SUPABASE_KEY = 'sb_publishable_9EfDMt_QKs7oaYPYCp_h-w_to0VizR6';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://sample-restaurant.supabase.co') 
  ? import.meta.env.VITE_SUPABASE_URL 
  : REAL_SUPABASE_URL;

const supabaseAnonKey = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY))
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) 
  : REAL_SUPABASE_KEY;

export const isSupabaseConfigured = () => true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: safeStorage, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const INITIAL_CATEGORIES = [];

const INITIAL_MENU_ITEMS = [];

const INITIAL_TABLES = Array.from({ length: 12 }, (_, i) => ({
  id: `table-${i + 1}`,
  table_number: i + 1,
  capacity: 4,
  status: 'AVAILABLE'
}));

const INITIAL_ORDERS = [];

const getStore = (key, init) => {
  try {
    const data = safeStorage.getItem(`smart_rest_${key}`);
    if (!data) return init;
    const parsed = JSON.parse(data);
    if (key === 'orders' && Array.isArray(parsed)) {
      const sanitized = parsed.filter(o => {
        const idStr = String(o.id || o.order_number || '').toLowerCase();
        const cust = String(o.customer_name || '').toLowerCase();
        const tbl = Number(o.table_number || 0);
        return idStr !== 'ord-1024' && idStr !== 'ord1024' && idStr !== 'ord-1023' && idStr !== 'ord1023' && cust !== 'rahul s.' && cust !== 'anita m.' && tbl !== 11 && tbl !== 12;
      });
      if (sanitized.length !== parsed.length) {
        safeStorage.setItem(`smart_rest_orders`, JSON.stringify(sanitized));
        return sanitized;
      }
      return sanitized;
    }
    if (key === 'menu_items' && Array.isArray(parsed)) {
      const sanitized = parsed.map(item => {
        if (item.name && item.name.includes('Mock ')) {
          return { ...item, name: item.name.replace(/Mock /g, 'Soya ') };
        }
        return item;
      });
      return sanitized;
    }
    return parsed;
  } catch (e) {
    return init;
  }
};

const setStore = (key, data) => {
  try {
    safeStorage.setItem(`smart_rest_${key}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`smart_rest_event_${key}`, { detail: data }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(`smart_rest_bc_${key}`);
        bc.postMessage({ type: 'UPDATE', detail: data });
        bc.close();
      } catch (e) {}
    }
  } catch (e) {}
};

const CAT_MAP = {
  'cat-1': 'South Indian',
  'cat-2': 'North Indian',
  'cat-3': 'Biryani & Rice',
  'cat-4': 'Indo Chinese',
  'cat-5': 'Drinks & Desserts'
};

const mapCatName = (c) => CAT_MAP[c] || c || 'General';

export const localDB = {
  getCategories: () => {
    const rawItems = getStore('menu_items', INITIAL_MENU_ITEMS);
    const catMap = new Map();
    rawItems.forEach(i => {
      const name = mapCatName(i.category_id);
      if (name && !catMap.has(name)) {
        catMap.set(name, { id: name, name, is_active: true });
      }
    });
    return Array.from(catMap.values());
  },
  getMenuItems: () => {
    const raw = getStore('menu_items', INITIAL_MENU_ITEMS);
    return raw.map(item => ({
      ...item,
      category_id: mapCatName(item.category_id)
    }));
  },
  getTables: () => {
    const orders = getStore('orders', INITIAL_ORDERS);
    const activeSet = new Set(orders.filter(o => o.order_status !== 'COMPLETED' && o.order_status !== 'SERVED' && o.order_status !== 'CANCELLED' && o.table_number > 0).map(o => o.table_number));
    return Array.from({ length: 20 }, (_, i) => {
      const tableNum = i + 1;
      return {
        id: `tbl-${tableNum}`,
        table_number: tableNum,
        status: activeSet.has(tableNum) ? 'OCCUPIED' : 'AVAILABLE'
      };
    });
  },
  getOrders: () => getStore('orders', INITIAL_ORDERS),
  saveOrders: (ordersList) => setStore('orders', ordersList || []),
  createOrder: (orderData) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const newOrder = {
      id: `ord-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      order_number: `ORD${Math.floor(1000 + Math.random() * 9000)}`,
      table_number: Number(orderData.table_number || 0),
      order_type: orderData.order_type || (orderData.delivery_address ? 'HOME_DELIVERY' : 'DINE_IN'),
      phone_number: orderData.phone_number || '',
      delivery_address: orderData.delivery_address || '',
      postal_code: orderData.postal_code || '',
      customer_name: orderData.customer_name || 'Guest Customer',
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total_amount: orderData.total_amount,
      order_status: 'PENDING',
      bill_status: 'NOT_REQUESTED',
      notes: orderData.notes || '',
      created_at: new Date().toISOString(),
      items: orderData.items || []
    };
    setStore('orders', [newOrder, ...list]);
    return newOrder;
  },
  updateOrderStatus: (orderId, status) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const matchKey = String(orderId || '').toLowerCase();
    const updated = list.map(o => {
      const idStr = String(o.id || '').toLowerCase();
      const numStr = String(o.order_number || '').toLowerCase();
      return (idStr === matchKey || numStr === matchKey || matchKey.includes(numStr)) ? { ...o, order_status: status } : o;
    });
    setStore('orders', updated);
    return updated;
  },
  updateBillStatus: (orderId, bill_status) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const matchKey = String(orderId || '').toLowerCase();
    const updated = list.map(o => {
      const idStr = String(o.id || '').toLowerCase();
      const numStr = String(o.order_number || '').toLowerCase();
      return (idStr === matchKey || numStr === matchKey || matchKey.includes(numStr)) ? { ...o, bill_status } : o;
    });
    setStore('orders', updated);
    return updated;
  },
  markTablePaid: (tableNumber) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const updated = list.map(o => {
      const matchTbl = Number(o.table_number) === Number(tableNumber) && Number(tableNumber) > 0;
      const matchId = String(o.id || '').toLowerCase() === String(tableNumber || '').toLowerCase() || 
                      String(o.order_number || '').toLowerCase() === String(tableNumber || '').toLowerCase();
      return (matchTbl || matchId) ? { ...o, bill_status: 'PAID' } : o;
    });
    setStore('orders', updated);
    return updated;
  },
  addReview: (review) => {
    const list = getStore('reviews', []);
    const updated = [{ id: `rev-${Date.now()}`, ...review, created_at: new Date().toISOString() }, ...list];
    setStore('reviews', updated);
  }
};
