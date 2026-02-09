import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateCredits: (amount: number) => Promise<void>;
  updateProfile: (name: string, avatar: string) => Promise<void>;
  buyPlugin: (pluginId: string, cost: number) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Local Storage Fallback Logic ---
  const saveToLocal = (u: User) => localStorage.setItem('rapgen_user', JSON.stringify(u));
  const getFromLocal = (): User | null => {
    const data = localStorage.getItem('rapgen_user');
    return data ? JSON.parse(data) : null;
  };
  const clearLocal = () => localStorage.removeItem('rapgen_user');
  // ------------------------------------

  // Fetch user profile from 'profiles' table (Supabase Mode)
  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch warning (using auth metadata):', error.message);
        setUser({
            id: userId,
            email: email,
            name: email.split('@')[0],
            credits: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            ownedPlugins: []
        });
        return;
      }

      if (data) {
        const userData: User = {
          id: userId,
          email: email,
          name: data.full_name || 'کاربر',
          credits: data.credits || 0,
          avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`,
          ownedPlugins: data.owned_plugins || [] // Assuming Supabase has this column, or fallback to empty
        };
        setUser(userData);
      }
    } catch (err) {
      console.error('Profile fetch exception:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const localUser = getFromLocal();
      if (localUser && !isSupabaseConfigured) {
         if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
         setUser(localUser);
         setLoading(false);
         return;
      }

      if (isSupabaseConfigured) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                await fetchProfile(session.user.id, session.user.email!);
            } else if (localUser) {
                if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
                setUser(localUser);
            }
          } catch (error: any) {
            console.warn("Supabase connection failed, falling back to local/demo mode:", error.message);
            if (localUser) {
                if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
                setUser(localUser);
            }
          }
      } else {
         if (localUser) {
             if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
             setUser(localUser);
         }
      }
      
      setLoading(false);

      if (isSupabaseConfigured) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
               await fetchProfile(session.user.id, session.user.email!);
            } else if (event === 'SIGNED_OUT') {
               setUser(null);
               clearLocal();
            }
          });
          return () => subscription.unsubscribe();
      }
    };

    initializeAuth();
  }, []);

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      alert("سرویس گوگل در حالت دمو فعال نیست. لطفا از ورود معمولی استفاده کنید.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw new Error(error.message);
  };

  const login = async (email: string, pass: string) => {
    const DEMO_EMAIL = 'a@gmail.com';

    // حالت دمو فقط زمانی فعال است که Supabase تنظیم نشده باشد
    // و ایمیل دقیقاً برابر DEMO_EMAIL باشد.
    if (!isSupabaseConfigured) {
       await new Promise(r => setTimeout(r, 800));

       if (email !== DEMO_EMAIL) {
         throw new Error('حالت دمو فقط برای ایمیل a@gmail.com فعال است. لطفاً با این ایمیل وارد شوید یا تنظیمات Supabase را کامل کنید.');
       }

       const localUser = getFromLocal();
       if (localUser && localUser.email === email) {
           if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
           setUser(localUser);
           return;
       }
       const demoUser: User = {
           id: 'demo-' + Math.random().toString(36).substr(2,9),
           email,
           name: email.split('@')[0],
           credits: 250, // More credits for demo to buy plugins
           avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
           ownedPlugins: []
       };
       setUser(demoUser);
       saveToLocal(demoUser);
       return;
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
    } catch (error: any) {
        if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            // در صورت قطع ارتباط با Supabase، فقط برای ایمیل دمو
            // کاربر آفلاین ساخته می‌شود.
            const DEMO_EMAIL = 'a@gmail.com';
            if (email !== DEMO_EMAIL) {
              throw new Error('عدم دسترسی به سرور احراز هویت. حالت آفلاین فقط برای ایمیل a@gmail.com مجاز است.');
            }

            const demoUser: User = {
               id: 'offline-' + Math.random().toString(36).substr(2,9),
               email,
               name: email.split('@')[0],
               credits: 250,
               avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
               ownedPlugins: []
            };
            setUser(demoUser);
            saveToLocal(demoUser);
            return;
        }
        throw new Error(error.message);
    }
  };

  const signup = async (name: string, email: string, pass: string) => {
    const DEMO_EMAIL = 'a@gmail.com';

    if (!isSupabaseConfigured) {
        await new Promise(r => setTimeout(r, 800));

        if (email !== DEMO_EMAIL) {
          throw new Error('ثبت‌نام در حالت دمو فقط برای ایمیل a@gmail.com مجاز است. لطفاً از این ایمیل استفاده کنید یا Supabase را تنظیم کنید.');
        }

        const newUser: User = {
           id: 'demo-' + Math.random().toString(36).substr(2,9),
           email,
           name,
           credits: 100,
           avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
           ownedPlugins: []
        };
        setUser(newUser);
        saveToLocal(newUser);
        return;
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name } },
        });

        if (authError) throw authError;

        if (authData.user) {
          const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
          try {
              await supabase.from('profiles').insert([
                { id: authData.user.id, full_name: name, credits: 100, avatar_url: avatarUrl, owned_plugins: [] }
              ]);
          } catch(e) { console.warn("Profile creation skipped/failed", e); }

          if (authData.session) {
             await fetchProfile(authData.user.id, email);
          } else {
             throw new Error("ثبت نام انجام شد. اگر ایمیل تایید نیاز است، لطفاً اینباکس خود را چک کنید.");
          }
        }
    } catch (error: any) {
        if (error.message.includes('Failed to fetch')) {
             const DEMO_EMAIL = 'a@gmail.com';
             if (email !== DEMO_EMAIL) {
               throw new Error('عدم دسترسی به سرور ثبت‌نام. حالت آفلاین فقط برای ایمیل a@gmail.com مجاز است.');
             }

             const demoUser: User = {
               id: 'offline-' + Math.random().toString(36).substr(2,9),
               email,
               name,
               credits: 100,
               avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
               ownedPlugins: []
            };
            setUser(demoUser);
            saveToLocal(demoUser);
            return;
        }
        throw new Error(error.message);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
        try { await supabase.auth.signOut(); } catch(e) { console.warn(e); }
    }
    setUser(null);
    clearLocal();
  };

  const updateCredits = async (amount: number) => {
    if (!user) return;
    const newBalance = Math.max(0, user.credits + amount);
    
    const updatedUser = { ...user, credits: newBalance };
    setUser(updatedUser);
    saveToLocal(updatedUser);

    if (isSupabaseConfigured && !user.id.startsWith('demo-') && !user.id.startsWith('offline-')) {
        const { error } = await supabase
          .from('profiles')
          .update({ credits: newBalance })
          .eq('id', user.id);
        if (error) console.error('Error updating credits on server:', error);
    }
  };

  const updateProfile = async (name: string, avatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, name, avatar };
    setUser(updatedUser);
    saveToLocal(updatedUser);

    if (isSupabaseConfigured && !user.id.startsWith('demo-') && !user.id.startsWith('offline-')) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: name, avatar_url: avatar })
          .eq('id', user.id);
        if (error) console.error('Error updating profile on server:', error);
    }
  };

  const buyPlugin = async (pluginId: string, cost: number): Promise<boolean> => {
      if (!user) return false;
      if (user.credits < cost) return false;
      if (user.ownedPlugins.includes(pluginId)) return true;

      const newBalance = user.credits - cost;
      const newPlugins = [...user.ownedPlugins, pluginId];
      
      const updatedUser = { ...user, credits: newBalance, ownedPlugins: newPlugins };
      setUser(updatedUser);
      saveToLocal(updatedUser);

      if (isSupabaseConfigured && !user.id.startsWith('demo-') && !user.id.startsWith('offline-')) {
          // This assumes Supabase table has an 'owned_plugins' array column
          const { error } = await supabase
            .from('profiles')
            .update({ credits: newBalance, owned_plugins: newPlugins })
            .eq('id', user.id);
          if (error) console.error('Error syncing purchase:', error);
      }
      return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, signup, logout, updateCredits, updateProfile, buyPlugin, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
