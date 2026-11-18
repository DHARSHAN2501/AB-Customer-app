import {
  getOrderById as ajaxGetOrderById,
  getOrdersByIds as ajaxGetOrdersByIds,
  getCustomerOrders as ajaxGetCustomerOrders,
  createOrder as ajaxCreateOrder,
  updateOrderStatus as ajaxUpdateOrderStatus,
  requestBill as ajaxRequestBill
} from './api.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

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
    const missingIds = allIds.slice(-5).filter(
      id => !list.some(o => o.id === id || o.order_number === id)
    );
    if (missingIds.length > 0) {
      try {
        const fetched = await ajaxGetOrdersByIds(missingIds);
        if (Array.isArray(fetched)) {
          list.push(...fetched);
        }
      } catch (e) {}
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
      if (data && Array.isArray(data)) {
        return data
          .filter(o => Number(o.table_number) === tbl && o.order_type !== 'HOME_DELIVERY')
          .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
      }
    } catch (e) {
      console.warn('AJAX getOrdersByTable failed:', e.message);
    }
    return [];
  },

  getOrderById: async (orderId) => {
    if (!orderId) return null;
    try {
      const data = await ajaxGetOrderById(orderId);
      if (data && (data.id || data.order_number)) {
        return data;
      }
    } catch (e) {}
    return null;
  },

  getDeviceOrderIds: () => {
    try {
      const raw = localStorage.getItem('smart_rest_device_orders');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
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
    } catch (e) {}
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
    } catch (e) {
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

      localStorage.removeItem('smart_rest_active_order_id');
      localStorage.removeItem('smart_rest_active_order');
      localStorage.removeItem('smart_rest_active_order_number');
      localStorage.removeItem('smart_rest_active_table');
      try {
        localStorage.removeItem('smart_rest_cart');
      } catch (e) {}

      for (let i = 0; i <= 50; i++) {
        try { localStorage.removeItem(`smart_rest_active_order_t${i}`); } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('smart_rest_session_finished', { detail: { closedIds: updated } }));
    } catch (e) {}
  },

  getActiveCustomerOrder: async (tableNumber, explicitOrderId) => {
    const closedIds = orderService.getClosedOrderIds();

    if (explicitOrderId && !closedIds.includes(String(explicitOrderId))) {
      const ord = await orderService.getOrderById(explicitOrderId);
      if (ord && !closedIds.includes(String(ord.id)) && !closedIds.includes(String(ord.order_number))) return ord;
    }

    const targetTbl = Number(tableNumber || (function () {
      try {
        const s = localStorage.getItem('smart_rest_active_table');
        return (s && !isNaN(s)) ? Number(s) : 0;
      } catch (e) { return 0; }
    })());

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
    } catch (e) {}

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

    return null;
  },

  createOrder: async (orderPayload) => {
    const orderId = `ord-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderNumber = `ORD${Math.floor(1000 + Math.random() * 9000)}`;

    const formattedItems = (orderPayload.items || []).map(i => ({
      menu_item_id: i.menu_item_id || i.menuItem?.id || '',
      item_name: i.item_name || i.menuItem?.name || 'Food Item',
      quantity: Number(i.quantity || 1),
      price: Number(i.price || i.menuItem?.price || 0),
      special_instruction: i.special_instruction || ''
    }));

    const dbOrderPayload = {
      id: orderId,
      order_number: orderNumber,
      table_number: Number(orderPayload.table_number || 0),
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

    return {
      ...dbOrderPayload,
      ...(insertedOrder || {}),
      order_type: orderPayload.order_type || (orderPayload.delivery_address ? 'HOME_DELIVERY' : 'DINE_IN'),
      created_at: insertedOrder?.created_at || new Date().toISOString()
    };
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
    await ajaxUpdateOrderStatus(orderId, status);
    return true;
  },

  requestBillForOrder: async (orderId) => {
    await ajaxRequestBill(orderId);
    return true;
  },

  requestBillForTable: async (tableNumber) => {
    const list = await orderService.getOrdersByTable(tableNumber);
    const unpaid = (list || []).filter(o => o.bill_status !== 'PAID');
    await Promise.all(unpaid.map(o => ajaxRequestBill(o.id)));
    return true;
  },

  subscribeToOrders: (callback) => {
    const cleanups = [];
    let isRealtimeSubscribed = false;
    let hasConnectedOnce = false;

    if (isSupabaseConfigured()) {
      try {
        const sub = supabase
          .channel('public:orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            callback(payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isRealtimeSubscribed = true;
              if (hasConnectedOnce) {
                callback({ eventType: 'RECONNECT_RESYNC' });
              }
              hasConnectedOnce = true;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              isRealtimeSubscribed = false;
            }
          });
        cleanups.push(() => supabase.removeChannel(sub));
      } catch (e) {}
    }

    // Fallback poll runs ONLY when WebSocket Realtime is disconnected AND this device has an active table or order
    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (isRealtimeSubscribed) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const hasContext = Number(localStorage.getItem('smart_rest_active_table') || 0) > 0 ||
        Boolean(localStorage.getItem('smart_rest_active_order_id') || localStorage.getItem('smart_rest_active_order'));
      if (!hasContext) return;
      if (isPolling) return;
      isPolling = true;
      try {
        callback({ eventType: 'POLL_REFRESH' });
      } catch (e) {
      } finally {
        isPolling = false;
      }
    }, 25000);
    cleanups.push(() => clearInterval(pollInterval));

    return () => {
      cleanups.forEach(fn => fn());
    };
  }
};
