
import React, { useState } from 'react';
import { 
  ShoppingCart, Lock, Unlock, CheckCircle2, AlertCircle, 
  Mic2, Hash, PenTool, Brain, Upload, Disc, Sliders, Wind
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ElementType;
  category: 'core' | 'ai' | 'studio';
}

export const STORE_ITEMS: StoreItem[] = [
  { id: 'feature_tone', name: 'لحن و تناژ (Tone)', description: 'دسترسی به ۱۵ مدل لحن احساسی و تکنیکی برای لیریک.', cost: 50, icon: Mic2, category: 'core' },
  { id: 'feature_keywords', name: 'کلمات کلیدی', description: 'امکان تعیین کلمات خاص برای استفاده در شعر.', cost: 30, icon: Hash, category: 'core' },
  { id: 'feature_rhyme', name: 'تنظیمات پیشرفته قافیه', description: 'کنترل پیچیدگی و الگوی قافیه‌بندی (AABB, ABAB, ...).', cost: 60, icon: Sliders, category: 'core' },
  { id: 'feature_flow', name: 'تنظیمات فلو (Flow)', description: 'مدیریت سرعت، تاکید و تنوع ریتمیک.', cost: 80, icon: Wind, category: 'core' },
  { id: 'feature_structure', name: 'ساختار اختصاصی', description: 'چیدمان دستی ورس‌ها و کورس‌ها.', cost: 100, icon: PenTool, category: 'core' },
  { id: 'feature_ai_advanced', name: 'موتور AI پیشرفته', description: 'دسترسی به تنظیمات دما، خلاقیت و مدل‌های تفکر عمیق.', cost: 150, icon: Brain, category: 'ai' },
  { id: 'feature_beat_upload', name: 'آپلود بیت', description: 'امکان آپلود فایل صوتی بیت برای هماهنگی لیریک.', cost: 120, icon: Upload, category: 'studio' },
  { id: 'feature_sequencer', name: 'درام سکوئنسر', description: 'ساخت پترن‌های درام برای ایده‌پردازی ریتم.', cost: 90, icon: Disc, category: 'studio' },
];

export const PluginStore: React.FC = () => {
  const { user, buyPlugin } = useAuth();
  const { theme } = useTheme();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <div className="text-center text-gray-500 py-20">لطفاً برای دسترسی به فروشگاه وارد شوید.</div>;

  const handleBuy = async (item: StoreItem) => {
    if (user.credits < item.cost) {
      setError(`اعتبار کافی نیست! شما به ${item.cost - user.credits} واحد دیگر نیاز دارید.`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setBuyingId(item.id);
    await new Promise(r => setTimeout(r, 800)); // UX delay
    
    const success = await buyPlugin(item.id, item.cost);
    if (!success) {
        setError('خطا در خرید. مجددا تلاش کنید.');
    }
    setBuyingId(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-6">
        <div>
          <h2 className={`text-3xl font-black flex items-center gap-3 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
            <ShoppingCart className="text-rap-accent" /> فروشگاه افزونه‌ها
          </h2>
          <p className="text-gray-400 mt-2 text-sm">قابلیت‌های استودیو خود را با خرید افزونه‌های تخصصی گسترش دهید.</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border flex flex-col items-end ${theme === 'light' ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}>
            <span className="text-[10px] text-gray-500 font-bold uppercase">اعتبار شما</span>
            <span className={`text-xl font-black ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{user.credits} UNIT</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold animate-pulse">
            <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {STORE_ITEMS.map((item) => {
          const isOwned = user.ownedPlugins.includes(item.id);
          const isBuying = buyingId === item.id;

          return (
            <div 
              key={item.id} 
              className={`relative group border rounded-3xl p-6 flex flex-col transition-all duration-300 ${
                isOwned 
                  ? (theme === 'light' ? 'bg-zinc-50 border-green-500/30' : 'bg-green-500/5 border-green-500/20') 
                  : (theme === 'light' ? 'bg-white border-zinc-200 hover:border-rap-accent hover:shadow-xl' : 'bg-rap-card border-white/5 hover:border-rap-accent/50 hover:shadow-lg hover:shadow-rap-accent/10')
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isOwned 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                  : (theme === 'light' ? 'bg-zinc-100 text-zinc-500 group-hover:bg-rap-accent group-hover:text-white' : 'bg-white/5 text-gray-400 group-hover:bg-rap-accent group-hover:text-white')
              }`}>
                 <item.icon size={28} />
              </div>

              <h3 className={`text-lg font-black mb-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{item.name}</h3>
              <p className={`text-xs leading-relaxed mb-6 flex-grow ${theme === 'light' ? 'text-zinc-500' : 'text-gray-400'}`}>{item.description}</p>

              <div className="mt-auto">
                  {isOwned ? (
                      <div className="w-full py-3 rounded-xl bg-transparent border border-green-500/30 text-green-500 font-bold text-xs flex items-center justify-center gap-2 cursor-default">
                          <CheckCircle2 size={16} /> فعال شده
                      </div>
                  ) : (
                      <button 
                        onClick={() => handleBuy(item)}
                        disabled={isBuying}
                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 transition-all ${
                            user.credits >= item.cost 
                            ? 'bg-rap-accent text-white hover:bg-rap-accentHover shadow-lg shadow-rap-accent/20' 
                            : 'bg-gray-500/10 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isBuying ? <span className="mx-auto">در حال پردازش...</span> : (
                            <>
                                <span>{item.cost} UNIT</span>
                                <span className="flex items-center gap-1"><Lock size={14} /> خرید</span>
                            </>
                        )}
                      </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
