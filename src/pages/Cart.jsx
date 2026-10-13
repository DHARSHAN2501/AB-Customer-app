import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { orderService } from '../services/orderService';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Trash2, 
  CheckCircle, 
  Plus, 
  Minus, 
  User, 
  MessageSquare, 
  Table as TableIcon, 
  X,
  Truck,
  MapPin,
  Phone,
  AlertTriangle,
  Building,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CustomerCart = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, subtotal, tax, total } = useCart();
  
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [orderType, setOrderType] = useState('DINE_IN'); // 'DINE_IN' | 'HOME_DELIVERY'
  const [customerName, setCustomerName] = useState('');
  const [inputTableNum, setInputTableNum] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleOpenOrderModal = () => {
    if (cartItems.length === 0) return;
    setValidationError('');
    setIsOrderModalOpen(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (loading) return;
    setValidationError('');

    if (orderType === 'DINE_IN') {
      const tableNum = Number(inputTableNum);
      if (!tableNum || isNaN(tableNum) || tableNum <= 0) {
        setValidationError('Please enter a valid dining table number (e.g. 1, 2, 5).');
        return;
      }
    } else if (orderType === 'HOME_DELIVERY') {
      if (totalCount <= 25) {
        setValidationError('Home Delivery is available ONLY for bulk orders of more than 25 items.');
        return;
      }
      if (!customerName.trim()) {
        setValidationError('Please enter your full name for Home Delivery.');
        return;
      }
      if (!phoneNumber.trim()) {
        setValidationError('Please enter a valid Singapore phone number (e.g. +65 9123 4567).');
        return;
      }
      if (!deliveryAddress.trim()) {
        setValidationError('Please enter your Singapore delivery street/unit address.');
        return;
      }
      if (!postalCode.trim() || postalCode.trim().length < 5) {
        setValidationError('Please enter a valid 6-digit Singapore Postal Code (e.g. 520123).');
        return;
      }
    }

    setLoading(true);

    const payload = {
      order_type: orderType,
      table_number: orderType === 'DINE_IN' ? Number(inputTableNum) : 0,
      customer_name: customerName.trim() || (orderType === 'DINE_IN' ? `Table ${inputTableNum} Guest` : 'SG Home Customer'),
      phone_number: orderType === 'HOME_DELIVERY' ? phoneNumber.trim() : '',
      delivery_address: orderType === 'HOME_DELIVERY' ? deliveryAddress.trim() : '',
      postal_code: orderType === 'HOME_DELIVERY' ? postalCode.trim() : '',
      subtotal,
      tax,
      total_amount: total,
      notes: notes.trim(),
      items: cartItems.map(ci => ({
        menu_item_id: ci.menuItem.id,
        item_name: ci.menuItem.name,
        quantity: ci.quantity,
        price: ci.menuItem.price,
        special_instruction: ci.special_instruction || ''
      }))
    };

    try {
      const newOrder = await orderService.createOrder(payload);
      try {
        if (newOrder?.id) {
          orderService.registerDeviceOrder([newOrder.id, newOrder.order_number]);
          localStorage.setItem('smart_rest_active_order', newOrder.id);
          localStorage.setItem('smart_rest_active_order_id', newOrder.id);
          if (newOrder.order_number) localStorage.setItem('smart_rest_active_order_number', newOrder.order_number);
          localStorage.setItem('smart_rest_active_table', String(payload.table_number || 0));
          if (payload.table_number > 0) {
            localStorage.setItem(`smart_rest_active_order_t${payload.table_number}`, newOrder.id);
          }
        }
      } catch(e) {}
      try { confetti({ particleCount: 70, spread: 60 }); } catch (e) {}
      clearCart();
      setLoading(false);
      setIsOrderModalOpen(false);
      navigate(`/order-tracking/${newOrder.id}`);
    } catch (err) {
      setLoading(false);
      setValidationError('Failed to place order. Please try again.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center max-w-md w-full shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Your Cart is Empty</h2>
          <p className="text-slate-500 text-xs mt-1 mb-6 font-medium">Select delicious food items from our digital menu to place your order.</p>
          <Link 
            to="/menu" 
            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white font-black py-3.5 px-6 rounded-2xl text-xs inline-flex items-center gap-2 shadow-md shadow-blue-500/20 text-decoration-none transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Browse Food Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link 
          to="/menu" 
          className="inline-flex items-center gap-1.5 text-slate-700 font-extrabold text-xs bg-white border border-slate-200/90 px-4 py-2 rounded-2xl shadow-2xs hover:bg-slate-50 text-decoration-none transition"
        >
          <ArrowLeft className="w-4 h-4 text-blue-700" /> Add More Items
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Food Order Cart</h1>
        <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
          {totalCount} {totalCount === 1 ? 'Item Total' : 'Items Total'} ({cartItems.length} unique)
        </span>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3.5">
        {cartItems.map(ci => (
          <div key={ci.menuItem.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 transition hover:border-blue-200">
            {/* Dish Title & Price details */}
            <div className="flex-1 min-w-[140px]">
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug tracking-tight">{ci.menuItem.name}</h3>
              <span className="text-xs text-slate-400 font-bold block mt-0.5">₹{ci.menuItem.price} each</span>
              {ci.special_instruction && (
                <div className="text-[11px] text-blue-700 font-semibold italic mt-1 bg-blue-50/80 px-2 py-0.5 rounded-lg inline-block border border-blue-100">
                  "{ci.special_instruction}"
                </div>
              )}
            </div>

            {/* Stepper, Total & Remove Action */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Stepper Pill */}
              <div className="flex items-center bg-slate-100/80 border border-slate-200/90 rounded-2xl p-1 gap-1.5 shadow-2xs">
                <button 
                  onClick={() => updateQuantity(ci.menuItem.id, ci.quantity - 1)} 
                  className="w-7 h-7 rounded-xl bg-white text-slate-700 font-black border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 hover:text-blue-700 transition shadow-2xs"
                  title="Decrease Quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="font-black text-slate-900 text-xs px-2 min-w-[20px] text-center">{ci.quantity}</span>
                <button 
                  onClick={() => updateQuantity(ci.menuItem.id, ci.quantity + 1)} 
                  className="w-7 h-7 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white font-black flex items-center justify-center shadow-xs hover:from-blue-800 hover:to-indigo-800 transition"
                  title="Increase Quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Total Item Price */}
              <span className="font-black text-slate-900 text-sm sm:text-base min-w-[64px] text-right">
                ₹{(ci.menuItem.price * ci.quantity).toFixed(2)}
              </span>
              
              {/* Delete Button */}
              <button 
                onClick={() => removeFromCart(ci.menuItem.id)} 
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                title="Remove Item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Notes */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-700" /> Kitchen / Order Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Extra chutney, less spicy..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Order Summary Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3 text-xs">
        <div className="flex justify-between text-slate-600 font-medium"><span>Subtotal</span><span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-slate-600 font-medium"><span>GST (5%)</span><span className="font-bold text-slate-900">₹{tax.toFixed(2)}</span></div>
        
        <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
          <span>Total Payable Amount</span>
          <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">₹{total.toFixed(2)}</span>
        </div>

        <button 
          onClick={handleOpenOrderModal} 
          className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/25 text-sm flex items-center justify-center gap-2 transition active:scale-95 mt-4"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Confirm & Proceed to Order</span>
        </button>
      </div>

      {/* Order Fulfillment Modal (Dine-In Table Delivery vs Singapore Home Delivery) */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border shadow-2xl space-y-5 relative my-8">
            <button
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-slate-900">Select Order Fulfillment</h2>
              <p className="text-slate-500 text-xs font-medium">Choose how you would like to receive your food order.</p>
            </div>

            {/* Order Type Toggle Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setOrderType('DINE_IN');
                  setValidationError('');
                }}
                className={`py-3 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition ${
                  orderType === 'DINE_IN'
                    ? 'bg-white text-blue-700 shadow-md border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-4 h-4 text-blue-700" />
                <span>Table Delivery (Dine-In)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('HOME_DELIVERY');
                  setValidationError('');
                }}
                className={`py-3 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition ${
                  orderType === 'HOME_DELIVERY'
                    ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Home Delivery</span>
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              
              {/* TAB 1: DINE-IN TABLE DELIVERY */}
              {orderType === 'DINE_IN' && (
                <div className="space-y-4">
                  <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200/70 text-xs text-blue-900 font-medium">
                    🍽️ <strong>Dine-In Table Delivery:</strong> Please enter the table number shown on your dining table.
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">
                      Table Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="99"
                      placeholder="e.g. 5"
                      value={inputTableNum}
                      onChange={e => {
                        setInputTableNum(e.target.value);
                        setValidationError('');
                      }}
                      className="w-full border border-slate-200/90 rounded-2xl p-3.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-700" /> Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name..."
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full border border-slate-200/90 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: HOME DELIVERY (SINGAPORE) */}
              {orderType === 'HOME_DELIVERY' && (
                <div className="space-y-4">
                  {/* Total Item Count Validation Alert */}
                  {totalCount <= 25 ? (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-amber-900 space-y-3">
                      <div className="flex items-center gap-2 font-black text-sm text-amber-800">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Bulk Order Requirement Notice</span>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed">
                        Direct restaurant Home Delivery is available <strong>ONLY for bulk orders of more than 25 items</strong>.
                      </p>
                      <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs font-bold text-amber-950">
                        Current Cart Quantity: <span className="text-rose-600 font-black">{totalCount} item(s)</span>.
                        <br />
                        Please add <span className="text-blue-700 font-black">{26 - totalCount} more item(s)</span> to qualify for Home Delivery or choose Table Delivery.
                      </div>

                      {/* Partner Delivery Recommendation */}
                      <div className="pt-2 border-t border-amber-200/80 space-y-2">
                        <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                          <span>💡 Looking for single meals or small orders? Find us on our delivery partners:</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href="https://www.foodpanda.sg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-pink-50 border border-pink-200 hover:border-pink-300 text-pink-700 rounded-xl p-2.5 text-center text-xs font-black transition flex flex-col items-center justify-center gap-1 shadow-xs text-decoration-none group"
                          >
                            <span className="text-base">🐼</span>
                            <span className="text-[11px] font-black group-hover:underline flex items-center gap-0.5">
                              Foodpanda <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </span>
                          </a>

                          <a
                            href="https://food.grab.com/sg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 text-emerald-800 rounded-xl p-2.5 text-center text-xs font-black transition flex flex-col items-center justify-center gap-1 shadow-xs text-decoration-none group"
                          >
                            <span className="text-base">🛵</span>
                            <span className="text-[11px] font-black group-hover:underline flex items-center gap-0.5">
                              GrabFood <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </span>
                          </a>

                          <a
                            href="https://deliveroo.com.sg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-cyan-50 border border-cyan-200 hover:border-cyan-300 text-cyan-800 rounded-xl p-2.5 text-center text-xs font-black transition flex flex-col items-center justify-center gap-1 shadow-xs text-decoration-none group"
                          >
                            <span className="text-base">🦘</span>
                            <span className="text-[11px] font-black group-hover:underline flex items-center gap-0.5">
                              Deliveroo <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl text-xs text-emerald-900 font-medium">
                      🚚 <strong>Bulk Order Approved!</strong> ({totalCount} items in cart). Please fill in your Singapore delivery address.
                    </div>
                  )}

                  {totalCount > 25 && (
                    <>
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-700" /> Full Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tan Ah Kow"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-700" /> Singapore Mobile Phone Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +65 9123 4567"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-700" /> Street / Block & Unit Address <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="e.g. Blk 123 Orchard Road #08-45"
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-blue-700" /> Singapore Postal Code (6 Digits) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 520123"
                          value={postalCode}
                          onChange={e => setPostalCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Validation Error Message */}
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl">
                  {validationError}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || (orderType === 'HOME_DELIVERY' && totalCount <= 25)}
                  className={`flex-1 font-black py-3.5 rounded-2xl text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 ${
                    orderType === 'HOME_DELIVERY' && totalCount <= 25
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-blue-500/25'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{loading ? 'Submitting...' : 'Submit Order'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerCart;
