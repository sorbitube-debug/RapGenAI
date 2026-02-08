
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { cloudStorage } from '../services/cloudStorage';

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

  // --- Local Storage Fallback Logic (Only used if Supabase config is missing) ---
  const saveToLocal = (u: User) => localStorage.setItem('rapgen_user', JSON.stringify(u));
  const getFromLocal = (): User | null => {
    const data = localStorage.getItem('rapgen_user');
    return data ? JSON.parse(data) : null;
  };
  const clearLocal = () => localStorage.removeItem('rapgen_user');
  // ------------------------------------

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch warning (using auth metadata):', error.message);
        // Fallback for immediate UI update if trigger is slow
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
          ownedPlugins: data.owned_plugins || []
        };
        setUser(userData);
      }
    } catch (err) {
      console.error('Profile fetch exception:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Check if Supabase is actually configured
      if (!isSupabaseConfigured) {
         console.warn("Supabase is not configured. Using local storage mode.");
         const localUser = getFromLocal();
         if (localUser) {
             if (!localUser.ownedPlugins) localUser.ownedPlugins = [];
             setUser(localUser);
         }
         setLoading(false);
         return;
      }

      // 2. Check active Supabase session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
            await fetchProfile(session.user.id, session.user.email!);
        }
      } catch (error: any) {
        console.error("Auth init error:", error.message);
      }
      
      setLoading(false);

      // 3. Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
           await fetchProfile(session.user.id, session.user.email!);
        } else if (event === 'SIGNED_OUT') {
           setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      alert("سرویس گوگل در حالت دمو فعال نیست.");
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
    if (!isSupabaseConfigured) {
       // Demo mode
       await new Promise(r => setTimeout(r, 800)); 
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
           credits: 250,
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
        await cloudStorage.logActivity(user?.id || 'unknown', 'login', 'ورود به حساب کاربری');
    } catch (error: any) {
        throw new Error(error.message);
    }
  };

  const signup = async (name: string, email: string, pass: string) => {
    if (!isSupabaseConfigured) {
        // Demo mode
        await new Promise(r => setTimeout(r, 800));
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
          // Profile is created by Trigger in Supabase (handle_new_user)
          // But if triggers aren't set up, we can force it here:
          const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
          
          const { error: profileError } = await supabase.from('profiles').upsert([
             { id: authData.user.id, full_name: name, credits: 100, avatar_url: avatarUrl, owned_plugins: [], email: email }
          ]);
          
          if (profileError) console.warn("Manual profile creation error (might be handled by trigger):", profileError);

          if (authData.session) {
             await fetchProfile(authData.user.id, email);
          } else {
             throw new Error("ثبت نام موفق! لطفاً ایمیل خود را تایید کنید.");
          }
        }
    } catch (error: any) {
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
    
    // Optimistic Update
    const updatedUser = { ...user, credits: newBalance };
    setUser(updatedUser);
    if (!isSupabaseConfigured) saveToLocal(updatedUser);

    if (isSupabaseConfigured && !user.id.startsWith('demo-')) {
        const { error } = await supabase
          .from('profiles')
          .update({ credits: newBalance })
          .eq('id', user.id);
        
        if (error) {
            console.error('Error updating credits on server:', error);
            // Revert on error
            setUser(user); 
        } else {
            if (amount > 0) {
                cloudStorage.logActivity(user.id, 'credit_update', `افزایش اعتبار: ${amount} واحد`);
            }
        }
    }
  };

  const updateProfile = async (name: string, avatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, name, avatar };
    setUser(updatedUser);
    if (!isSupabaseConfigured) saveToLocal(updatedUser);

    if (isSupabaseConfigured && !user.id.startsWith('demo-')) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: name, avatar_url: avatar })
          .eq('id', user.id);
        
        if (error) console.error('Error updating profile on server:', error);
        else cloudStorage.logActivity(user.id, 'profile_update', 'بروزرسانی پروفایل کاربری');
    }
  };

  const buyPlugin = async (pluginId: string, cost: number): Promise<boolean> => {
      if (!user) return false;
      if (user.credits < cost) return false;
      if (user.ownedPlugins.includes(pluginId)) return true;

      const newBalance = user.credits - cost;
      const newPlugins = [...user.ownedPlugins, pluginId];
      
      // Optimistic UI
      const updatedUser = { ...user, credits: newBalance, ownedPlugins: newPlugins };
      setUser(updatedUser);
      if (!isSupabaseConfigured) saveToLocal(updatedUser);

      if (isSupabaseConfigured && !user.id.startsWith('demo-')) {
          const { error } = await supabase
            .from('profiles')
            .update({ credits: newBalance, owned_plugins: newPlugins })
            .eq('id', user.id);
          
          if (error) {
              console.error('Error syncing purchase:', error);
              setUser(user); // Revert
              return false;
          } else {
              cloudStorage.logActivity(user.id, 'purchase_plugin', `خرید افزونه ${pluginId}`);
          }
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
