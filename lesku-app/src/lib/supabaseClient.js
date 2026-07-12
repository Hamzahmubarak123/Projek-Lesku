// ============================================================
// SUPABASECLIENT.JS
// Membuat koneksi ke Supabase project milik KLIEN (data siswa,
// absensi, dst) - berbeda dengan License Server (lib/license.js).
//
// Kredensial diisi otomatis oleh lib/license.js setelah status
// lisensi klien dicek dan ternyata "active". Kalau masih mode
// Demo, fungsi getClientSupabase() tidak akan dipanggil sama sekali.
// ============================================================
import { createClient } from '@supabase/supabase-js';

let clientInstance = null;

/**
 * Dipanggil sekali oleh lib/license.js saat mode Live terkonfirmasi.
 * url & anonKey didapat dari tabel `licenses` di License Server.
 */
export function initClientSupabase(url, anonKey) {
  clientInstance = createClient(url, anonKey);
  return clientInstance;
}

export function getClientSupabase() {
  if (!clientInstance) {
    throw new Error('Supabase client klien belum diinisialisasi. Pastikan lib/license.js sudah jalan lebih dulu.');
  }
  return clientInstance;
}

export function hasClientSupabase() {
  return clientInstance !== null;
}
