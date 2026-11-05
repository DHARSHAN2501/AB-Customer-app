import { supabase, isSupabaseConfigured, localDB, safeStorage } from './supabase';
import { MENU_CATEGORIES, CATERING_PACKAGES, getItemCategory } from '../constants/categories';

let cachedMenuItems = null;
let lastMenuFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache, invalidated on realtime change

export const menuService = {
  invalidateCache: () => {
    cachedMenuItems = null;
    lastMenuFetchTime = 0;
  },

  getCategories: async () => {
    try {
      const stored = safeStorage.getItem('smart_rest_categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return MENU_CATEGORIES;
  },

  getMenuItems: async (forceRefresh = false) => {
    if (!forceRefresh && cachedMenuItems && (Date.now() - lastMenuFetchTime < CACHE_TTL_MS)) {
      return cachedMenuItems;
    }

    let items = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('menu_items').select('*').order('name');
        if (!error && data && data.length > 0) {
          items = data;
        }
      } catch (e) {}
    }

    if (!items || items.length === 0) {
      items = localDB.getMenuItems() || [];
    }

    // Attach classified category to every item
    const classifiedItems = items.map(item => {
      const assignedCat = getItemCategory(item);
      return {
        ...item,
        category_name: assignedCat,
        category_id: assignedCat
      };
    });

    // Append catering packages so they are discoverable under Catering Menu
    const combined = [...classifiedItems, ...CATERING_PACKAGES];

    cachedMenuItems = combined;
    lastMenuFetchTime = Date.now();
    return combined;
  },

  subscribeToMenu: (callback) => {
    const cleanups = [];

    // Realtime Supabase postgres_changes for menu_items
    if (isSupabaseConfigured()) {
      try {
        const sub = supabase.channel('public:menu_items').on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
          menuService.invalidateCache();
          callback();
        }).subscribe();
        cleanups.push(() => supabase.removeChannel(sub));
      } catch (e) {}
    }

    // Cross-tab BroadcastChannel for Menu Items & Categories
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('smart_rest_bc_menu_items');
        bc.onmessage = () => {
          menuService.invalidateCache();
          callback();
        };
        cleanups.push(() => bc.close());

        const bcCat = new BroadcastChannel('smart_rest_bc_categories');
        bcCat.onmessage = () => {
          callback();
        };
        cleanups.push(() => bcCat.close());
      } catch (e) {}
    }

    // Local CustomEvent listener
    const customListener = () => {
      menuService.invalidateCache();
      callback();
    };
    window.addEventListener('smart_rest_event_menu_items', customListener);
    window.addEventListener('smart_rest_event_categories', customListener);
    cleanups.push(() => {
      window.removeEventListener('smart_rest_event_menu_items', customListener);
      window.removeEventListener('smart_rest_event_categories', customListener);
    });

    // Storage Event listener
    const storageListener = (e) => {
      if (e.key === 'smart_rest_menu_items' || e.key === 'smart_rest_categories') {
        menuService.invalidateCache();
        callback();
      }
    };
    window.addEventListener('storage', storageListener);
    cleanups.push(() => window.removeEventListener('storage', storageListener));

    return () => cleanups.forEach(fn => fn());
  }
};
