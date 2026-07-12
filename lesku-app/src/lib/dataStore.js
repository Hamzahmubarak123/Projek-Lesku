// ============================================================
// DATASTORE.JS
// Lapisan akses data TUNGGAL yang dipakai semua halaman.
// Halaman (pages/*.js) TIDAK PERNAH langsung pakai localStorage
// atau Supabase - selalu lewat dataStore ini.
//
// Kenapa penting: ini yang bikin Mode Demo & Mode Live bisa
// pakai KODE HALAMAN YANG SAMA PERSIS. Bedanya cuma di sini.
//
// Semua fungsi bersifat async (pakai Promise) - biar konsisten
// baik saat manggil localStorage (instan) maupun Supabase (network).
// ============================================================
import { LICENSE_STATUS, getLicenseStatus } from './license.js';
import { getClientSupabase } from './supabaseClient.js';
import { uid, todayISO } from './utils.js';

const DEMO_STORAGE_KEY = 'lesku_demo_v1';

const ENTITY_TABLE = {
  students: 'students', classes: 'classes', enrollments: 'enrollments',
  schedules: 'schedules', attendance: 'attendance', learning: 'learning',
  assessments: 'assessments', payments: 'payments'
};

// ---------- Data contoh untuk Mode Demo (dipakai kalau localStorage kosong) ----------
function seedDemoState() {
  const s1 = uid('stu'), s2 = uid('stu'), s3 = uid('stu'), c1 = uid('cls'), c2 = uid('cls');
  const today = todayISO();
  return {
    settings: {
      institutionName: 'Nama Lembaga Les (Demo)', teacherName: 'Nama Guru', address: 'Alamat lembaga les',
      phone: '08xxxxxxxxxx', theme: 'yellow', themeLocked: false, logoData: '',
      invoiceNote: 'Terima kasih atas kepercayaan Bapak/Ibu.'
    },
    students: [
      { id: s1, name: 'Alya Putri', dob: '2018-04-12', parentName: 'Bunda Alya', parentPhone: '081234567890', status: 'Aktif', notes: 'Perlu latihan huruf b dan d.' },
      { id: s2, name: 'Raka Pratama', dob: '2017-09-03', parentName: 'Ibu Raka', parentPhone: '081298765432', status: 'Aktif', notes: 'Suka berhitung.' },
      { id: s3, name: 'Naya Zahra', dob: '2018-11-20', parentName: 'Bunda Naya', parentPhone: '081355555111', status: 'Aktif', notes: 'Percaya diri membaca.' }
    ],
    classes: [
      { id: c1, name: 'Calistung Pagi A', type: 'Kelompok', program: 'Calistung Dasar', teacher: 'Bu Guru', scheduleText: 'Senin & Rabu, 09.00', capacity: 6, status: 'Aktif' },
      { id: c2, name: 'Privat Membaca Alya', type: 'Privat', program: 'Membaca Lancar', teacher: 'Bu Guru', scheduleText: 'Selasa & Kamis, 15.30', capacity: 1, status: 'Aktif' }
    ],
    enrollments: [
      { id: uid('enr'), studentId: s1, classId: c2, packageType: 'Paket 8x Pertemuan / Bulan', price: 450000, startDate: today.slice(0, 8) + '01', endDate: today.slice(0, 8) + '28', meetingsQuota: 8, status: 'Aktif' }
    ],
    schedules: [
      { id: uid('sch'), date: today, timeStart: '09:00', timeEnd: '10:00', classId: c1, studentId: '', topic: 'Mengenal suku kata ba-bi-bu', status: 'Terjadwal' }
    ],
    attendance: [
      { id: uid('att'), date: today, classId: c1, studentId: s2, sessionNo: 3, status: 'Hadir', notes: 'Tepat waktu.' }
    ],
    learning: [],
    assessments: [],
    payments: [
      { id: uid('pay'), invoiceNo: 'INV-' + new Date().getFullYear() + '-001', date: today, type: 'Pemasukan', studentId: s1, classId: c2, period: 'Bulan ini', packageType: 'Paket 8x Pertemuan / Bulan', amount: 450000, paid: 0, method: 'Transfer', dueDate: today, status: 'Belum Lunas', note: '' }
    ]
  };
}

function loadDemoState() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedDemoState();
  } catch (e) {
    console.warn(e);
    return seedDemoState();
  }
}

function saveDemoState(state) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

let demoState = null;
function ensureDemoState() {
  if (!demoState) demoState = loadDemoState();
  return demoState;
}

// ============================================================
// API PUBLIK - inilah yang dipanggil oleh halaman-halaman (pages/*.js)
// ============================================================

export async function list(entity, { orderBy } = {}) {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    let q = sb.from(ENTITY_TABLE[entity]).select('*');
    if (orderBy) q = q.order(orderBy, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }
  const state = ensureDemoState();
  return state[entity] || [];
}

export async function create(entity, payload) {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    const { data, error } = await sb.from(ENTITY_TABLE[entity]).insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const state = ensureDemoState();
  const row = { id: uid(entity.slice(0, 3)), ...payload };
  state[entity] = state[entity] || [];
  state[entity].push(row);
  saveDemoState(state);
  return row;
}

export async function update(entity, id, patch) {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    const { data, error } = await sb.from(ENTITY_TABLE[entity]).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const state = ensureDemoState();
  const row = (state[entity] || []).find((x) => x.id === id);
  if (row) Object.assign(row, patch);
  saveDemoState(state);
  return row;
}

export async function remove(entity, id) {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    const { error } = await sb.from(ENTITY_TABLE[entity]).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  const state = ensureDemoState();
  state[entity] = (state[entity] || []).filter((x) => x.id !== id);
  saveDemoState(state);
  return true;
}

export async function getSettings() {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    const { data, error } = await sb.from('settings').select('*').single();
    if (error) throw error;
    return data;
  }
  const state = ensureDemoState();
  return state.settings || {};
}

export async function updateSettings(patch) {
  if (getLicenseStatus() === LICENSE_STATUS.ACTIVE) {
    const sb = getClientSupabase();
    const { data, error } = await sb.from('settings').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    return data;
  }
  const state = ensureDemoState();
  state.settings = { ...state.settings, ...patch };
  saveDemoState(state);
  return state.settings;
}

export function exportDemoBackup() {
  return JSON.stringify(ensureDemoState(), null, 2);
}

export function resetDemoData() {
  demoState = seedDemoState();
  saveDemoState(demoState);
  return demoState;
}
