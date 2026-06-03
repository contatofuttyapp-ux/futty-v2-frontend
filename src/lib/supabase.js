// Futty v2.0 — Cliente Supabase (frontend)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Futty] Faltam variáveis de ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Verifica o ficheiro .env do frontend.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
