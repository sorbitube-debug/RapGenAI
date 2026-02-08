
import React, { useState } from 'react';
import { X, Coins, Plus, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({ isOpen, onClose }) => {
  const { user, updateCredits } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount);

    // Validation: amountToAdd must be a positive integer
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatus({ 
        type: 'error', 
        message: 'مقدار نامعتبر! لطفاً یک عدد صحیح مثبت وارد کنید.' 
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    // Simulate API logic as per user request
    await new Promise(r => setTimeout(r, 600));

    const creditsBefore = user.credits;
    const creditsAfter = user.credits + amountNum;

    updateCredits(amountNum);
    
    setStatus({ 
      type: 'success', 
      message: `تراکنش موفق! ${amountNum} واحد اضافه شد. (${creditsBefore} ➔ ${creditsAfter})`
    });
    
    setIsSubmitting(false);
    setAmount('');
    
    // Auto close on success after a short delay
    setTimeout(() => {
      onClose();
      setStatus({ type: 'idle', message: '' });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="w-full max-w-sm bg-rap-card border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
               <Coins size={28} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white">شارژ استودیو</h2>
            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-widest font-black">Credit Management System</p>
          </div>

          <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/5 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400">موجودی فعلی:</span>
            <span className="text-sm font-black text-white">{user.credits} UNIT</span>
          </div>

          {status.type !== 'idle' && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn ${
              status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="relative group">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-rap-accent transition-colors">
                <Plus size={18} />
              </div>
              <input 
                required 
                type="number" 
                placeholder="مقدار شارژ (مثلاً ۵۰)" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full bg-black/20 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:border-rap-accent outline-none text-white transition-all font-black"
                disabled={isSubmitting || status.type === 'success'}
              />
            </div>

            <button 
              disabled={isSubmitting || status.type === 'success'} 
              className="w-full bg-rap-accent hover:bg-rap-accent/90 py-4.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-rap-accent/20 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={18} fill="currentColor" />}
              تایید و افزایش اعتبار
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">هر بار تولید لیریک ۱۰ واحد هزینه دارد</p>
          </div>
        </div>
      </div>
    </div>
  );
};
