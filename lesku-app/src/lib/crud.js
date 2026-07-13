// ============================================================
// CRUD.JS
// Satu mesin render untuk SEMUA halaman data sederhana (tabel +
// form tambah/edit/hapus). Dipakai oleh: students, classes,
// enrollments, schedules, learning, assessments, payments.
//
// Kalau nanti nambah entitas baru di schemas.js, halaman barunya
// OTOMATIS dapat tabel + form ini tanpa nulis kode tambahan.
// ============================================================
import { schemas } from './schemas.js';
import { byId, escapeHtml, rupiah, uid } from './utils.js';
import { toast } from './utils.js';
import * as store from './dataStore.js';
import { waLink } from './utils.js';

let editContext = null; // { key, id } saat form dibuka untuk edit

async function studentOptions(selected = '') {
  const students = await store.list('students');
  return students.map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
}
async function classOptions(selected = '') {
  const classes = await store.list('classes');
  return classes.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
}
async function studentName(id) {
  const students = await store.list('students');
  return (students.find((x) => x.id === id) || {}).name || '-';
}
async function className(id) {
  const classes = await store.list('classes');
  return (classes.find((x) => x.id === id) || {}).name || '-';
}

function labelFor(key, c) {
  const f = (schemas[key].fields || []).find((x) => x[0] === c);
  return f ? f[1] : c;
}

async function displayCell(key, c, v, row) {
  const f = (schemas[key].fields || []).find((x) => x[0] === c);
  if (!f) return escapeHtml(v ?? '-');
  if (f[2] === 'student') return escapeHtml(await studentName(v));
  if (f[2] === 'class') return escapeHtml(await className(v));
  if (f[2] === 'currency') return rupiah(v);
  if (f[2] === 'select' && f[0] === 'status') {
    const map = { Aktif: 'ok', Lunas: 'ok', Nonaktif: 'muted', Selesai: 'info', Berhenti: 'danger', 'Belum Lunas': 'warn', 'Jatuh Tempo': 'danger' };
    return `<span class="badge ${map[v] || 'muted'}">${escapeHtml(v || '-')}</span>`;
  }
  return escapeHtml(v ?? '-');
}

export async function renderCrudPage(key) {
  const schema = schemas[key];
  const section = byId(key);
  if (!section) return;
  section.innerHTML = `<div class="card">
    <div class="tableToolbar">
      <div class="search"><input id="search_${key}" placeholder="Cari ${schema.title.toLowerCase()}..." oninput="window.__lesku_search('${key}', this.value)"></div>
      <button class="btn primary" onclick="window.__lesku_openForm('${key}')">＋ Tambah ${schema.singular}</button>
    </div>
    <div class="tableWrap"><table>
      <thead><tr>${schema.columns.map((c) => `<th>${labelFor(key, c)}</th>`).join('')}<th class="nowrap">Aksi</th></tr></thead>
      <tbody id="tbody_${key}"><tr><td colspan="${schema.columns.length + 1}">Memuat data...</td></tr></tbody>
    </table></div>
  </div>`;
  await renderRows(key);
}

async function renderRows(key, filterText = '') {
  const schema = schemas[key];
  const rows = await store.list(key);
  const filtered = filterText
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(filterText.toLowerCase()))
    : rows;
  const tbody = byId(`tbody_${key}`);
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}"><div class="empty">Belum ada data ${schema.title.toLowerCase()}.</div></td></tr>`;
    return;
  }
  const cells = await Promise.all(filtered.map(async (r) => {
    const tds = await Promise.all(schema.columns.map(async (c) => `<td>${await displayCell(key, c, r[c], r)}</td>`));
    const extra = [];
    if (key === 'learning') extra.push(`<button class="btn small" onclick="window.__lesku_sendLearningWA('${r.id}')">WA</button>`);
    if (key === 'payments' && (r.type || 'Pemasukan') === 'Pemasukan') extra.push(`<button class="btn small" onclick="window.__lesku_previewInvoiceFor('${r.id}')">Invoice</button>`);
    return `<tr>${tds.join('')}<td class="tdActions nowrap">
      ${extra.join('')}
      <button class="btn small soft" onclick="window.__lesku_openForm('${key}','${r.id}')">Edit</button>
      <button class="btn small danger" onclick="window.__lesku_deleteRow('${key}','${r.id}')">Hapus</button>
    </td></tr>`;
  }));
  tbody.innerHTML = cells.join('');
}

async function renderField(key, f, value) {
  const [name, label, type, required, options] = f;
  const req = required ? 'required' : '';
  if (type === 'select') {
    return `<div class="field"><label>${label}</label><select id="f_${name}" ${req}>${options.map((o) => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  }
  if (type === 'student') return `<div class="field"><label>${label}</label><select id="f_${name}" ${req}>${await studentOptions(value)}</select></div>`;
  if (type === 'class') return `<div class="field"><label>${label}</label><select id="f_${name}" ${req}>${await classOptions(value)}</select></div>`;
  if (type === 'textarea') return `<div class="field" style="grid-column:1/-1"><label>${label}</label><textarea id="f_${name}">${escapeHtml(value ?? '')}</textarea></div>`;
  const inputType = type === 'currency' ? 'number' : type;
  return `<div class="field"><label>${label}</label><input id="f_${name}" type="${inputType}" value="${escapeHtml(value ?? '')}" ${req}></div>`;
}

export async function openForm(key, id = '', onSaved = null) {
  const schema = schemas[key];
  let row = {};
  if (id) {
    const rows = await store.list(key);
    row = rows.find((x) => x.id === id) || {};
  }
  editContext = { key, id, onSaved };
  byId('modalTitle').textContent = (id ? 'Edit ' : 'Tambah ') + schema.singular;
  const fieldsHtml = await Promise.all(schema.fields.map((f) => renderField(key, f, row[f[0]])));
  byId('modalBody').innerHTML = `<div class="grid forms">${fieldsHtml.join('')}</div>`;
  byId('modalFoot').innerHTML = `
    <button class="btn ghost" onclick="window.__lesku_closeModal()">Batal</button>
    <button class="btn primary" onclick="window.__lesku_submitForm()">Simpan</button>`;
  byId('modalOverlay').classList.add('show');
}

export async function submitForm() {
  if (!editContext) return;
  const { key, id, onSaved } = editContext;
  const schema = schemas[key];
  const payload = {};
  schema.fields.forEach((f) => {
    const [name, , type] = f;
    const el = byId(`f_${name}`);
    if (!el) return;
    // Field angka (number/currency) yang dibiarkan kosong harus dikirim
    // sebagai null, BUKAN string kosong "" - kalau tidak, Supabase
    // menolak dengan error "invalid input syntax for type numeric".
    if (type === 'number' || type === 'currency') {
      payload[name] = el.value === '' ? null : Number(el.value);
    } else {
      payload[name] = el.value;
    }
  });
  try {
    if (id) await store.update(key, id, payload);
    else await store.create(key, payload);
    closeModal();
    await renderRows(key); // aman no-op kalau tabel generic-nya tidak sedang tampil (mis. dipanggil dari Rekap Bulanan)
    toast('Data berhasil disimpan.');
    if (typeof onSaved === 'function') await onSaved();
  } catch (err) {
    console.error(err);
    toast('Gagal menyimpan data. Coba lagi.');
  }
}

export async function deleteRow(key, id) {
  if (!confirm('Hapus data ini?')) return;
  await store.remove(key, id);
  await renderRows(key);
  toast('Data berhasil dihapus.');
}

export function closeModal() {
  byId('modalOverlay').classList.remove('show');
  editContext = null;
}

// Dijembatani ke window karena HTML di atas pakai onclick inline
// (pola yang sama seperti prototype awal, supaya migrasinya minim risiko).
window.__lesku_openForm = openForm;
window.__lesku_submitForm = submitForm;
window.__lesku_deleteRow = deleteRow;
window.__lesku_closeModal = closeModal;
window.__lesku_search = (key, val) => renderRows(key, val);

window.__lesku_sendLearningWA = async (id) => {
  const learning = await store.list('learning');
  const l = learning.find((x) => x.id === id);
  if (!l) return;
  const students = await store.list('students');
  const s = students.find((x) => x.id === l.studentId) || {};
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut laporan belajar Ananda ${s.name || ''} hari ini.\n\nMateri: ${l.material || '-'}\nMembaca: ${l.reading || '-'}\nMenulis: ${l.writing || '-'}\nBerhitung: ${l.counting || '-'}\nSikap: ${l.attitude || '-'}\nLatihan rumah: ${l.homework || '-'}\n\nCatatan: ${l.parentNote || '-'}\n\nTerima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};
