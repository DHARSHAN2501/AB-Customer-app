import { 
  getOrders as ajaxGetOrders, 
  getOrderById as ajaxGetOrderById, 
  getCustomerOrders as ajaxGetCustomerOrders, 
  createOrder as ajaxCreateOrder, 
  updateOrderStatus as ajaxUpdateOrderStatus, 
  requestBill as ajaxRequestBill, 
  markBillPaid as ajaxMarkBillPaid,
  createOrderItems as ajaxCreateOrderItems
} from './api.js';
import { supabase, isSupabaseConfigured, localDB } from './supabase.js';

// Helper to identify bulk order (Home Delivery or >= 25 items or is_bulk flag)
export const isBulkOrder = (order) => {
  if (!order) return false;
  if (order.is_bulk === true || String(order.is_bulk) === 'true') return true;
  if (order.order_type === 'HOME_DELIVERY') return true;
  if (Number(order.table_number) === 0) return true;
  if (order.delivery_address && String(order.delivery_address).trim().length > 0) return true;
  const rawItems = Array.isArray(order.items)
    ? order.items
    : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
  const count = rawItems.reduce((acc, it) => acc + Number(it.quantity || it.qty || 1), 0);
  return count >= 25;
};

export const orderService = {
  getOrders: async () => {
    // Customer devices retrieve orders associated with their active table or placed by this device.
    const list = [];
    const activeTbl = Number(localStorage.getItem('smart_rest_active_table') || 0);
    if (activeTbl > 0) {
      const tblOrders = await orderService.getOrdersByTable(activeTbl);
      list.push(...tblOrders);
    }
    const deviceIds = orderService.getDeviceOrderIds();
    const storedActiveId = localStorage.getItem('smart_rest_active_order_id') || 
                           localStorage.getItem('smart_rest_active_order') || 
                           localStorage.getItem('smart_rest_active_order_number');
    const allIds = Array.from(new Set([...deviceIds, storedActiveId].filter(Boolean)));
    for (const id of allIds.slice(-5)) {
      if (!list.some(o => o.id === id || o.order_number === id)) {
        const ord = await orderService.getOrderById(id);
        if (ord) list.push(ord);
      }
    }
    return list.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
  },

  getOrdersByTable: async (tableNumber) => {
    const tbl = Number(tableNumber);
    if (!tbl || isNaN(tbl) || tbl <= 0) {
      return [];
    }
    try {
      const data = await ajaxGetCustomerOrders(tbl);
      if (data && Array.isArray(data) && data.length > 0) {
        const dineInOnly = data.filter(o => Number(o.table_number) === tbl && o.order_type !== 'HOME_DELIVERY');
        try {
          const currentLocal = localDB.getOrders() || [];
          const map = new Map(currentLocal.map(o => [String(o.id || o.order_number), o]));
          dineInOnly.forEach(o => map.set(String(o.id || o.order_number), o));
          localDB.saveOrders(Array.from(map.values()));
        } catch(e) {}
        return dineInOnly.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
      }
    } catch (e) {
      console.warn('AJAX getOrdersByTable failed:', e.message);
    }
    const currentLocal = localDB.getOrders() || [];
    return currentLocal
      .filter(o => Number(o.table_number) === tbl && o.order_type !== 'HOME_DELIVERY')
      .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
  },

  getOrderById: async (orderId) => {
    if (!orderId) return null;
    try {
      const data = await ajaxGetOrderById(orderId);
      if (data && (data.id || data.order_number)) {
        try {
          const currentLocal = localDB.getOrders() || [];
          const map = new Map(currentLocal.map(o => [String(o.id || o.order_number), o]));
          map.set(String(data.id || data.order_number), data);
          localDB.saveOrders(Array.from(map.values()));
        } catch(e) {}
        return data;
      }
    } catch (e) {}
    const currentLocal = localDB.getOrders() || [];
    return currentLocal.find(o => 
      String(o.id || '').toLowerCase() === String(orderId).toLowerCase() || 
      String(o.order_number || '').toLowerCase() === String(orderId).toLowerCase()
    ) || null;
  },

  getDeviceOrderIds: () => {
    try {
      const raw = localStorage.getItem('smart_rest_device_orders');
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  },

  registerDeviceOrder: (orderIds) => {
    try {
      const raw = localStorage.getItem('smart_rest_device_orders');
      const list = raw ? JSON.parse(raw) : [];
      const toAdd = Array.isArray(orderIds) ? orderIds : [orderIds];
      const updated = Array.from(new Set([...list, ...toAdd.filter(Boolean).map(String)]));
      localStorage.setItem('smart_rest_device_orders', JSON.stringify(updated));
    } catch(e) {}
  },

  isDeviceOrder: (orderId) => {
    if (!orderId) return false;
    const list = orderService.getDeviceOrderIds();
    return list.includes(String(orderId));
  },

  getClosedOrderIds: () => {
    try {
      const raw = localStorage.getItem('smart_rest_closed_orders');
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  },

  isOrderClosed: (orderId) => {
    if (!orderId) return false;
    const closed = orderService.getClosedOrderIds();
    return closed.includes(String(orderId));
  },

  closeOrderSession: (orderIds) => {
    try {
      const current = orderService.getClosedOrderIds();
      const list = Array.isArray(orderIds) ? orderIds : [orderIds];
      const valid = list.filter(Boolean).map(String);
      const updated = Array.from(new Set([...current, ...valid]));
      localStorage.setItem('smart_rest_closed_orders', JSON.stringify(updated));

      // Remove active session references
      localStorage.removeItem('smart_rest_active_order_id');
      localStorage.removeItem('smart_rest_active_order');
      localStorage.removeItem('smart_rest_active_order_number');
      localStorage.removeItem('smart_rest_active_table');
      try {
        localStorage.removeItem('smart_rest_cart');
      } catch(e) {}

      // Clean all table-specific keys
      for (let i = 0; i <= 50; i++) {
        try { localStorage.removeItem(`smart_rest_active_order_t${i}`); } catch(e) {}
      }

      // Notify components and tabs
      window.dispatchEvent(new CustomEvent('smart_rest_session_finished', { detail: { closedIds: updated } }));
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('smart_rest_bc_orders');
          bc.postMessage({ detail: 'SESSION_FINISHED', closedIds: updated });
          bc.close();
        } catch(e) {}
      }
    } catch(e) {}
  },

  getActiveCustomerOrder: async (tableNumber, explicitOrderId) => {
    const closedIds = orderService.getClosedOrderIds();

    // 1. Explicit ID
    if (explicitOrderId && !closedIds.includes(String(explicitOrderId))) {
      const ord = await orderService.getOrderById(explicitOrderId);
      if (ord && !closedIds.includes(String(ord.id)) && !closedIds.includes(String(ord.order_number))) return ord;
    }

    const targetTbl = Number(tableNumber || (function(){
      try {
        const s = localStorage.getItem('smart_rest_active_table');
        return (s && !isNaN(s)) ? Number(s) : 0;
      } catch(e) { return 0; }
    })());

    // 2. Stored ID from this device's localStorage
    try {
      const storedId = localStorage.getItem('smart_rest_active_order_id') || 
                       localStorage.getItem('smart_rest_active_order') ||
                       localStorage.getItem('smart_rest_active_order_number');
      if (storedId && !closedIds.includes(String(storedId))) {
        const ord = await orderService.getOrderById(storedId);
        if (ord && !closedIds.includes(String(ord.id)) && !closedIds.includes(String(ord.order_number))) {
          orderService.registerDeviceOrder([ord.id, ord.order_number]);
          return ord;
        }
      }
    } catch(e) {}

    // 3. Stored table or provided tableNumber (Dine-In ONLY, table > 0)
    if (targetTbl > 0) {
      const list = await orderService.getOrdersByTable(targetTbl);
      const active = (list || []).filter(o => 
        Number(o.table_number) === targetTbl &&
        o.order_type !== 'HOME_DELIVERY' &&
        String(o.order_status || '').toUpperCase() !== 'CANCELLED' &&
        !closedIds.includes(String(o.id)) &&
        !closedIds.includes(String(o.order_number))
      );
      if (active.length > 0) return active[0];
    }

    // Strict multi-device isolation: never fall back to another customer's order!
    return null;
  },

  createOrder: async (orderPayload) => {
    // 1. Create in localDB first to guarantee instant UI response & cross-tab BroadcastChannel events
    const localOrder = localDB.createOrder(orderPayload);

    // 2. Format items list for both JSONB storage and relational table
    const formattedItems = (orderPayload.items || []).map(i => ({
      menu_item_id: i.menu_item_id || i.menuItem?.id || '',
      item_name: i.item_name || i.menuItem?.name || 'Food Item',
      quantity: Number(i.quantity || 1),
      price: Number(i.price || i.menuItem?.price || 0),
      special_instruction: i.special_instruction || ''
    }));

    // 3. Insert into Supabase via AJAX REST API
    try {
      const dbOrderPayload = {
        id: localOrder.id,
        order_number: localOrder.order_number,
        table_number: Number(orderPayload.table_number),
        customer_name: orderPayload.customer_name || 'Guest Customer',
        subtotal: Number(orderPayload.subtotal || 0),
        tax: Number(orderPayload.tax || 0),
        total_amount: Number(orderPayload.total_amount || 0),
        order_status: 'PENDING',
        bill_status: 'NOT_REQUESTED',
        notes: orderPayload.notes || '',
        items: formattedItems
      };

      const res = await ajaxCreateOrder(dbOrderPayload);
      const insertedOrder = Array.isArray(res) ? res[0] : res;

      if (insertedOrder && formattedItems.length > 0) {
        const itemsToInsert = formattedItems.map(i => ({
          order_id: insertedOrder.id || localOrder.id,
          menu_item_id: i.menu_item_id,
          item_name: i.item_name,
          quantity: i.quantity,
          price: i.price,
          special_instruction: i.special_instruction
        }));
        await ajaxCreateOrderItems(itemsToInsert);
      }
    } catch (e) {
      console.warn('AJAX createOrder error:', e.message);
    }

    return localOrder;
  },

  updateOrderStatus: async (orderId, status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'CANCELLED' || s === 'CANCEL_REQUESTED') {
      const existing = await orderService.getOrderById(orderId);
      if (existing) {
        const isBulk = isBulkOrder(existing);
        const current = String(existing.order_status || '').toUpperCase();
        const bill = String(existing.bill_status || '').toUpperCase();
        if (current === 'SERVED' || current === 'DELIVERED' || current === 'COMPLETED' || bill === 'PAID') {
          console.warn('Cannot cancel an order that has already been served or delivered successfully.');
          return false;
        }
        if (isBulk && current !== 'PENDING') {
          console.warn('Bulk orders in progress (ACCEPTED/PREPARING/READY/DISPATCHED) cannot be cancelled online. Contact Arunachala Bhavan: +65 8226 1646, +65 8452 1058');
          return false;
        }
      }
    }
    localDB.updateOrderStatus(orderId, status);
    try {
      await ajaxUpdateOrderStatus(orderId, status);
    } catch (e) {
      console.warn('AJAX updateOrderStatus error:', e.message);
    }
    return true;
  },

  requestBillForOrder: async (orderId) => {
    localDB.updateBillStatus(orderId, 'REQUESTED');
    try {
      await ajaxRequestBill(orderId);
    } catch (e) {}
    return true;
  },

  requestBillForTable: async (tableNumber) => {
    const list = await orderService.getOrdersByTable(tableNumber);
    if (list && list.length > 0) {
      for (const o of list) {
        if (o.bill_status !== 'PAID') {
          localDB.updateBillStatus(o.id, 'REQUESTED');
          try {
            await ajaxRequestBill(o.id);
          } catch(e) {}
        }
      }
    } else {
      const tableOrders = await orderService.getOrdersByTable(tableNumber);
      tableOrders.forEach(o => {
        if (Number(o.table_number) === Number(tableNumber) && o.bill_status !== 'PAID') {
          localDB.updateBillStatus(o.id, 'REQUESTED');
          ajaxRequestBill(o.id).catch(() => {});
        }
      });
    }
    return true;
  },

  markBillAsPaid: async (orderId) => {
    localDB.updateBillStatus(orderId, 'PAID');
    try {
      await ajaxMarkBillPaid(orderId);
    } catch (e) {}
    return true;
  },

  subscribeToOrders: (callback) => {
    const cleanups = [];

    // Supabase Realtime Channel with Reconnect Reconciliation
    if (isSupabaseConfigured()) {
      try {
        let channelConnected = false;
        const sub = supabase
          .channel('public:orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            callback(payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              if (channelConnected) {
                // Channel reconnected after drop — reconcile table orders immediately
                callback({ eventType: 'RECONNECT_RESYNC' });
              }
              channelConnected = true;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              channelConnected = false;
            }
          });
        cleanups.push(() => supabase.removeChannel(sub));
      } catch (e) {}
    }

    // BroadcastChannel (Instant cross-tab real-time sync)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('smart_rest_bc_orders');
        bc.onmessage = (event) => {
          callback({ eventType: 'UPDATE', detail: event.data?.detail });
        };
        cleanups.push(() => bc.close());
      } catch (e) {}
    }

    // Local CustomEvent Listener
    const customListener = (e) => callback({ eventType: 'UPDATE', detail: e.detail });
    window.addEventListener('smart_rest_event_orders', customListener);
    cleanups.push(() => window.removeEventListener('smart_rest_event_orders', customListener));

    // Native Storage Event (Fires across all open browser tabs/apps)
    const storageListener = (e) => {
      if (e.key === 'smart_rest_orders') {
        callback({ eventType: 'UPDATE' });
      }
    };
    window.addEventListener('storage', storageListener);
    cleanups.push(() => window.removeEventListener('storage', storageListener));

    // Adaptive Ajax Auto-Refresh Interval (Fallback polling when tab is visible, avoiding redundant double-fetch)
    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isPolling) return;
      isPolling = true;
      try {
        callback({ eventType: 'POLL_REFRESH' });
      } catch (e) {
      } finally {
        isPolling = false;
      }
    }, 10000);
    cleanups.push(() => clearInterval(pollInterval));

    return () => {
      cleanups.forEach(fn => fn());
    };
  }
};
