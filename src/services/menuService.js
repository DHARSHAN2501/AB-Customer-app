import { supabase, isSupabaseConfigured, localDB } from './supabase';

let cachedMenuItems = null;
let lastMenuFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache, invalidated on realtime change

export const menuService = {
  invalidateCache: () => {
    cachedMenuItems = null;
    lastMenuFetchTime = 0;
  },

  getCategories: async () => {
    if (cachedMenuItems && cachedMenuItems.length > 0) {
      const uniqueCats = Array.from(new Set(cachedMenuItems.map(i => i.category_id).filter(Boolean)));
      if (uniqueCats.length > 0) {
        return uniqueCats.map((name, idx) => ({ id: name, name: name, display_order: idx }));
      }
    }
    const items = await menuService.getMenuItems();
    if (items && items.length > 0) {
      const uniqueCats = Array.from(new Set(items.map(i => i.category_id).filter(Boolean)));
      return uniqueCats.map((name, idx) => ({ id: name, name: name, display_order: idx }));
    }
    return localDB.getCategories();
  },

  getMenuItems: async (forceRefresh = false) => {
    if (!forceRefresh && cachedMenuItems && (Date.now() - lastMenuFetchTime < CACHE_TTL_MS)) {
      return cachedMenuItems;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('menu_items').select('*').order('name');
        if (!error && data && data.length > 0) {
          cachedMenuItems = data;
          lastMenuFetchTime = Date.now();
          return data;
        }
      } catch (e) {}
    }
    const local = localDB.getMenuItems();
    cachedMenuItems = local;
    lastMenuFetchTime = Date.now();
    return local;
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

    // Cross-tab BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('smart_rest_bc_menu_items');
        bc.onmessage = () => {
          menuService.invalidateCache();
          callback();
        };
        cleanups.push(() => bc.close());
      } catch (e) {}
    }

    // Local CustomEvent listener
    const customListener = () => {
      menuService.invalidateCache();
      callback();
    };
    window.addEventListener('smart_rest_event_menu_items', customListener);
    cleanups.push(() => window.removeEventListener('smart_rest_event_menu_items', customListener));

    // Storage Event listener
    const storageListener = (e) => {
      if (e.key === 'smart_rest_menu_items') {
        menuService.invalidateCache();
        callback();
      }
    };
    window.addEventListener('storage', storageListener);
    cleanups.push(() => window.removeEventListener('storage', storageListener));

    return () => cleanups.forEach(fn => fn());
  }
};
