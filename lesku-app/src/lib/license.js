// ============================================================
// LICENSE.JS
// Inti dari sistem "gerbang" akses: Login (ID+Password) -> cek
// status lisensi -> baru boleh masuk ke data klien.
//
// Alur:
// 1. Guru buka app -> disodori layar Login (email + password).
// 2. Email+password itu di-cek ke LICENSE SERVER (Supabase - PUNYA
//    MUBARAK), bukan ke Supabase milik klien. Supabase Auth yang
//    menyimpan & memverifikasi password secara aman (ter-enkripsi).
// 3. Setelah login berhasil, sistem ambil baris "licenses" milik
//    user itu (RLS memastikan user cuma bisa lihat baris miliknya
//    sendiri, tidak bisa lihat data klien lain):
//      - status "active"  -> dapat balik URL + anon key Supabase
//                             KLIEN -> app connect ke situ.
//      - status "blocked" -> ditolak, langsung logout paksa.
// 4. Kalau License Server belum dikonfigurasi (development lokal
//    tanpa .env), otomatis fallback ke Mode Demo TANPA perlu login,
//    supaya tetap gampang dites tanpa setup Supabase dulu.
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

export const LICENSE_STATUS = {
  DEMO: 'demo',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  LOGIN_REQUIRED: 'login_required'
};

let currentStatus = null;
let licenseServerClient = null;

export function isLicenseServerConfigured() {
  return Boolean(LICENSE_SERVER_URL && LICENSE_SERVER_ANON_KEY);
}

function getLicenseServerClient() {
  if (!licenseServerClient) licenseServerClient = createClient(LICENSE_SERVER_URL, LICENSE_SERVER_ANON_KEY);
  return licenseServerClient;
}

/**
 * Dipanggil sekali di awal (src/main.js) sebelum app dirender.
 * Menentukan apakah harus tampil layar Login, Demo, atau langsung Active.
 */
export async function checkLicense() {
  if (!isLicenseServerConfigured()) {
    currentStatus = LICENSE_STATUS.DEMO;
    return { status: LICENSE_STATUS.DEMO };
  }

  const sb = getLicenseServerClient();
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    currentStatus = LICENSE_STATUS.LOGIN_REQUIRED;
    return { status: LICENSE_STATUS.LOGIN_REQUIRED };
  }

  return await verifyLicenseForSession();
}

/**
 * Login pakai email+password ke License Server. Dipanggil dari
 * layar Login (src/pages/login.js).
 */
export async function loginWithPassword(email, password) {
  const sb = getLicenseServerClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: LICENSE_STATUS.LOGIN_REQUIRED, message: 'Email atau password salah.' };
  }
  return await verifyLicenseForSession();
}

async function verifyLicenseForSession() {
  const sb = getLicenseServerClient();
  const { data, error } = await sb
    .from('licenses')
    .select('status, supabase_project_url, supabase_anon_key, catatan')
    .single();

  if (error || !data) {
    console.warn('License check gagal:', error);
    currentStatus = LICENSE_STATUS.BLOCKED;
    return { status: LICENSE_STATUS.BLOCKED, message: 'Akun ini belum terdaftar sebagai klien aktif. Hubungi admin.' };
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

  currentStatus = LICENSE_STATUS.BLOCKED;
  await sb.auth.signOut();
  return { status: LICENSE_STATUS.BLOCKED, message: data.catatan || 'Akses belum aktif. Silakan hubungi admin.' };
}

export async function logout() {
  if (isLicenseServerConfigured()) {
    const sb = getLicenseServerClient();
    await sb.auth.signOut();
  }
  currentStatus = null;
  window.location.reload();
}

export function getLicenseStatus() {
  return currentStatus;
}
