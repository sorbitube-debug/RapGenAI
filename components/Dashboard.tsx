
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Coins, FolderOpen, Calendar, Trash2, Edit2, 
  LogOut, CreditCard, CheckCircle2, Star, Zap, 
  LayoutGrid, ListMusic, Clock, ChevronLeft, ExternalLink, Palette, Monitor,
  Cpu, Server, Key, Save, AlertCircle, Wifi, WifiOff, Loader2, Info, Search, Filter, X, BarChart3, History, ShoppingCart,
  Crown, Mic2, Music2, TrendingUp, Sparkles, Trophy
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeType } from '../context/ThemeContext';
import { cloudStorage } from '../services/cloudStorage';
import { CloudProject, RapStyle, AIConfig, AIProvider } from '../types';
import { PluginStore } from './PluginStore';

interface DashboardProps {
  initialTab?: 'profile' | 'ai-engine' | 'projects' | 'credits' | 'settings' | 'store';
  onNavigateHome: () => void;
  onLoadProject: (project: CloudProject) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'profile', onNavigateHome, onLoadProject }) => {
  const { user, logout, updateCredits, updateProfile } = useAuth();
  const { theme, setTheme, setPreviewTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai-engine' | 'projects' | 'credits' | 'settings' | 'store'>(initialTab);
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Projects Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStyle, setFilterStyle] = useState<string>('all');

  // AI Config State
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'gemini', apiKey: '', baseUrl: '', modelName: '' });
  const [saveStatus, setSaveStatus] = useState<string>('');
  
  // Connection Test State
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    // Load AI Config
    const stored = localStorage.getItem('rapgen_ai_config');
    if (stored) {
        try { setAiConfig(JSON.parse(stored)); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Always load projects to calculate stats even if not on projects tab
      setLoadingProjects(true);
      setTimeout(() => {
        setProjects(cloudStorage.getProjects(user.id).sort((a, b) => b.lastModified - a.lastModified));
        setLoadingProjects(false);
      }, 300);
      
      // Initialize edit state
      setEditName(user.name);
      setEditAvatar(user.avatar || '');
    }
  }, [user]);

  const saveAiConfig = () => {
      localStorage.setItem('rapgen_ai_config', JSON.stringify(aiConfig));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('در حال برقراری ارتباط با سرور...');

    try {
      if (aiConfig.provider === 'openai_compatible') {
        let baseUrl = aiConfig.baseUrl?.trim() || "https://api.openai.com/v1";
        // Sanitize URL
        baseUrl = baseUrl.replace(/\/+$/, '');
        if (baseUrl.endsWith('/chat/completions')) {
            baseUrl = baseUrl.substring(0, baseUrl.length - '/chat/completions'.length);
        }

        const apiKey = aiConfig.apiKey || "";
        const modelName = aiConfig.modelName || "gpt-3.5-turbo";

        // Simple ping to chat completions
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: "user", content: "Hi. Reply with 'OK'." }
                ],
                max_tokens: 5
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`خطای ${response.status}: ${errText.slice(0, 100)}`);
        }
        
        const data = await response.json();
        if (!data.choices || !data.choices.length) {
           throw new Error("پاسخ نامعتبر از سرور (ساختار JSON صحیح نیست).");
        }

        setTestStatus('success');
        setTestMessage(`اتصال برقرار شد! مدل: ${modelName}`);

      } else {
        // Gemini Test
        const apiKey = aiConfig.apiKey || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        await ai.models.generateContent({
           model: 'gemini-3-flash-preview',
           contents: 'Ping',
        });

        setTestStatus('success');
        setTestMessage('اتصال به Google Gemini برقرار است.');
      }
    } catch (err: any) {
      console.error(err);
      setTestStatus('error');
      setTestMessage(err.message || "خطا در برقراری ارتباط.");
    }
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('آیا از حذف این پروژه اطمینان دارید؟')) {
      cloudStorage.deleteProject(id);
      if (user) {
        setProjects(cloudStorage.getProjects(user.id).sort((a, b) => b.lastModified - a.lastModified));
      }
    }
  };

  const handleSaveProfile = async () => {
      await updateProfile(editName, editAvatar);
      setIsEditingProfile(false);
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
      return projects.filter(p => {
          const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStyle = filterStyle === 'all' || p.style === filterStyle;
          return matchesSearch && matchesStyle;
      });
  }, [projects, searchQuery, filterStyle]);

  // Profile Analytics
  const userRank = useMemo(() => {
      const count = projects.length;
      if (count > 50) return { title: 'Rap God', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
      if (count > 20) return { title: 'Superstar', icon: Star, color: 'text-purple-400', bg: 'bg-purple-400/10' };
      if (count > 5) return { title: 'Underground', icon: Mic2, color: 'text-rap-accent', bg: 'bg-rap-accent/10' };
      return { title: 'Rookie', icon: User, color: 'text-gray-400', bg: 'bg-gray-500/10' };
  }, [projects.length]);

  const favoriteStyle = useMemo(() => {
      if (!projects.length) return { name: '---', count: 0 };
      const counts: Record<string, number> = {};
      projects.forEach(p => { counts[p.style] = (counts[p.style] || 0) + 1; });
      const topStyle = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      return { name: topStyle, count: counts[topStyle] };
  }, [projects]);

  const activityLogs = useMemo(() => {
      return projects.slice(0, 5).map(p => ({
          type: 'project',
          desc: `ساخت پروژه: ${p.title}`,
          date: new Date(p.lastModified).toLocaleDateString('fa-IR'),
          style: p.style
      }));
  }, [projects]);

  const THEMES: { id: ThemeType, name: string, description: string, colors: string[] }[] = [
    { id: 'dark', name: 'استودیو تاریک', description: 'حالت پیش‌فرض برای تمرکز بالا در شب.', colors: ['#0f0f13', '#ff0055'] },
    { id: 'light', name: 'استودیو روشن', description: 'تم تمیز و با کنتراست بالا برای محیط‌های روشن.', colors: ['#ffffff', '#ff0055'] },
    { id: 'neon', name: 'نئون پالس', description: 'فضایی مدرن با رنگ‌های درخشان و پویا.', colors: ['#05000a', '#06b6d4'] },
    { id: 'classic', name: 'اولد اسکول', description: 'حس نوستالژیک هیپ هاپ کلاسیک با فیلتر سپیا.', colors: ['#1a1815', '#fbbf24'] },
  ];

  const CREDIT_PACKAGES = [
    { amount: 50, price: '۵۰,۰۰۰ تومان', label: 'Starter', color: 'from-blue-500 to-cyan-500', popular: false },
    { amount: 150, price: '۱۲۰,۰۰۰ تومان', label: 'Artist', color: 'from-purple-500 to-pink-500', popular: true },
    { amount: 500, price: '۳۵۰,۰۰۰ تومان', label: 'Studio', color: 'from-orange-500 to-red-500', popular: false },
  ];

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 animate-fadeIn text-right" dir="rtl">
      
      {/* Header / Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
        <button onClick={onNavigateHome} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors self-start md:self-auto">
          <ChevronLeft size={20} /> بازگشت به استودیو
        </button>
        
        <div className={`flex border p-1.5 rounded-2xl ${theme === 'light' ? 'bg-zinc-200 border-zinc-300' : 'bg-rap-card border-white/10'} overflow-x-auto max-w-full`}>
           {[
             { id: 'profile', icon: User, label: 'پروفایل' },
             { id: 'store', icon: ShoppingCart, label: 'فروشگاه' },
             { id: 'ai-engine', icon: Cpu, label: 'موتور AI' },
             { id: 'projects', icon: FolderOpen, label: 'پروژه‌ها' },
             { id: 'settings', icon: Palette, label: 'ظاهر' },
             { id: 'credits', icon: Coins, label: 'اعتبار' }
           ].map(t => (
             <button 
               key={t.id}
               onClick={() => setActiveTab(t.id as any)}
               className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
             >
               <t.icon size={16} /> <span className="hidden sm:inline">{t.label}</span>
             </button>
           ))}
        </div>
      </div>

      {/* Content Area */}
      <div className={`border rounded-[40px] p-6 md:p-10 shadow-2xl min-h-[500px] ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
        
        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="animate-fadeIn">
             {!isEditingProfile ? (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: User Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className={`relative overflow-hidden rounded-[32px] p-8 text-center border ${theme === 'light' ? 'bg-gradient-to-b from-zinc-50 to-white border-zinc-200' : 'bg-gradient-to-b from-white/5 to-transparent border-white/10'}`}>
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rap-accent/20 to-purple-600/20 opacity-50" />
                            
                            <div className="relative z-10">
                                <div className="w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-rap-accent to-purple-600 shadow-xl shadow-rap-accent/30 mb-4">
                                    <div className="w-full h-full rounded-full bg-black overflow-hidden">
                                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-gray-500" />}
                                    </div>
                                </div>
                                
                                <h2 className={`text-2xl font-black mb-1 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{user.name}</h2>
                                <p className="text-gray-500 text-xs font-mono mb-4">{user.email}</p>
                                
                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6 ${userRank.bg} ${userRank.color} border border-current/20`}>
                                    <userRank.icon size={14} /> {userRank.title}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIsEditingProfile(true)} className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                                        <Edit2 size={14} /> ویرایش
                                    </button>
                                    <button onClick={logout} className="py-2.5 rounded-xl text-xs font-bold transition-all border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2">
                                        <LogOut size={14} /> خروج
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={`p-6 rounded-[32px] border ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                            <h4 className="text-xs font-bold text-gray-500 mb-4 flex items-center gap-2"><Trophy size={14} className="text-yellow-500" /> دستاوردهای استودیو</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${theme === 'light' ? 'text-zinc-700' : 'text-gray-300'}`}>پروژه‌های تکمیل شده</span>
                                    <span className="text-xs font-black font-mono">{projects.length} / 100</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" style={{ width: `${Math.min(100, projects.length)}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">با افزایش تعداد پروژه‌ها، رنک شما ارتقا پیدا می‌کند و قابلیت‌های جدید باز می‌شود.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Stats & Activity */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className={`p-5 rounded-3xl border flex flex-col justify-between h-32 relative overflow-hidden group ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
                                <div className="absolute right-0 top-0 p-20 bg-rap-accent/5 rounded-full -mr-10 -mt-10 group-hover:bg-rap-accent/10 transition-colors" />
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Coins size={12} /> اعتبار</span>
                                    <div className={`text-3xl font-black mt-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{user.credits}</div>
                                </div>
                                <button onClick={() => setActiveTab('credits')} className="relative z-10 text-[10px] font-bold text-rap-accent flex items-center gap-1 group-hover:gap-2 transition-all">افزایش موجودی <ChevronLeft size={10} /></button>
                            </div>

                            <div className={`p-5 rounded-3xl border flex flex-col justify-between h-32 relative overflow-hidden group ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
                                <div className="absolute right-0 top-0 p-20 bg-purple-500/5 rounded-full -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors" />
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Music2 size={12} /> سبک محبوب</span>
                                    <div className={`text-lg font-black mt-3 truncate ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{favoriteStyle.name}</div>
                                </div>
                                <div className="relative z-10 text-[10px] font-bold text-purple-400">{favoriteStyle.count} پروژه</div>
                            </div>

                            <div className={`p-5 rounded-3xl border flex flex-col justify-between h-32 relative overflow-hidden group ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
                                <div className="absolute right-0 top-0 p-20 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><TrendingUp size={12} /> وضعیت</span>
                                    <div className={`text-xl font-black mt-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>Active</div>
                                </div>
                                <div className="relative z-10 text-[10px] font-bold text-blue-400">آخرین بازدید: امروز</div>
                            </div>
                        </div>

                        {/* Activity Feed */}
                        <div className={`rounded-[32px] border overflow-hidden ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                            <div className={`p-6 border-b flex justify-between items-center ${theme === 'light' ? 'border-zinc-200' : 'border-white/5'}`}>
                                <h3 className={`font-black text-sm flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><History size={16} className="text-gray-400" /> تاریخچه فعالیت‌ها</h3>
                                <button onClick={() => setActiveTab('projects')} className="text-[10px] font-bold text-rap-accent hover:underline">مشاهده همه پروژه‌ها</button>
                            </div>
                            
                            <div className="p-4">
                                {activityLogs.length > 0 ? (
                                    <div className="space-y-1">
                                        {activityLogs.map((log, i) => (
                                            <div key={i} className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${theme === 'light' ? 'hover:bg-white' : 'hover:bg-white/5'}`}>
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rap-accent to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rap-accent/20">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs font-bold truncate ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{log.desc}</div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">{log.style}</div>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono shrink-0 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
                                                    {log.date}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                                            <History size={20} />
                                        </div>
                                        <p className="text-xs text-gray-500">هنوز هیچ فعالیتی ثبت نشده است.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
             ) : (
                 <div className="animate-fadeIn max-w-xl mx-auto">
                     <div className="flex justify-between items-center mb-8">
                         <h3 className={`text-xl font-black ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>ویرایش پروفایل</h3>
                         <button onClick={() => setIsEditingProfile(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-500"><X size={20} /></button>
                     </div>
                     
                     <div className={`p-8 rounded-[32px] border space-y-8 ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/5'}`}>
                         <div className="flex flex-col items-center gap-4">
                             <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-rap-accent relative group shadow-2xl">
                                 {editAvatar ? <img src={editAvatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 bg-white/5 text-gray-500" />}
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                     <Edit2 className="text-white" size={24} />
                                 </div>
                             </div>
                             <div className="w-full">
                                 <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase tracking-wider">لینک آواتار (URL)</label>
                                 <input 
                                    type="text" 
                                    value={editAvatar} 
                                    onChange={(e) => setEditAvatar(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                    className={`w-full border rounded-2xl px-4 py-3.5 text-sm outline-none dir-ltr text-left transition-all focus:border-rap-accent ${theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/10 text-white'}`}
                                 />
                             </div>
                         </div>

                         <div className="space-y-2">
                             <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase tracking-wider">نام نمایشی</label>
                             <input 
                                type="text" 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)}
                                className={`w-full border rounded-2xl px-4 py-3.5 text-sm outline-none transition-all focus:border-rap-accent ${theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/10 text-white'}`}
                             />
                         </div>

                         <div className="flex gap-4 pt-4">
                             <button onClick={() => setIsEditingProfile(false)} className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${theme === 'light' ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-white/5 text-white hover:bg-white/10'}`}>انصراف</button>
                             <button onClick={handleSaveProfile} className="flex-1 py-4 rounded-2xl font-bold text-sm bg-rap-accent text-white hover:bg-rap-accentHover shadow-lg shadow-rap-accent/20">ذخیره تغییرات</button>
                         </div>
                     </div>
                 </div>
             )}
          </div>
        )}

        {/* --- STORE TAB --- */}
        {activeTab === 'store' && (
            <PluginStore />
        )}

        {/* --- AI ENGINE TAB --- */}
        {activeTab === 'ai-engine' && (
          <div className="animate-fadeIn space-y-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-black flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><Cpu className="text-cyan-400" /> پیکربندی هسته هوشمند</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">Neural Engine Configuration</span>
            </div>

            <div className={`p-6 md:p-8 rounded-3xl border ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
                <div className="grid grid-cols-1 gap-8 mb-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Server size={14} /> سرویس‌دهنده هوش مصنوعی</label>
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => { setAiConfig({ ...aiConfig, provider: 'gemini' }); setTestStatus('idle'); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${aiConfig.provider === 'gemini' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Google Gemini (بومی)
                            </button>
                            <button 
                                onClick={() => { setAiConfig({ ...aiConfig, provider: 'openai_compatible' }); setTestStatus('idle'); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${aiConfig.provider === 'openai_compatible' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                OpenAI / Custom API
                            </button>
                        </div>
                    </div>

                    {aiConfig.provider === 'openai_compatible' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideUp">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base URL</label>
                                <input 
                                    type="text" 
                                    placeholder="https://api.openai.com/v1" 
                                    value={aiConfig.baseUrl || ''}
                                    onChange={(e) => { setAiConfig({ ...aiConfig, baseUrl: e.target.value }); setTestStatus('idle'); }}
                                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-cyan-400 outline-none transition-all dir-ltr text-left font-mono ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/40 border-white/10 text-white'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Model Name</label>
                                <input 
                                    type="text" 
                                    placeholder="gpt-4o" 
                                    value={aiConfig.modelName || ''}
                                    onChange={(e) => { setAiConfig({ ...aiConfig, modelName: e.target.value }); setTestStatus('idle'); }}
                                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-cyan-400 outline-none transition-all dir-ltr text-left font-mono ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/40 border-white/10 text-white'}`}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-start gap-4 animate-slideUp">
                            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400"><Info size={20} /></div>
                            <div className="text-xs text-cyan-300/80 leading-relaxed">
                                سیستم به صورت هوشمند از آخرین مدل‌های <span className="text-white font-bold">Gemini 3 Flash & Pro</span> استفاده می‌کند. این سرویس به صورت پیش‌فرض فعال است و نیازی به پیکربندی دستی ندارد مگر اینکه بخواهید از کلید API شخصی خود استفاده کنید.
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Key size={14} /> API Key (کلید دسترسی)</label>
                        <input 
                            type="password" 
                            placeholder="••••••••••••••••••••••••••••" 
                            value={aiConfig.apiKey || ''}
                            onChange={(e) => { setAiConfig({ ...aiConfig, apiKey: e.target.value }); setTestStatus('idle'); }}
                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-cyan-400 outline-none transition-all dir-ltr text-left font-mono ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/40 border-white/10 text-white'}`}
                        />
                    </div>
                </div>
                
                {testStatus !== 'idle' && (
                  <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold animate-fadeIn ${
                    testStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                    testStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                    'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  }`}>
                     {testStatus === 'testing' && <Loader2 size={18} className="animate-spin" />}
                     {testStatus === 'success' && <Wifi size={18} />}
                     {testStatus === 'error' && <WifiOff size={18} />}
                     <span>{testMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/5">
                    <button 
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing'}
                        className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${theme === 'light' ? 'border-zinc-300 hover:bg-zinc-100 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-gray-300'}`}
                    >
                        <Wifi size={16} /> تست اتصال زنده
                    </button>
                    <button 
                        onClick={saveAiConfig}
                        className={`px-8 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${saveStatus === 'success' ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/20'}`}
                    >
                        {saveStatus === 'success' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {saveStatus === 'success' ? 'پیکربندی ذخیره شد' : 'ذخیره و اعمال تغییرات'}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB (VISUAL) --- */}
        {activeTab === 'settings' && (
          <div className="animate-fadeIn space-y-10">
            <div className="flex items-center justify-between mb-8">
                <h3 className={`text-xl font-black flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><Palette className="text-rap-accent" /> سفارشی‌سازی ظاهر استودیو</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">Studio Appearance Settings</span>
            </div>

            <div className="p-6 bg-rap-accent/5 border border-rap-accent/10 rounded-3xl flex items-start gap-5">
                <div className="p-3 bg-rap-accent/10 rounded-2xl text-rap-accent"><Monitor size={24} /></div>
                <div>
                    <h4 className="text-sm font-black text-rap-accent mb-1">تغییر زنده تم (Real-time Preview)</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xl">شما می‌توانید با نگه داشتن موس روی هر تم، پیش‌نمایش آن را در کل اپلیکیشن مشاهده کنید. برای تغییر دائمی، تم مورد نظر را انتخاب کنید.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {THEMES.map((t) => (
                    <button 
                        key={t.id}
                        onMouseEnter={() => setPreviewTheme(t.id)}
                        onMouseLeave={() => setPreviewTheme(null)}
                        onClick={() => setTheme(t.id)}
                        className={`group p-6 rounded-[28px] border-2 transition-all text-right relative overflow-hidden flex flex-col items-start ${
                            theme === t.id 
                            ? 'bg-rap-accent/10 border-rap-accent shadow-xl shadow-rap-accent/10 scale-[1.02]' 
                            : (theme === 'light' ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300' : 'bg-black/20 border-white/10 hover:border-white/30')
                        }`}
                    >
                        <div className="flex justify-between items-center w-full mb-5">
                            <div className="flex gap-1.5">
                                {t.colors.map((c, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white/10 shadow-sm" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                            {theme === t.id && <div className="p-1 bg-rap-accent text-white rounded-full"><CheckCircle2 size={16} /></div>}
                        </div>
                        
                        <h4 className={`text-lg font-black mb-1 transition-colors ${theme === t.id ? 'text-rap-accent' : (theme === 'light' ? 'text-zinc-900' : 'text-white')}`}>{t.name}</h4>
                        <p className={`text-xs leading-relaxed opacity-70 ${theme === 'light' ? 'text-zinc-600' : 'text-gray-400'}`}>{t.description}</p>
                        
                        <div className="mt-5 flex items-center gap-2">
                            <div className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${theme === t.id ? 'bg-rap-accent text-white' : 'bg-white/10 text-gray-500'}`}>
                                {t.id === 'dark' ? 'Pro Dark' : t.id === 'light' ? 'Light Lab' : t.id === 'neon' ? 'Neon Pulse' : 'Vintage Vibe'}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className={`mt-12 pt-8 border-t text-center ${theme === 'light' ? 'border-zinc-100' : 'border-white/5'}`}>
                <p className="text-xs text-gray-500 font-medium">پیکربندی ظاهر شما به صورت خودکار در حافظه محلی مرورگر همگام‌سازی می‌شود.</p>
            </div>
          </div>
        )}

        {/* --- PROJECTS TAB --- */}
        {activeTab === 'projects' && (
          <div className="animate-fadeIn">
             <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <h3 className={`text-xl font-black flex items-center gap-2 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}><LayoutGrid className="text-rap-accent" /> آرشیو پروژه‌ها</h3>
                    <span className="text-xs font-bold text-gray-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{filteredProjects.length} پروژه</span>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-1 md:w-64 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/10'}`}>
                        <Search size={16} className="text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="جستجو در پروژه‌ها..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-xs font-bold w-full text-right"
                        />
                    </div>
                    <div className="relative group">
                        <button className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-black/20 border-white/10 text-gray-300'}`}>
                            <Filter size={16} /> 
                            <span className="hidden sm:inline">فیلتر: {filterStyle === 'all' ? 'همه' : filterStyle}</span>
                        </button>
                        <div className={`absolute left-0 top-full mt-2 w-40 rounded-xl border shadow-xl overflow-hidden z-20 hidden group-hover:block ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-rap-card border-white/10'}`}>
                            <button onClick={() => setFilterStyle('all')} className={`w-full text-right px-4 py-2 text-xs font-bold hover:bg-rap-accent/10 hover:text-rap-accent ${filterStyle === 'all' ? 'text-rap-accent' : 'text-gray-500'}`}>همه سبک‌ها</button>
                            {Object.values(RapStyle).map(s => (
                                <button key={s} onClick={() => setFilterStyle(s)} className={`w-full text-right px-4 py-2 text-xs font-bold hover:bg-rap-accent/10 hover:text-rap-accent ${filterStyle === s ? 'text-rap-accent' : 'text-gray-500'}`}>{s}</button>
                            ))}
                        </div>
                    </div>
                </div>
             </div>

             {loadingProjects ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-4">
                   <div className="w-10 h-10 border-4 border-rap-accent border-t-transparent rounded-full animate-spin" />
                   <p className="text-xs font-black uppercase tracking-widest animate-pulse">Scanning Cloud Storage...</p>
                </div>
             ) : projects.length === 0 ? (
                <div className={`text-center py-24 border-2 border-dashed rounded-[40px] ${theme === 'light' ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-black/10'}`}>
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-700">
                      <FolderOpen size={40} />
                   </div>
                   <p className="text-gray-400 font-bold text-lg">آرشیو شما خالی است</p>
                   <p className="text-gray-600 text-xs mt-2 mb-6">هنوز هیچ لیریکی توسط موتور هوش مصنوعی تولید و ذخیره نشده است.</p>
                   <button onClick={onNavigateHome} className="px-8 py-3 bg-rap-accent text-white rounded-2xl text-sm font-black shadow-lg shadow-rap-accent/20 hover:scale-105 transition-all">ایجاد اولین پروژه</button>
                </div>
             ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <p>هیچ پروژه‌ای با این مشخصات یافت نشد.</p>
                    <button onClick={() => { setSearchQuery(''); setFilterStyle('all'); }} className="text-rap-accent text-xs font-bold mt-2 hover:underline">پاکسازی فیلترها</button>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                   {filteredProjects.map((project) => (
                      <div key={project.id} className={`border rounded-3xl p-6 transition-all group relative overflow-hidden flex flex-col h-full ${theme === 'light' ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/30'}`}>
                         <div className="flex justify-between items-start mb-4">
                            <div className="bg-rap-accent/10 text-rap-accent text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-rap-accent/20">{project.style}</div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                               <button 
                                 onClick={() => onLoadProject(project)} 
                                 className="p-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-colors"
                                 title="ویرایش و باز کردن"
                               >
                                 <ExternalLink size={16} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteProject(project.id)} 
                                 className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                                 title="حذف دائمی"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                         </div>
                         <h4 className={`text-lg font-black mb-2 line-clamp-1 leading-tight ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{project.title}</h4>
                         <p className={`text-xs line-clamp-3 leading-relaxed mb-6 font-medium opacity-60 flex-grow ${theme === 'light' ? 'text-zinc-600' : 'text-gray-400'}`}>{project.content}</p>
                         <div className={`flex items-center justify-between border-t pt-4 mt-auto ${theme === 'light' ? 'border-zinc-100' : 'border-white/5'}`}>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                                <Clock size={12} className="text-gray-600" />
                                <span>{new Date(project.lastModified).toLocaleDateString('fa-IR')}</span>
                            </div>
                            <button 
                                onClick={() => onLoadProject(project)}
                                className="text-[10px] font-black text-rap-accent hover:underline flex items-center gap-1.5"
                            >
                                بازگشت به استودیو <ChevronLeft size={12} />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {/* --- CREDITS TAB --- */}
        {activeTab === 'credits' && (
           <div className="max-w-4xl mx-auto animate-fadeIn">
              <div className="text-center mb-12">
                 <h3 className={`text-3xl font-black mb-3 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>تأمین اعتبار استودیو</h3>
                 <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">برای استفاده از سرویس‌های پیشرفته تولید لیریک، آنالیز فنی و تولید تصویر با کیفیت بالا، حساب خود را شارژ کنید.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {CREDIT_PACKAGES.map((pkg, idx) => (
                    <div key={idx} className={`relative border rounded-[36px] p-8 md:p-10 flex flex-col items-center hover:transform hover:-translate-y-2 transition-all duration-500 ${pkg.popular ? 'border-rap-accent bg-rap-accent/5 shadow-[0_20px_50px_rgba(255,0,85,0.1)]' : (theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/10')}`}>
                       {pkg.popular && (
                          <div className="absolute -top-4 bg-rap-accent text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-widest">
                             <Star size={12} fill="currentColor" /> Best Choice
                          </div>
                       )}
                       
                       <div className={`w-20 h-20 rounded-[28px] bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-8 shadow-2xl`}>
                          <Zap className="text-white" size={40} fill="currentColor" />
                       </div>
                       
                       <h4 className={`text-xl font-black mb-1 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{pkg.label}</h4>
                       <div className={`text-4xl font-black mb-8 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
                          {pkg.amount} <span className="text-sm text-gray-500 font-bold">UNIT</span>
                       </div>
                       
                       <ul className="space-y-4 w-full mb-10">
                          <li className="flex items-center gap-3 text-xs text-gray-500 font-bold"><CheckCircle2 size={16} className="text-green-500" /> دسترسی به مدل Pro</li>
                          <li className="flex items-center gap-3 text-xs text-gray-500 font-bold"><CheckCircle2 size={16} className="text-green-500" /> تولید کاور آرت 4K</li>
                          <li className="flex items-center gap-3 text-xs text-gray-500 font-bold"><CheckCircle2 size={16} className="text-green-500" /> اولویت در صف پردازش</li>
                       </ul>

                       <button 
                         onClick={() => {
                           updateCredits(pkg.amount);
                           alert(`بسته ${pkg.label} با موفقیت خریداری شد! (+${pkg.amount} اعتبار)`);
                         }}
                         className={`w-full py-4.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${pkg.popular ? 'bg-rap-accent text-white hover:bg-rap-accentHover shadow-rap-accent/20' : (theme === 'light' ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-white text-black hover:bg-gray-200 shadow-white/10')}`}
                       >
                         {pkg.price}
                       </button>
                    </div>
                 ))}
              </div>
              
              <div className={`mt-12 p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-5 text-center md:text-right ${theme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/5 border-blue-500/10'}`}>
                 <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 shrink-0"><CreditCard size={32} /></div>
                 <div>
                    <h5 className={`text-lg font-black mb-1 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>درگاه پرداخت هوشمند</h5>
                    <p className="text-xs text-gray-500 leading-relaxed">تمامی تراکنش‌ها توسط سیستم شاپرک تضمین شده و اعتبار به صورت آنی پس از پرداخت به حساب شما منتقل می‌گردد. پشتیبانی ۲۴ ساعته در صورت هرگونه تداخل در دسترس است.</p>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
