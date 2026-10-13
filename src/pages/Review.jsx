import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { localDB } from '../services/supabase';
import { Star, CheckCircle, Heart } from 'lucide-react';

export const CustomerReview = () => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    localDB.addReview({ rating, comment });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center max-w-md w-full shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Thank You!</h2>
          <p className="text-slate-500 text-xs font-medium leading-relaxed">
            Your valuable feedback helps us refine our gourmet dishes and table dining experience.
          </p>
          <Link 
            to="/menu" 
            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white font-black py-3.5 px-6 rounded-2xl text-xs inline-block text-decoration-none shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            Back to Digital Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-10 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xl space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2 border border-blue-100">
            <Heart className="w-6 h-6 fill-blue-700" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Rate Your Dining Experience</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">How was your food and service today?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center gap-3 py-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button 
                key={s} 
                type="button" 
                onClick={() => setRating(s)} 
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star className={`w-8 h-8 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Your Review / Feedback
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell us what you loved about our food..."
              className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition shadow-2xs"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 text-xs transition active:scale-95"
          >
            Submit Customer Review
          </button>
        </form>
      </div>
    </div>
  );
};
