import { supabase, isSupabaseConfigured } from './supabase';
import { getCategories as ajaxGetCategories, getMenuItems as ajaxGetMenuItems } from './api.js';
import { getItemCategory } from '../constants/categories';

let cachedCategories = null;
let lastCategoriesFetchTime = 0;
let cachedMenuItems = null;
let lastMenuFetchTime = 0;
const CACHE_TTL_MS = 120000; // 2 minute in-memory cache, selectively updated/invalidated on Realtime DB changes

export const menuService = {
  invalidateCache: (scope = 'all') => {
    if (scope === 'categories' || scope === 'all') {
      cachedCategories = null;
      lastCategoriesFetchTime = 0;
    }
    if (scope === 'menu_items' || scope === 'all') {
      cachedMenuItems = null;
      lastMenuFetchTime = 0;
    }
  },

  getCategories: async (forceRefresh = false) => {
    if (!forceRefresh && cachedCategories && (Date.now() - lastCategoriesFetchTime < CACHE_TTL_MS)) {
      return cachedCategories;
    }

    const remoteCats = await ajaxGetCategories();
    const list = Array.isArray(remoteCats) ? remoteCats : [];
    cachedCategories = list;
    lastCategoriesFetchTime = Date.now();
    return list;
  },

  getMenuItems: async (forceRefresh = false) => {
    if (!forceRefresh && cachedMenuItems && (Date.now() - lastMenuFetchTime < CACHE_TTL_MS)) {
      return cachedMenuItems;
    }

    let items = [];
    try {
      const data = await ajaxGetMenuItems();
      if (Array.isArray(data)) {
        items = data;
      }
    } catch (e) {
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('menu_items').select('*').order('name');
        if (Array.isArray(data)) items = data;
      }
    }

    const classifiedItems = items.map(item => {
      const assignedCat = (item.category_name || item.category_id || '').trim() || getItemCategory(item);
      return {
        ...item,
        category_name: assignedCat,
        category_id: assignedCat
      };
    });

    cachedMenuItems = classifiedItems;
    lastMenuFetchTime = Date.now();
    return classifiedItems;
  },

  subscribeToMenu: (callback) => {
    if (!isSupabaseConfigured()) return () => {};

    let debounceTimer = null;
    let pendingCategories = false;
    let pendingItems = false;

    const scheduleFlush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const scope = {
          categoriesChanged: pendingCategories,
          itemsChanged: pendingItems
        };
        pendingCategories = false;
        pendingItems = false;
        callback(scope);
      }, 220);
    };

    try {
      let hasConnectedOnce = false;
      const channel = supabase
        .channel('public:menu_sync:customer')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          menuService.invalidateCache('categories');
          pendingCategories = true;
          scheduleFlush();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
          menuService.invalidateCache('menu_items');
          pendingItems = true;
          scheduleFlush();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (hasConnectedOnce) {
              menuService.invalidateCache('all');
              pendingCategories = true;
              pendingItems = true;
              scheduleFlush();
            }
            hasConnectedOnce = true;
          }
        });

      // Window focus and visibility listener: auto-refresh menu when returning to the app on mobile
      const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          menuService.invalidateCache('all');
          pendingCategories = true;
          pendingItems = true;
          scheduleFlush();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
      }

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (typeof window !== 'undefined') {
          window.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleVisibilityChange);
        }
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }
};
