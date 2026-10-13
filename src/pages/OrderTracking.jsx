import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useCart } from '../context/CartContext';
import { StatusBadge } from '../components/StatusBadge';
import { ModalUI } from '../components/ModalUI';
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Utensils, 
  HeartHandshake, 
  Receipt, 
  PlusCircle, 
  Sparkles, 
  XCircle, 
  Truck, 
  MapPin, 
  Phone 
} from 'lucide-react';

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

// Helper to determine if a bulk order has moved to next stage (Preparing, Ready, Dispatched, Accepted, etc.)
export const isBulkInNextStage = (order) => {
  if (!isBulkOrder(order)) return false;
  const s = String(order.order_status || order.status || '').trim().toUpperCase();
  // Any stage beyond initial PENDING placement:
  return s === 'ACCEPTED' || 
         s === 'PREPARING' || 
         s === 'READY' || 
         s === 'SHIPPED' || 
         s === 'DISPATCHED' || 
         s === 'OUT_FOR_DELIVERY' || 
         s === 'ON_THE_WAY' || 
         s === 'IN_TRANSIT' ||
         s === 'SERVED' ||
         s === 'DELIVERED' ||
         s === 'COMPLETED';
};

export const CustomerOrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { tableNumber, setTableNumber, clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [tableOrders, setTableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const storedTable = (function() {
    try {
      const s = localStorage.getItem('smart_rest_active_table');
      return (s && !isNaN(s)) ? Number(s) : 0;
    } catch(e) { return 0; }
  })();
  const effectiveTable = (tableNumber && tableNumber > 0) ? tableNumber : storedTable;

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async (isInitial = false) => {
      if (isInitial) setLoading(true);

      const targetTbl = effectiveTable > 0 ? effectiveTable : Number(localStorage.getItem('smart_rest_active_table') || 0);
      const closedIds = orderService.getClosedOrderIds();

      const searchParams = new URLSearchParams(window.location.search);
      const urlOrder = searchParams.get('order') || searchParams.get('orderId');

      let targetId = orderId || urlOrder || (function(){ 
        try { 
          return (
            localStorage.getItem('smart_rest_active_order_id') || 
            localStorage.getItem('smart_rest_active_order') || 
            localStorage.getItem('smart_rest_active_order_number') ||
            (targetTbl > 0 ? localStorage.getItem(`smart_rest_active_order_t${targetTbl}`) : null)
          ); 
        } catch(e) { return null; } 
      })();

      if (targetId && closedIds.includes(String(targetId))) {
        targetId = null;
      }

      let ord = null;
      if (targetId) {
        ord = await orderService.getOrderById(targetId);
        if (ord && (closedIds.includes(String(ord.id)) || closedIds.includes(String(ord.order_number)))) {
          ord = null;
        }
      }

      if (ord) {
        orderService.registerDeviceOrder([ord.id, ord.order_number]);
      }

      let allTableOrders = [];
      if (targetTbl > 0) {
        allTableOrders = await orderService.getOrdersByTable(targetTbl);
      }
      if (ord && !allTableOrders.some(o => o.id === ord.id || o.order_number === ord.order_number)) {
        allTableOrders = [ord, ...allTableOrders];
      }

      // 1. If target order is cancelled, close immediately
      if (ord) {
        const s = String(ord.order_status || '').toUpperCase();
        if (s === 'CANCELLED') {
          try {
            orderService.closeOrderSession([ord.id, ord.order_number]);
          } catch(e) {}
          ord = null;
        }
      }

      // 2. Active unpaid orders for the table (filter out cancelled and closed orders)
      const nonCancelledOrders = (allTableOrders || []).filter(o => {
        return (
          String(o.order_status || '').toUpperCase() !== 'CANCELLED' &&
          !closedIds.includes(String(o.id)) &&
          !closedIds.includes(String(o.order_number))
        );
      });

      const activeUnpaidTableOrders = nonCancelledOrders.filter(o => {
        return String(o.bill_status || '').toUpperCase() !== 'PAID';
      });

      // 3. If no target order found, use the latest active unpaid order for table (dine-in only, targetTbl > 0)
      if (!ord && targetTbl > 0) {
        if (activeUnpaidTableOrders.length > 0) {
          ord = activeUnpaidTableOrders[0];
          try {
            localStorage.setItem(`smart_rest_active_order_t${targetTbl}`, ord.id || ord.order_number);
            localStorage.setItem('smart_rest_active_order_id', ord.id);
            localStorage.setItem('smart_rest_active_order', ord.id || ord.order_number);
            if (ord.table_number) localStorage.setItem('smart_rest_active_table', ord.table_number);
          } catch(e) {}
        } else {
          // Check if there was a recent paid order for table that hasn't been closed by user
          const paidOrders = nonCancelledOrders.filter(o => String(o.bill_status || '').toUpperCase() === 'PAID');
          if (paidOrders.length > 0) {
            if (targetId) {
              const match = paidOrders.find(o => o.id === targetId || o.order_number === targetId);
              ord = match || paidOrders[0];
            } else {
              ord = paidOrders[0];
            }
          }
        }
      }

      // 4. Safe fallback via getActiveCustomerOrder
      if (!ord) {
        const fallback = await orderService.getActiveCustomerOrder(targetTbl, targetId);
        if (fallback && String(fallback.order_status || '').toUpperCase() !== 'CANCELLED') {
          ord = fallback;
          orderService.registerDeviceOrder([fallback.id, fallback.order_number]);
        }
      }

      // 5. If strictly cancelled, clear storage
      if (ord && String(ord.order_status || '').toUpperCase() === 'CANCELLED') {
        try {
          orderService.closeOrderSession([ord.id, ord.order_number]);
        } catch(e) {}
        ord = null;
      }

      if (isMounted) {
        setTableOrders(activeUnpaidTableOrders.length > 0 ? activeUnpaidTableOrders : (ord ? [ord] : []));
        setOrder(ord || null);
        if (isInitial) setLoading(false);
      }
    };

    fetchOrder(true);

    const unsub = orderService.subscribeToOrders(async () => {
      fetchOrder(false);
    });

    const handleSessionFinished = () => {
      if (isMounted) {
        setOrder(null);
        setTableOrders([]);
      }
    };
    window.addEventListener('smart_rest_session_finished', handleSessionFinished);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener('smart_rest_session_finished', handleSessionFinished);
    };
  }, [orderId, effectiveTable]);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onClose: null
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const handleFinishSession = () => {
    const targetTbl = order?.table_number || effectiveTable || 0;
    const orderIds = [order?.id, order?.order_number, ...(tableOrders.map(o => o.id || o.order_number))].filter(Boolean);
    orderService.closeOrderSession(orderIds);
    if (clearCart) clearCart();
    setOrder(null);
    setTableOrders([]);
    // Initialize new session by navigating to the menu
    navigate(targetTbl > 0 ? `/menu?table=${targetTbl}` : '/menu');
  };

  const handleRequestBill = async () => {
    const targetTable = order?.table_number || effectiveTable || 1;
    if (order?.id) {
      await orderService.requestBillForOrder(order.id);
    }
    await orderService.requestBillForTable(targetTable);
    setModalConfig({
      isOpen: true,
      title: 'Bill Request Sent',
      message: 'Bill request sent to restaurant staff!',
      type: 'success',
      onClose: () => {
        closeModal();
        navigate(`/bill?table=${targetTable}`);
      }
    });
  };

  const openUnableToCancelModal = () => {
    setModalConfig({
      isOpen: true,
      title: 'Unable to Cancel Bulk Order',
      message: 'Once your bulk order has moved to the next stage (Accepted, Preparing, or Packed/Ready for dispatch), online cancellation is not allowed.\n\nPlease contact the restaurant directly to request changes or cancellation:\n\nArunachala Bhavan\n📞 Contact Numbers:\n+65 8226 1646\n+65 8452 1058',
      type: 'confirm',
      confirmText: 'Call +65 8226 1646',
      cancelText: 'Close',
      onConfirm: () => {
        window.location.href = 'tel:+6582261646';
        closeModal();
      },
      onClose: closeModal
    });
  };

  const handleCancelOrder = () => {
    if (!order) return;
    const isBulk = isBulkOrder(order);
    const currentStatus = String(order.order_status || '').trim().toUpperCase();

    // In Bulk Orders System, once cooking/prep starts or order moves to next stage, online cancellation is blocked
    if (isBulkInNextStage(order)) {
      openUnableToCancelModal();
      return;
    }

    if (currentStatus === 'SERVED' || currentStatus === 'DELIVERED' || currentStatus === 'COMPLETED' || isPaid) {
      setModalConfig({
        isOpen: true,
        title: 'Cancellation Not Allowed',
        message: isBulk 
          ? 'This bulk order has already been delivered successfully and cannot be cancelled.\n\nContact Arunachala Bhavan: +65 8226 1646, +65 8452 1058'
          : 'This order has already been served and delivered successfully and cannot be cancelled.',
        type: 'warning',
        confirmText: 'Understood',
        cancelText: null,
        onConfirm: closeModal,
        onClose: closeModal
      });
      return;
    }
    setModalConfig({
      isOpen: true,
      title: 'Request Order Cancellation',
      message: 'Are you sure you want to cancel this order?',
      type: 'danger',
      confirmText: 'Yes, Cancel Order',
      cancelText: 'No, Keep Order',
      onConfirm: async () => {
        const isPending = order.order_status === 'PENDING';
        const newStatus = isPending ? 'CANCELLED' : 'CANCEL_REQUESTED';
        await orderService.updateOrderStatus(order.id, newStatus);
        if (newStatus === 'CANCELLED') {
          orderService.closeOrderSession([order.id, order.order_number]);
          setOrder(null);
          setTableOrders([]);
        } else {
          const updated = await orderService.getOrderById(order.id);
          if (updated) setOrder(updated);
        }
        closeModal();
      },
      onClose: closeModal
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-500">Loading Order Tracker...</p>
      </div>
    );
  }

  const handleManualLookup = async (e) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    const q = lookupInput.trim().replace(/^#/, '');
    setLookupLoading(true);
    setLookupError('');
    try {
      const found = await orderService.getOrderById(q);
      if (found && (found.id || found.order_number)) {
        orderService.registerDeviceOrder([found.id, found.order_number]);
        localStorage.setItem('smart_rest_active_order_id', found.id);
        localStorage.setItem('smart_rest_active_order', found.id);
        if (found.order_number) localStorage.setItem('smart_rest_active_order_number', found.order_number);
        setOrder(found);
        navigate(`/order-tracking/${found.id}`);
      } else {
        setLookupError(`Order #${q} not found. Please verify the order number.`);
      }
    } catch(err) {
      setLookupError('Could not find order. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-sm">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">No Active Order Found</h2>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Track your live order status or enter your order number below:
          </p>
        </div>

        {/* Quick Order # Lookup Form */}
        <form onSubmit={handleManualLookup} className="w-full space-y-2 pt-1">
          <div className="relative w-full flex items-center">
            <input 
              type="text" 
              placeholder="Enter Order # (e.g. ORD5659)" 
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl pl-3.5 pr-22 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white uppercase tracking-wider transition"
            />
            <button 
              type="submit" 
              disabled={lookupLoading}
              className="absolute right-1.5 top-1.5 bottom-1.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-4 rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0 disabled:opacity-50 flex items-center justify-center"
            >
              {lookupLoading ? '...' : 'Track'}
            </button>
          </div>
          {lookupError && (
            <p className="text-rose-500 text-xs font-bold text-center px-1">{lookupError}</p>
          )}
        </form>

        <div className="w-full pt-2 border-t border-slate-200">
          <Link 
            to={effectiveTable > 0 ? `/menu?table=${effectiveTable}` : '/menu'} 
            className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 px-6 rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 text-decoration-none flex items-center justify-center gap-2"
          >
            <Utensils className="w-4 h-4 text-white" />
            <span>Explore Menu & Order Food</span>
          </Link>
        </div>
      </div>
    );
  }

  const isHomeDelivery = order.order_type === 'HOME_DELIVERY' || Number(order.table_number) === 0 || Boolean(order.delivery_address && order.delivery_address.trim().length > 0);
  const isBulk = isBulkOrder(order);
  const isPaid = (order && String(order.bill_status || '').toUpperCase() === 'PAID') || (tableOrders.length > 0 && tableOrders.every(o => String(o.bill_status || '').toUpperCase() === 'PAID'));
  const orderStatusUpper = String(order.order_status || '').trim().toUpperCase();
  const isServedOrDelivered = orderStatusUpper === 'SERVED' || orderStatusUpper === 'DELIVERED' || orderStatusUpper === 'COMPLETED' || isPaid;
  const isBulkInKitchenOrShipped = isBulkInNextStage(order);
  const canCancel = !isServedOrDelivered && !isBulkInKitchenOrShipped && orderStatusUpper !== 'CANCELLED' && orderStatusUpper !== 'CANCEL_REQUESTED';

  const steps = isHomeDelivery ? [
    { key: 'PENDING', label: 'Bulk Order Placed', icon: Clock, desc: 'Received by kitchen system' },
    { key: 'ACCEPTED', label: 'Accepted by Kitchen', icon: CheckCircle2, desc: 'Chef reviewing bulk items' },
    { key: 'PREPARING', label: 'Preparing Bulk Meal', icon: ChefHat, desc: 'Fresh ingredients being cooked' },
    { key: 'READY', label: 'Packed & Dispatched', icon: Truck, desc: 'Packed & ready for SG home delivery' },
    { key: 'SERVED', label: 'Delivered to Home Address', icon: HeartHandshake, desc: 'En route / Delivered to your location!' },
  ] : [
    { key: 'PENDING', label: 'Order Placed', icon: Clock, desc: 'Received by kitchen system' },
    { key: 'ACCEPTED', label: 'Accepted by Kitchen', icon: CheckCircle2, desc: 'Chef started review' },
    { key: 'PREPARING', label: 'Preparing in Kitchen', icon: ChefHat, desc: 'Fresh ingredients being cooked' },
    { key: 'READY', label: 'Food Ready to Serve', icon: Utensils, desc: 'Waiter pick-up point' },
    { key: 'SERVED', label: 'Served to Table', icon: HeartHandshake, desc: 'Enjoy your meal!' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'ACCEPTED': return 1;
      case 'PREPARING': return 2;
      case 'READY': return 3;
      case 'SERVED': case 'COMPLETED': return 4;
      default: return 0;
    }
  };

  const activeIdx = isPaid ? 4 : getStepIndex(order.order_status);

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 max-w-2xl mx-auto space-y-6">
      
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {isHomeDelivery ? (
            <span className="text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-700" /> Home Delivery (Bulk Order)
            </span>
          ) : (
            <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" /> Table T - {String(order.table_number || effectiveTable || 0).padStart(2, '0')} Live Track
            </span>
          )}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order #{order.order_number}</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Placed at {new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <StatusBadge status={order.order_status} type="order" />
      </div>

      {/* Home Delivery Customer Information Box */}
      {isHomeDelivery && (
        <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/80 to-cyan-50/60 rounded-3xl p-5 border border-indigo-200/80 shadow-xs space-y-2">
          <div className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-700" /> Delivery Address & Contact Details
          </div>
          <div className="text-xs font-bold text-slate-900 space-y-1">
            <div>Customer Name: <span className="font-extrabold text-blue-800">{order.customer_name || 'Home Guest'}</span></div>
            <div className="flex items-center gap-1 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> {order.phone_number || 'N/A'}
            </div>
            <div className="flex items-start gap-1 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" /> 
              <span>{order.delivery_address || 'Delivery Address'} {order.postal_code ? `(Postal: ${order.postal_code})` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Banner Alert */}
      {order.order_status === 'CANCEL_REQUESTED' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-3xl text-xs font-bold flex items-center gap-3 animate-pulse">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-extrabold text-sm">Cancellation Requested</div>
            <div className="font-medium text-[11px] text-rose-700 mt-0.5">Your request to cancel this order has been sent to the kitchen for review.</div>
          </div>
        </div>
      )}

      {order.order_status === 'CANCELLED' && (
        <div className="bg-rose-100/80 border border-rose-300 text-rose-900 p-4 rounded-3xl text-xs font-bold flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-extrabold text-sm">Order Cancelled</div>
            <div className="font-medium text-[11px] text-rose-800 mt-0.5">This order has been cancelled. Please place a new order if needed.</div>
          </div>
        </div>
      )}

      {/* Paid & Settled Banner Alert */}
      {isPaid && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-300 text-emerald-950 p-5 rounded-3xl text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-sm text-emerald-900 tracking-tight">Payment Completed & Paid in Billing App ✓</div>
              <div className="font-medium text-[11px] text-emerald-700 mt-0.5">
                Your order has been fully settled. Thank you for dining with Arunachala Bhavan!
              </div>
            </div>
          </div>
          <button
            onClick={handleFinishSession}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/25 transition active:scale-95 shrink-0"
          >
            Leave Table & Finish Session
          </button>
        </div>
      )}

      {/* Bulk Order In Progress Notice */}
      {isBulkInKitchenOrShipped && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-100/60 border border-amber-300/90 text-amber-950 p-5 rounded-3xl text-xs space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 font-black text-amber-950 text-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <span className="block font-black text-amber-900 leading-tight">Bulk Order In Progress — Online Cancellation Disabled</span>
              <span className="text-[11px] font-semibold text-amber-700">Kitchen preparation has started or order is packed/dispatched</span>
            </div>
          </div>
          <p className="text-amber-900 text-xs font-medium leading-relaxed">
            In our bulk orders system, once items are being prepared or shipped/ready, orders cannot be cancelled online. To request changes or inquiries, please contact the restaurant directly:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
            <span className="font-black text-slate-900 text-xs">Arunachala Bhavan:</span>
            <a 
              href="tel:+6582261646" 
              className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl text-amber-900 font-extrabold text-xs text-decoration-none shadow-2xs transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-amber-700" /> +65 8226 1646
            </a>
            <a 
              href="tel:+6584521058" 
              className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl text-amber-900 font-extrabold text-xs text-decoration-none shadow-2xs transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-amber-700" /> +65 8452 1058
            </a>
          </div>
        </div>
      )}

      {/* Realtime Preparation Tracker Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-4 flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-blue-700" /> Realtime {isHomeDelivery ? 'Home Delivery' : 'Kitchen'} Timeline
        </h3>
        
        <div className="space-y-6 pl-4 border-l-2 border-slate-200/80">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const done = (isPaid || idx <= activeIdx) && order.order_status !== 'CANCELLED' && order.order_status !== 'CANCEL_REQUESTED';
            const isCurrent = !isPaid && idx === activeIdx && order.order_status !== 'CANCELLED' && order.order_status !== 'CANCEL_REQUESTED';

            return (
              <div key={st.key} className="relative flex items-start gap-4">
                {/* Timeline Dot */}
                <div 
                  className={`-ml-[25px] w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all duration-300 ${
                    done 
                      ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 scale-105' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                      {st.label}
                    </span>
                    {isCurrent && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Itemized Order Preview */}
      {((tableOrders.length > 0 ? tableOrders.flatMap(o => o.items || []) : order.items) || []).length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-slate-400">Items In This Order</h4>
          <div className="space-y-2">
            {(tableOrders.length > 0 ? tableOrders.flatMap(o => o.items || []) : (order.items || [])).map((it, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                <span className="font-bold text-slate-800">{it.item_name} × {it.quantity}</span>
                <span className="font-black text-slate-900">₹{(it.price * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link 
          to={effectiveTable > 0 ? `/menu?table=${effectiveTable}` : '/menu'} 
          className="flex-1 bg-white border border-slate-200/90 text-slate-800 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-2xs hover:bg-slate-50 text-decoration-none transition"
        >
          <PlusCircle className="w-4 h-4 text-blue-700" /> Order More Food
        </Link>

        {isBulkInKitchenOrShipped ? (
          <button 
            type="button"
            onClick={openUnableToCancelModal} 
            className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <Phone className="w-4 h-4 text-amber-700" /> Unable to Cancel — Contact Restaurant
          </button>
        ) : canCancel ? (
          <button 
            type="button"
            onClick={handleCancelOrder} 
            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-rose-600" /> Request Cancel
          </button>
        ) : null}

        {!isHomeDelivery ? (
          !order || !order.id ? (
            <div className="flex-1 bg-slate-100 border border-slate-200 text-slate-400 font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-not-allowed">
              <Receipt className="w-4 h-4 text-slate-400" /> Place Order to Request Bill
            </div>
          ) : (order.order_status === 'CANCELLED' || order.order_status === 'CANCEL_REQUESTED') ? (
            <div className="flex-1 bg-rose-50 border border-rose-200 text-rose-600 font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" /> Order Cancelled - Bill Disabled
            </div>
          ) : isPaid ? (
            <div className="flex-1 flex gap-2">
              <Link
                to={effectiveTable > 0 ? `/bill?table=${effectiveTable}` : '/bill'}
                className="flex-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 font-black py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 text-decoration-none transition hover:bg-emerald-500/25"
              >
                <Receipt className="w-4 h-4 text-emerald-600" /> View Settled Bill
              </Link>
              <button
                onClick={handleFinishSession}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-white" /> Leave Table & Finish Session
              </button>
            </div>
          ) : (
            <button 
              onClick={handleRequestBill} 
              className="flex-1 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <Receipt className="w-4 h-4 text-white" /> Request Table Bill
            </button>
          )
        ) : (
          isPaid ? (
            <button
              onClick={handleFinishSession}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-white" /> Complete & Finish Session
            </button>
          ) : (
            <div className="flex-1 bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
              <Truck className="w-4 h-4 text-white" /> Home Delivery Active
            </div>
          )
        )}
      </div>

      <ModalUI {...modalConfig} onClose={modalConfig.onClose || closeModal} />
    </div>
  );
};

export default CustomerOrderTracking;
