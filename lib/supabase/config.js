export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const configurado = /^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_KEY.length > 20;
