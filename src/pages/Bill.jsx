import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useCart } from '../context/CartContext';
import { Receipt, CreditCard, ArrowLeft, CheckCircle2, Store, Utensils } from 'lucide-react';

export const CustomerBill = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tableNumber, setTableNumber, clearCart } = useCart();
  const urlTable = searchParams.get('table');
  const storedTable = (function() {
    try {
      const s = localStorage.getItem('smart_rest_active_table');
      return (s && !isNaN(s)) ? Number(s) : 0;
    } catch(e) { return 0; }
  })();
  const activeTable = urlTable ? Number(urlTable) : (tableNumber || storedTable);
  const [orders, setOrders] = useState([]);
  const [requestingBill, setRequestingBill] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      let list = [];
      const targetTbl = activeTable > 0 ? activeTable : Number(localStorage.getItem('smart_rest_active_table') || 0);
      const closedIds = orderService.getClosedOrderIds();

      // Check explicit URL order parameter
      const urlOrderId = searchParams.get('order') || searchParams.get('orderId');
      if (urlOrderId && !closedIds.includes(String(urlOrderId))) {
        const urlOrd = await orderService.getOrderById(urlOrderId);
        if (urlOrd && !closedIds.includes(String(urlOrd.id)) && !closedIds.includes(String(urlOrd.order_number))) {
          list = [urlOrd];
          orderService.registerDeviceOrder([urlOrd.id, urlOrd.order_number]);
        }
      }

      // 1. Try fetching orders for the active table
      if (list.length === 0 && targetTbl > 0) {
        list = await orderService.getOrdersByTable(targetTbl);
      }

      // Filter out any orders that have been marked closed in this customer's session
      list = (list || []).filter(o => 
        !closedIds.includes(String(o.id)) && 
        !closedIds.includes(String(o.order_number))
      );

      // 2. Also check stored active order ID (Home Delivery / bulk orders or this device's order)
      const activeOrderId = localStorage.getItem('smart_rest_active_order_id') || 
                            localStorage.getItem('smart_rest_active_order') ||
                            localStorage.getItem('smart_rest_active_order_number');
      if (activeOrderId && !closedIds.includes(String(activeOrderId))) {
        if (!list.some(o => o.id === activeOrderId || o.order_number === activeOrderId)) {
          const singleOrder = await orderService.getOrderById(activeOrderId);
          if (singleOrder && !closedIds.includes(String(singleOrder.id)) && !closedIds.includes(String(singleOrder.order_number))) {
            orderService.registerDeviceOrder([singleOrder.id, singleOrder.order_number]);
            list = [singleOrder, ...list];
          }
        }
      }

      // 3. Fallback to getActiveCustomerOrder
      if (list.length === 0) {
        const anyActive = await orderService.getActiveCustomerOrder(targetTbl, activeOrderId);
        if (anyActive && !closedIds.includes(String(anyActive.id)) && !closedIds.includes(String(anyActive.order_number))) {
          orderService.registerDeviceOrder([anyActive.id, anyActive.order_number]);
          list = [anyActive];
        }
      }

      // 4. Handle cancellation: "Otherwise if its Cancel Close Immediately"
      const nonCancelled = (list || []).filter(o => String(o.order_status || '').toUpperCase() !== 'CANCELLED');
      if (list && list.length > 0 && nonCancelled.length === 0) {
        try {
          const cancelledIds = list.map(o => o.id || o.order_number).filter(Boolean);
          orderService.closeOrderSession(cancelledIds);
          if (setTableNumber) setTableNumber(0);
        } catch(e) {}
        if (isMounted) setOrders([]);
        return;
      }

      // 5. Separate active unpaid orders and settled paid orders
      const activeUnpaid = nonCancelled.filter(o => String(o.bill_status || '').toUpperCase() !== 'PAID');
      const paidList = nonCancelled.filter(o => String(o.bill_status || '').toUpperCase() === 'PAID');

      if (!isMounted) return;

      // 6. If active orders exist (whether PENDING, PREPARING, READY, or SERVED): NEVER close or empty!
      if (activeUnpaid.length > 0) {
        setOrders(activeUnpaid);
      } else if (paidList.length > 0) {
        // "When Billing App Finish That Order Payment Paid Still it Show That Order Details And Track and Bill in Customer App"
        setOrders(paidList);
      } else {
        setOrders([]);
      }
    };

    load();
    const unsub = orderService.subscribeToOrders(() => load());

    const handleSessionFinished = () => {
      if (isMounted) setOrders([]);
    };
    window.addEventListener('smart_rest_session_finished', handleSessionFinished);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener('smart_rest_session_finished', handleSessionFinished);
    };
  }, [activeTable, urlTable, setTableNumber]);

  const allItems = orders.flatMap(o => o.items || []);
  const subtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const tax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const isPaid = orders.length > 0 && orders.every(o => String(o.bill_status || '').toUpperCase() === 'PAID');
  const isRequested = orders.length > 0 && orders.some(o => String(o.bill_status || '').toUpperCase() === 'REQUESTED');

  const handleRequestBill = async () => {
    const targetTbl = activeTable > 0 ? activeTable : Number(localStorage.getItem('smart_rest_active_table') || 0);
    setRequestingBill(true);
    if (targetTbl > 0) {
      await orderService.requestBillForTable(targetTbl);
    } else if (orders.length > 0 && orders[0].id) {
      await orderService.requestBillForOrder(orders[0].id);
    }
    const updated = targetTbl > 0 ? await orderService.getOrdersByTable(targetTbl) : orders;
    const closedIds = orderService.getClosedOrderIds();
    const unpaid = (updated || []).filter(o => {
      const s = String(o.order_status || '').toUpperCase();
      const b = String(o.bill_status || '').toUpperCase();
      return s !== 'CANCELLED' && b !== 'PAID' && !closedIds.includes(String(o.id));
    });
    setOrders(unpaid.length > 0 ? unpaid : (updated || []));
    setRequestingBill(false);
  };

  const handleFinishSession = () => {
    const orderIds = orders.map(o => o.id || o.order_number).filter(Boolean);
    const targetTbl = activeTable > 0 ? activeTable : Number(localStorage.getItem('smart_rest_active_table') || 0);

    orderService.closeOrderSession(orderIds);
    if (clearCart) clearCart();
    if (setTableNumber) setTableNumber(0);
    setOrders([]);

    // Initialize new session by navigating to the menu
    navigate(targetTbl > 0 ? `/menu?table=${targetTbl}` : '/menu');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        
        {/* Sleek Navy Gradient Receipt Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Arunachala <span className="text-blue-400">Bhavan</span>
            </h1>
          </div>
          <p className="text-blue-200 text-xs font-bold">
            {activeTable > 0 && orders.length > 0 
              ? `Dine-In Table T - ${String(activeTable).padStart(2, '0')} Itemized Receipt` 
              : 'Dine-In Itemized Receipt'}
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {orders.length === 0 ? (
            <div className="text-center py-6 space-y-4">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-sm font-black text-slate-900">No Placed Orders Found</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  View your bill or enter your order number below:
                </p>
              </div>

              {/* Quick Order Lookup Form */}
              <form 
                onSubmit={async (e) => {
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
                      setOrders([found]);
                      navigate(`/bill?order=${found.id}`);
                    } else {
                      setLookupError(`Order #${q} not found. Please verify the order number.`);
                    }
                  } catch(err) {
                    setLookupError('Could not find order. Please try again.');
                  } finally {
                    setLookupLoading(false);
                  }
                }} 
                className="w-full space-y-2 pt-1"
              >
                <div className="relative w-full flex items-center">
                  <input 
                    type="text" 
                    placeholder="Enter Order # (e.g. ORD5659)" 
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl pl-3.5 pr-20 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white uppercase tracking-wider transition"
                  />
                  <button 
                    type="submit" 
                    disabled={lookupLoading}
                    className="absolute right-1.5 top-1.5 bottom-1.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-4 rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0 disabled:opacity-50 flex items-center justify-center"
                  >
                    {lookupLoading ? '...' : 'View'}
                  </button>
                </div>
                {lookupError && (
                  <p className="text-rose-500 text-xs font-bold text-center px-1">{lookupError}</p>
                )}
              </form>

              <div className="w-full pt-2 border-t border-slate-200">
                <Link 
                  to={activeTable > 0 ? `/menu?table=${activeTable}` : '/menu'} 
                  className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 px-6 rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 text-decoration-none flex items-center justify-center gap-2"
                >
                  <Utensils className="w-4 h-4 text-white" />
                  <span>Explore Menu & Order Food</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Order Items */}
              <div className="space-y-2.5 border-b border-slate-100 pb-4">
                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-wider mb-2">Ordered Dishes</h4>
                {allItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{item.item_name} × {item.quantity}</span>
                    <span className="font-black text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-500 font-medium"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500 font-medium"><span>Tax (5% GST)</span><span>₹{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-100">
                  <span>TOTAL BILL AMOUNT</span>
                  <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 bg-clip-text text-transparent text-lg font-black">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Physical Payment Status Card */}
              <div className={`p-4 rounded-2xl border text-center space-y-1 ${isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                <div className="font-extrabold flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider">
                  {isPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CreditCard className="w-4 h-4 text-blue-600" />}
                  <span>{isPaid ? 'PAYMENT COMPLETED ✓' : (isRequested ? 'BILL REQUESTED / AWAITING PAYMENT' : 'BILL PENDING')}</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed">
                  {isPaid 
                    ? 'Payment confirmed by restaurant staff. Thank you!' 
                    : (isRequested 
                        ? 'Staff notified. Please pay at table using physical scanner, card or cash.' 
                        : 'Your order is currently processing. When ready, request bill from staff below.')}
                </p>
              </div>

              {/* Bill Action Buttons */}
              {!isPaid && !isRequested && (
                <button 
                  onClick={handleRequestBill}
                  disabled={requestingBill}
                  className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 text-center flex items-center justify-center gap-2 text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  {requestingBill ? 'Requesting Bill...' : 'Request Table Bill from Staff'}
                </button>
              )}

              {/* Rate Experience & Finish Buttons */}
              {isPaid && (
                <div className="space-y-2.5">
                  <Link 
                    to="/review" 
                    className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 text-center block text-xs text-decoration-none transition active:scale-95"
                  >
                    ⭐ Rate Your Dining Experience
                  </Link>
                  <button 
                    onClick={handleFinishSession}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-3.5 rounded-2xl text-xs text-center transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Leave Table & Finish Session
                  </button>
                </div>
              )}
            </>
          )}

          <div className="text-center pt-2">
            <Link to={activeTable > 0 ? `/menu?table=${activeTable}` : '/menu'} className="text-slate-500 hover:text-blue-700 font-extrabold text-xs inline-flex items-center gap-1 text-decoration-none">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
