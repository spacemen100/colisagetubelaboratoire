import { createClient } from '@supabase/supabase-js';

// In Vite, we use import.meta.env instead of process.env
const supabaseUrl = 'https://yldymsqwvtfjfvtcjhsd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHltc3F3dnRmamZ2dGNqaHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTkzMzUsImV4cCI6MjA1OTQ5NTMzNX0.RvSADtSKHcuGrCZiDtUEOOJpE9AZcTUJPD1MMwpgGr4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  }
});