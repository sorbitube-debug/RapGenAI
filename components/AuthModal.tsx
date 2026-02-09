
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, Sparkles, Loader2, AlertCircle, RefreshCw, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Math Challenge State
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0, answer: 0 });
  const [mathInput, setMathInput] = useState('');

  const { login, signup, loginWithGoogle } = useAuth();

  const generateMathChallenge = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setMathChallenge({ num1: n1, num2: n2, answer: n1 + n2 });
    setMathInput('');
  };

  useEffect(() => {
    if (isOpen) {
      generateMathChallenge();
      setError('');
      setMathInput('');
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseInt(mathInput) !== mathChallenge.answer) {
        setError('پاسخ سوال امنیتی اشتباه است.');
        generateMathChallenge();
        return;
    }

    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(name, email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطایی رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      try {
          await loginWithGoogle();
      } catch (err: any) {
          setError(err.message || "خطا در اتصال به گوگل");
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="w-full max-w-md bg-rap-card border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-10 overflow-y-auto custom-scrollbar">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-rap-accent to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rap-accent/20">
               <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-black text-white">{mode === 'login' ? 'خوش آمدید' : 'شروع مهندسی'}</h2>
            <p className="text-gray-400 text-sm mt-1">وارد حساب کاربری خود شوید</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-2xl mb-6 border border-white/5">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${mode === 'login' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>ورود</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${mode === 'signup' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>ثبت‌نام</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white text-black hover:bg-gray-100 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all"
            >
               <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
               {mode === 'login' ? 'ورود با گوگل' : 'ثبت نام با گوگل'}
            </button>

            <div className="flex items-center gap-3">
               <div className="h-px bg-white/10 flex-1" />
               <span className="text-[10px] text-gray-500 font-bold uppercase">یا با ایمیل</span>
               <div className="h-px bg-white/10 flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                <div className="relative group">
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-rap-accent transition-colors" size={18} />
                    <input required type="text" placeholder="نام نمایشی" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:border-rap-accent outline-none text-white transition-all" />
                </div>
                )}
                <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-rap-accent transition-colors" size={18} />
                <input required type="email" placeholder="آدرس ایمیل" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:border-rap-accent outline-none text-white transition-all" dir="ltr" />
                </div>
                <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-rap-accent transition-colors" size={18} />
                <input required type="password" placeholder="کلمه عبور" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:border-rap-accent outline-none text-white transition-all" dir="ltr" />
                </div>

                {/* Math Challenge */}
                <div className="bg-black/20 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <Calculator size={20} className="text-rap-accent" />
                      <div className="text-sm font-bold text-gray-300">
                        سوال امنیتی: <span className="text-white text-lg mx-2">{mathChallenge.num1} + {mathChallenge.num2} = ?</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <input 
                       required 
                       type="number" 
                       placeholder="؟" 
                       value={mathInput} 
                       onChange={e => setMathInput(e.target.value)} 
                       className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-center text-sm font-bold outline-none focus:border-rap-accent text-white"
                     />
                     <button type="button" onClick={generateMathChallenge} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <RefreshCw size={16} />
                     </button>
                   </div>
                </div>

                <button disabled={loading} className="w-full bg-gradient-to-r from-rap-accent to-purple-600 hover:from-rap-accentHover hover:to-purple-700 py-4.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-rap-accent/20 disabled:opacity-50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                    {mode === 'login' ? 'ورود به پنل کاربری' : 'شروع رایگان مهندسی لیریک'}
                </div>
                </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
