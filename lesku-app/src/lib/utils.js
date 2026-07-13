// ============================================================
// UTILS.JS
// Fungsi bantu kecil yang dipakai di banyak tempat.
// Kalau butuh helper baru (format, validasi, dll), taruh di sini
// supaya tidak duplikat di file lain.
// ============================================================

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? s : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const pct = (a, b) => (b ? Math.round((Number(a || 0) / Number(b || 0)) * 100) : 0);

export const cleanPhone = (p) => String(p || '').replace(/[^0-9]/g, '').replace(/^0/, '62');

export const waLink = (phone, msg) => `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`;

export const byId = (id) => document.getElementById(id);

export const uid = (p) => p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

export const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

export const avg = (arr) => {
  const nums = arr.map(Number).filter((n) => !isNaN(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
};

export const monthKey = (d) => String(d || '').slice(0, 7);

export const daysUntil = (d) => {
  if (!d) return 9999;
  const a = new Date(todayISO() + 'T00:00:00');
  const b = new Date(d + 'T00:00:00');
  return Math.ceil((b - a) / 86400000);
};

export function toast(msg) {
  const t = byId('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

export function safeFileName(s) {
  return String(s || 'dokumen').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
}

// ---------- Konversi nama field: JS pakai camelCase, tabel Supabase
// pakai snake_case. Dipakai otomatis oleh dataStore.js saat Mode Live,
// supaya kode halaman tidak perlu tahu-menahu soal perbedaan ini. ----------
export function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

export function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function keysToSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k in obj) out[toSnakeCase(k)] = obj[k];
  return out;
}

export function keysToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  const out = {};
  for (const k in obj) out[toCamelCase(k)] = obj[k];
  return out;
}
