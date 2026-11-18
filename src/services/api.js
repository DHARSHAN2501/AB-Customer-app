import { safeStorage } from './supabase.js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || 'https://thsuvmauyksxiltzutwx.supabase.co';
const SUPABASE_KEY = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY)) || 'sb_publishable_9EfDMt_QKs7oaYPYCp_h-w_to0VizR6';

// ==========================================
// IN-FLIGHT GET REQUEST DEDUPLICATION MANAGER
// ==========================================
class RequestManager {
  constructor() {
    this.inflightGets = new Map();
  }

  dedupeGet(requestKey, factory) {
    if (!requestKey) return factory();
    if (this.inflightGets.has(requestKey)) {
      return this.inflightGets.get(requestKey);
    }
    const promise = (async () => {
      try {
        return await factory();
      } finally {
        if (this.inflightGets.get(requestKey) === promise) {
          this.inflightGets.delete(requestKey);
        }
      }
    })();
    this.inflightGets.set(requestKey, promise);
    return promise;
  }

  isAbortError(err) {
    return Boolean(
      err && (
        err.name === 'AbortError' ||
        (err.message === 'Failed to fetch' && err.signal?.aborted) ||
        String(err).includes('AbortError')
      )
    );
  }
}

export const requestManager = new RequestManager();

export async function supabaseRequest(endpoint, options = {}) {
  const { requestKey, signal: externalSignal, ...fetchOptions } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();

  const runFetch = async () => {
    let authHeader = `Bearer ${SUPABASE_KEY}`;
    try {
      const sessionStr = safeStorage.getItem('sb-thsuvmauyksxiltzutwx-auth-token') || safeStorage.getItem('smart_rest_auth_token');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      }
    } catch (e) {}

    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: externalSignal,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": authHeader,
          "Prefer": "return=representation",
          ...(fetchOptions.headers || {})
        }
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        console.warn("Supabase API Warning:", { status: response.status, endpoint, data });
        throw new Error(data?.message || data?.details || `Supabase request failed: ${response.status}`);
      }

      return data;
    } catch (err) {
      if (externalSignal?.aborted && requestManager.isAbortError(err)) {
        return null;
      }
      throw err;
    }
  };

  if (method === 'GET' && requestKey && !externalSignal) {
    return requestManager.dedupeGet(requestKey, runFetch);
  }

  return runFetch();
}

// ==========================================
// CATEGORY AJAX API (Database-Backed)
// ==========================================
function normalizeCategoryRow(row) {
  if (!row) return row;
  return {
    ...row,
    badge: row.badge || '',
    tagline: row.tagline || row.description || '',
    description: row.description || row.tagline || '',
    display_order: Number(row.display_order ?? row.no ?? 0),
    is_active: row.is_active !== false
  };
}

export async function getCategories() {
  const rows = await supabaseRequest(
    "categories?select=*&is_active=neq.false&order=display_order.asc,created_at.asc,name.asc",
    { requestKey: "categories_fetch" }
  );
  return Array.isArray(rows) ? rows.map(normalizeCategoryRow) : [];
}

// ==========================================
// MENU ITEMS AJAX API (Deduplicated Reads)
// ==========================================
export async function getMenuItems() {
  return supabaseRequest("menu_items?select=*&order=name.asc", { requestKey: "menu_items_list" });
}

// ==========================================
// ORDERS AJAX API (Deduplicated Reads)
// ==========================================
export async function getOrders() {
  // Strict Privacy: Customer App never downloads unconstrained restaurant order history
  const activeTbl = Number(safeStorage.getItem('smart_rest_active_table') || 0);
  if (activeTbl > 0) {
    return getCustomerOrders(activeTbl);
  }
  return [];
}

export async function getOrderById(orderId) {
  const data = await supabaseRequest(`orders?select=*&or=(id.eq.${orderId},order_number.eq.${orderId})`, { requestKey: `order_${orderId}` });
  return Array.isArray(data) ? data[0] : data;
}

export async function getOrdersByIds(orderIds = []) {
  const cleanIds = Array.from(new Set((orderIds || []).map(v => String(v || '').trim()).filter(Boolean)));
  if (cleanIds.length === 0) return [];
  if (cleanIds.length === 1) {
    const single = await getOrderById(cleanIds[0]);
    return single ? [single] : [];
  }
  const encodedList = cleanIds.map(id => `"${id.replace(/"/g, '')}"`).join(',');
  const key = `orders_batch_${cleanIds.join('_')}`;
  const data = await supabaseRequest(
    `orders?select=*&or=(id.in.(${encodedList}),order_number.in.(${encodedList}))`,
    { requestKey: key }
  );
  return Array.isArray(data) ? data : [];
}

export async function getCustomerOrders(tableNumber) {
  return supabaseRequest(`orders?select=*&table_number=eq.${tableNumber}`, { requestKey: `orders_table_${tableNumber}` });
}

export async function createOrder(orderPayload) {
  return supabaseRequest("orders", {
    method: "POST",
    body: JSON.stringify(orderPayload)
  });
}

export async function updateOrderStatus(orderId, status) {
  return supabaseRequest(`orders?or=(id.eq.${orderId},order_number.eq.${orderId})`, {
    method: "PATCH",
    body: JSON.stringify({ order_status: status })
  });
}

export async function requestBill(orderId) {
  return supabaseRequest(`orders?or=(id.eq.${orderId},order_number.eq.${orderId})&bill_status=neq.PAID`, {
    method: "PATCH",
    body: JSON.stringify({ bill_status: "REQUESTED" })
  });
}
