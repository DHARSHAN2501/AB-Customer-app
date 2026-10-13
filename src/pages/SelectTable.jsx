import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { localDB } from '../services/supabase';
import { Utensils, Users, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const SelectTable = () => {
  const navigate = useNavigate();
  const { tableNumber, setTableNumber } = useCart();
  const [tables] = useState(() => localDB.getTables());
  const [selectedNum, setSelectedNum] = useState(tableNumber);

  const handleConfirmTable = (num) => {
    const tableNum = Number(num);
    if (!tableNum || isNaN(tableNum)) return;
    setTableNumber(tableNum);
    (function(){ try { localStorage.setItem('smart_rest_active_table', tableNum); } catch(e) {} })();
    navigate(`/menu?table=${tableNum}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-10 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
        
        {/* Header Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 p-6 text-white text-center shadow-lg overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
            Welcome to Gourmet Restaurant <Sparkles className="w-5 h-5 text-cyan-300" />
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 font-medium max-w-md mx-auto">
            Please select your seated Table Number to explore our digital menu and order instantly.
          </p>
        </div>

        {/* Selected Table Callout */}
        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider block">Selected Dining Spot</span>
            <span className="text-lg font-black text-slate-900">
              {selectedNum > 0 ? `T - ${String(selectedNum).padStart(2, '0')}` : 'No Table Selected'}
            </span>
          </div>

          <button
            onClick={() => handleConfirmTable(selectedNum)}
            disabled={!selectedNum || selectedNum <= 0}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 text-white font-black py-3 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <span>Proceed to Digital Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Table Selector Grid */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
            Available Restaurant Dining Tables
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tables.map(tbl => {
              const isSelected = tbl.table_number === selectedNum;
              return (
                <button
                  key={tbl.id || tbl.table_number}
                  onClick={() => setSelectedNum(tbl.table_number)}
                  className={`p-4 rounded-2xl border text-center transition-all duration-200 relative flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white border-transparent shadow-xl shadow-blue-500/30 scale-105 font-black ring-4 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 font-bold'
                  }`}
                >
                  <Utensils className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-blue-700'}`} />
                  <span className="text-base font-black">T - {String(tbl.table_number).padStart(2, '0')}</span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    <Users className="w-3 h-3" /> {tbl.capacity || 4} Seats
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-300 absolute top-2 right-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
