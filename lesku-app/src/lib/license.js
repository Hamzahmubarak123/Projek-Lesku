// ============================================================
// LICENSE.JS
// Inti dari sistem "jual putus tapi bisa diblokir".
//
// Alur:
// 1. App dibuka -> cek VITE_LICENSE_KEY ke License Server (Supabase
//    terpisah, punya Mubarak).
// 2. License Server balas salah satu status:
//      - "demo"    -> app jalan pakai data lokal (localStorage),
//                     TIDAK connect ke Supabase klien mana pun.
//      - "active"  -> License Server juga mengirim balik URL + anon key
//                     Supabase MILIK KLIEN -> app connect ke situ.
//      - "blocked" -> app tampilkan halaman terkunci, semua fitur mati.
// 3. Hasil status disimpan di memori (bukan localStorage) supaya
//    dicek ulang tiap kali app dibuka -> tidak bisa dimanipulasi
//    dari sisi klien.
//
// PENTING: anon key Supabase klien BOLEH dikirim ke browser (memang
// begitu cara kerja Supabase - keamanan asli ada di RLS policy,
// bukan di merahasiakan anon key). Yang WAJIB dirahasiakan adalah
// service role key - itu TIDAK PERNAH boleh dipakai di frontend.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { initClientSupabase } from './supabaseClient.js';

const LICENSE_SERVER_URL = import.meta.env.VITE_LICENSE_SERVER_URL;
const LICENSE_SERVER_ANON_KEY = import.meta.env.VITE_LICENSE_SERVER_ANON_KEY;
const LICENSE_KEY = import.meta.env.VITE_LICENSE_KEY || 'demo';

export const LICENSE_STATUS = {
  DEMO: 'demo',
  ACTIVE: 'active',
  BLOCKED: 'blocked'
};

let currentStatus = null;

/**
 * Dipanggil sekali di awal (src/main.js) sebelum app dirender.
 * Mengembalikan { status, message }.
 */
export async function checkLicense() {
  // Kalau License Server belum dikonfigurasi (mis. saat development awal),
  // fallback aman: anggap Demo Mode. App tetap bisa dites tanpa Supabase.
  if (!LICENSE_SERVER_URL || !LICENSE_SERVER_ANON_KEY || LICENSE_KEY === 'demo') {
    currentStatus = LICENSE_STATUS.DEMO;
    return { status: LICENSE_STATUS.DEMO };
  }

  try {
    const licenseServer = createClient(LICENSE_SERVER_URL, LICENSE_SERVER_ANON_KEY);
    const { data, error } = await licenseServer
      .from('licenses')
      .select('status, supabase_project_url, supabase_anon_key, catatan')
      .eq('license_key', LICENSE_KEY)
      .single();

    if (error || !data) {
      console.warn('License check gagal, fallback ke Demo Mode:', error);
      currentStatus = LICENSE_STATUS.DEMO;
      return { status: LICENSE_STATUS.DEMO, message: 'Tidak bisa memverifikasi lisensi, berjalan sebagai Demo.' };
    }

    if (data.status === LICENSE_STATUS.ACTIVE) {
      if (!data.supabase_project_url || !data.supabase_anon_key) {
        currentStatus = LICENSE_STATUS.BLOCKED;
        return { status: LICENSE_STATUS.BLOCKED, message: 'Konfigurasi klien belum lengkap. Hubungi admin.' };
      }
      initClientSupabase(data.supabase_project_url, data.supabase_anon_key);
      currentStatus = LICENSE_STATUS.ACTIVE;
      return { status: LICENSE_STATUS.ACTIVE };
    }

    if (data.status === LICENSE_STATUS.BLOCKED) {
      currentStatus = LICENSE_STATUS.BLOCKED;
      return { status: LICENSE_STATUS.BLOCKED, message: data.catatan || 'Akses belum aktif. Silakan hubungi admin.' };
    }

    // default: demo
    currentStatus = LICENSE_STATUS.DEMO;
    return { status: LICENSE_STATUS.DEMO };
  } catch (err) {
    console.warn('License check error, fallback ke Demo Mode:', err);
    currentStatus = LICENSE_STATUS.DEMO;
    return { status: LICENSE_STATUS.DEMO, message: 'Tidak ada koneksi ke server lisensi, berjalan sebagai Demo.' };
  }
}

export function getLicenseStatus() {
  return currentStatus;
}
