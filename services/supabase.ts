
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase project URL and Anon Key
// You can get these from your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Check if credentials are placeholders
export const isSupabaseConfigured = 
  supabaseUrl !== 'https://YOUR_PROJECT_ID.supabase.co' && 
  supabaseAnonKey !== 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
