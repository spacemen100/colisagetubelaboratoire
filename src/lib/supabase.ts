import { createClient } from '@supabase/supabase-js';

// Utilisez NEXT_PUBLIC_ pour les variables accessibles côté client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Recommandé pour les applications React
  },
  db: {
    schema: 'public', // Spécifiez le schéma si nécessaire
  }
});