import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Plus, Minus, ShoppingBag, MessageSquare } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const FoodDetailsModal = ({ item, isOpen, onClose }) => {
  if (!item) return null;

  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [instruction, setInstruction] = useState('');

  const handleAdd = () => {
    addToCart(item, quantity, instruction);
    onClose();
  };



  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="-m-6 overflow-hidden bg-white rounded-3xl">
        <div className="relative h-56 w-full bg-slate-900">
          <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          


          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">{item.name}</h2>
              <span className="text-2xl font-black bg-gradient-to-r from-cyan-300 to-amber-300 bg-clip-text text-transparent">₹{item.price}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Quantity</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 p-1.5 rounded-2xl w-fit">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 font-black text-slate-700 flex items-center justify-center hover:bg-slate-100 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-black text-slate-900 text-sm px-3">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)} 
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-black flex items-center justify-center shadow-xs transition hover:from-blue-800 hover:to-indigo-900"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-700" /> Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Less spicy, Extra cheese, No onions"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition shadow-xs"
            />
          </div>

          <button 
            onClick={handleAdd} 
            className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-900 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" /> Add to Cart • ₹{item.price * quantity}
          </button>
        </div>
      </div>
    </Modal>
  );
};
