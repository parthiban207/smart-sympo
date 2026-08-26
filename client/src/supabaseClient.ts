// agent-notes: { ctx: "TypeScript Supabase client initialization with resilient auth options and clock skew / JWT error interceptor helper", deps: ["@supabase/supabase-js"], state: "active", last: "antigravity@2026-08-26" }

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const isMockMode =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
  !import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const isClockSkewOrJwtError = (error: any): boolean => {
  if (!error) return false;
  const msg = (
    typeof error === 'string'
      ? error
      : error.message || error.error_description || JSON.stringify(error)
  ).toLowerCase();

  return (
    msg.includes('jwt') ||
    msg.includes('future') ||
    msg.includes('issued at') ||
    msg.includes('clock skew') ||
    msg.includes('invalid claim') ||
    msg.includes('token is not valid yet') ||
    msg.includes('iat')
  );
};

export const isValidUUID = (id: any): boolean =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
