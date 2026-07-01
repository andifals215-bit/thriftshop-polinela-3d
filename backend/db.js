import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

let supabaseClient = null;

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (atau SUPABASE_ANON_KEY) di file .env');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseClient;
}

export async function initDb() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });

    if (error) throw error;
    console.log('Supabase: Berhasil Terhubung!');
  } catch (error) {
    console.error('Supabase: Koneksi Gagal!', error.message);
  }
}

export default getSupabaseClient;