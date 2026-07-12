// ============================================================
// PAGES/ATTENDANCE.JS
// Halaman Absensi versi lengkap: grid tap-per-siswa (seperti lembar
// absen sekolah), legger bulanan horizontal, dan riwayat detail.
// ============================================================
import { byId, escapeHtml, todayISO, toast, uid } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import { schemas } from '../lib/schemas.js';
import { openForm, deleteRow } from '../lib/crud.js';

const STATUSES = ['Hadir', 'Izin', 'Sakit', 'Alpha', 'Terlambat', 'Reschedule'];
const statusClassOf = (st) => ({ Izin: 'izin', Sakit: 'sakit', Alpha: 'alpha', Terlambat: 'terlambat' }[st] || '');
const statusCode = (st) => ({ Hadir: 'H', Izin: 'I', Sakit: 'S', Alpha: 'A', Terlambat: 'T', Reschedule: 'R' }[st] || '-');
const markClass = (st) => ({ Hadir: 'h', Izin: 'i', Sakit: 's', Alpha: 'a', Terlambat: 't', Reschedule: 'r' }[st] || '');

async function getClassStudents(classId) {
  const [students, enrollments, schedules] = await Promise.all([store.list('students'), store.list('enrollments'), store.list('schedules')]);
  let ids = [];
  if (classId) {
    ids = enrollments.filter((e) => e.classId === classId && e.status !== 'Berhenti').map((e) => e.studentId);
    const direct = schedules.filter((s) => s.classId === classId && s.studentId).map((s) => s.studentId);
    ids = [...ids, ...direct];
  }
  if (!ids.length) ids = students.filter((s) => s.status !== 'Nonaktif').map((s) => s.id);
  ids = [...new Set(ids)].filter(Boolean);
  return ids.map((id) => students.find((s) => s.id === id)).filter((s) => s && s.status !== 'Nonaktif');
}

async function classOptionsHtml(selected = '') {
  const classes = await store.list('classes');
  return `<option value="">Semua Siswa Aktif</option>${classes.filter((c) => c.status !== 'Nonaktif').map((c) => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${escapeHtml(c.name)} · ${escapeHtml(c.type || '')}</option>`).join('')}`;
}

async function upsertAttendance(studentId, patch) {
  const date = byId('attSheetDate')?.value || todayISO();
  const classId = byId('attSheetClass')?.value || '';
  const sessionNo = Number(byId('attSheetSession')?.value || 1);
  const attendance = await store.list('attendance');
  const existing = attendance.find((a) => a.date === date && String(a.classId || '') === String(classId || '') && a.studentId === studentId);
  if (existing) {
    await store.update('attendance', existing.id, { date, classId, studentId, sessionNo, ...patch });
  } else {
    await store.create('attendance', { id: uid('att'), date, classId, studentId, sessionNo, status: 'Hadir', notes: '', ...patch });
  }
}

export async function renderAttendance() {
  const section = byId('attendance');
  const classes = await store.list('classes');
  const firstClass = classes[0]?.id || '';
  const month = todayISO().slice(0, 7);

  section.innerHTML = `
  <div class="card solid">
    <div class="cardHeader"><div><h2>Absensi Pertemuan</h2><p>Pilih tanggal & kelas, lalu tap status setiap siswa.</p></div><button class="btn primary" onclick="window.__lesku_openForm('attendance')">＋ Tambah Manual</button></div>
    <div class="grid forms">
      <div class="field"><label>Tanggal Pertemuan</label><input id="attSheetDate" type="date" value="${todayISO()}" onchange="window.__lesku_refreshAttSheet()"></div>
      <div class="field"><label>Kelas / Program</label><select id="attSheetClass" onchange="window.__lesku_refreshAttSheet();window.__lesku_syncLedgerClass()">${await classOptionsHtml(firstClass)}</select></div>
      <div class="field"><label>Pertemuan Ke</label><input id="attSheetSession" type="number" min="1" value="1" onchange="window.__lesku_refreshAttSheet()"></div>
      <div class="field"><label>Aksi Cepat</label><button class="btn soft" type="button" onclick="window.__lesku_markAllPresent()">Tandai Semua Hadir</button></div>
    </div>
    <div class="legendRow" style="margin:12px 0 14px">
      <span class="badge ok">H = Hadir</span><span class="badge info">I = Izin</span><span class="badge muted">S = Sakit</span><span class="badge danger">A = Alpha</span><span class="badge warn">T = Terlambat</span><span class="badge muted">R = Reschedule</span>
    </div>
    <div id="attendanceSheetBox"><div class="empty">Memuat...</div></div>
  </div>
  <div class="card solid" style="margin-top:18px">
    <div class="cardHeader"><div><h2>Legger Absensi Bulanan</h2><p>Rekap horizontal per siswa dalam satu bulan.</p></div><span class="badge muted">Horizontal</span></div>
    <div class="grid forms">
      <div class="field"><label>Bulan</label><input id="ledgerMonth" type="month" value="${month}" onchange="window.__lesku_refreshLedger()"></div>
      <div class="field"><label>Kelas / Program</label><select id="ledgerClass" onchange="window.__lesku_refreshLedger()">${await classOptionsHtml(firstClass)}</select></div>
    </div>
    <div style="margin:12px 0" class="legendRow"><span class="mark h">H</span><span class="mark i">I</span><span class="mark s">S</span><span class="mark a">A</span><span class="mark t">T</span><span class="mark r">R</span><span class="subtle">Kosong berarti belum ada absensi pada tanggal tersebut.</span></div>
    <div id="attendanceLedgerBox"><div class="empty">Memuat...</div></div>
  </div>
  <div class="card solid" style="margin-top:18px">
    <div class="tableToolbar"><div><h2 style="margin:0">Riwayat Absensi</h2><p class="muted" style="margin:4px 0 0">Data detail tetap tersedia untuk edit dan audit.</p></div></div>
    <div id="attendanceHistoryBox"><div class="empty">Memuat...</div></div>
  </div>`;

  await refreshAttSheet();
  await refreshLedger();
  await renderHistoryTable();
}

async function refreshAttSheet() {
  const date = byId('attSheetDate')?.value || todayISO();
  const classId = byId('attSheetClass')?.value || '';
  const students = await getClassStudents(classId);
  const attendance = await store.list('attendance');
  const getRecord = (studentId) => attendance.find((a) => a.date === date && String(a.classId || '') === String(classId || '') && a.studentId === studentId) || {};

  const rows = students.map((s, i) => {
    const rec = getRecord(s.id);
    return `<tr><td class="studentCell"><b>${i + 1}. ${escapeHtml(s.name || '-')}</b><div class="subtle">${escapeHtml(s.parentName || '')} ${s.parentPhone ? '· ' + escapeHtml(s.parentPhone) : ''}</div></td>${STATUSES.map((st) => `<td><button class="attBtn ${statusClassOf(st)} ${rec.status === st ? 'active' : ''}" onclick="window.__lesku_setAttStatus('${s.id}','${st}')">${statusCode(st)}</button></td>`).join('')}<td><input class="attNoteInput" value="${escapeHtml(rec.notes || '')}" placeholder="Catatan" onchange="window.__lesku_setAttNote('${s.id}',this.value)"></td></tr>`;
  }).join('');

  byId('attendanceSheetBox').innerHTML = students.length
    ? `<div class="attendanceSheetWrap"><table class="attendanceSchool"><thead><tr><th class="studentCell">Nama Siswa</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpha</th><th>Terlambat</th><th>Reschedule</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : `<div class="empty">Belum ada siswa pada kelas ini. Tambahkan siswa ke Paket Les terlebih dahulu.</div>`;
}

async function refreshLedger() {
  const month = byId('ledgerMonth')?.value || todayISO().slice(0, 7);
  const classId = byId('ledgerClass')?.value || '';
  const students = await getClassStudents(classId);
  const attendance = await store.list('attendance');
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const header = Array.from({ length: days }, (_, i) => `<th>${i + 1}</th>`).join('');

  const rows = students.map((s, i) => {
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, Terlambat: 0, Reschedule: 0 };
    let cells = '';
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const rec = attendance.find((a) => a.date === date && a.studentId === s.id);
      if (rec && rec.status) counts[rec.status] = (counts[rec.status] || 0) + 1;
      cells += `<td>${rec && rec.status ? `<span class="mark ${markClass(rec.status)}">${statusCode(rec.status)}</span>` : ''}</td>`;
    }
    return `<tr><td class="nameCol"><b>${i + 1}. ${escapeHtml(s.name || '-')}</b><div class="subtle">H:${counts.Hadir || 0} I:${counts.Izin || 0} S:${counts.Sakit || 0} A:${counts.Alpha || 0} T:${counts.Terlambat || 0}</div></td>${cells}<td><b>${counts.Hadir || 0}</b></td><td><b>${(counts.Izin || 0) + (counts.Sakit || 0) + (counts.Alpha || 0) + (counts.Terlambat || 0)}</b></td></tr>`;
  }).join('');

  byId('attendanceLedgerBox').innerHTML = students.length
    ? `<div class="ledgerWrap"><table class="ledgerTable"><thead><tr><th class="nameCol">Siswa</th>${header}<th>Hadir</th><th>Non Hadir</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : `<div class="empty">Belum ada siswa untuk legger ini.</div>`;
}

async function renderHistoryTable() {
  const [attendance, students, classes] = await Promise.all([store.list('attendance'), store.list('students'), store.list('classes')]);
  const studentName = (id) => (students.find((s) => s.id === id) || {}).name || '-';
  const clsName = (id) => (classes.find((c) => c.id === id) || {}).name || '-';
  const sorted = [...attendance].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const rows = sorted.map((r) => `<tr><td>${r.date}</td><td>${escapeHtml(studentName(r.studentId))}</td><td>${escapeHtml(clsName(r.classId))}</td><td>${r.sessionNo || '-'}</td><td><span class="badge ${r.status === 'Hadir' ? 'ok' : r.status === 'Alpha' ? 'danger' : 'muted'}">${escapeHtml(r.status || '-')}</span></td><td>${escapeHtml(r.notes || '')}</td><td class="tdActions"><button class="btn small soft" onclick="window.__lesku_openForm('attendance','${r.id}')">Edit</button><button class="btn small danger" onclick="window.__lesku_deleteAttendance('${r.id}')">Hapus</button></td></tr>`).join('');
  byId('attendanceHistoryBox').innerHTML = `<div class="tableWrap"><table><thead><tr>${schemas.attendance.columns.map((c) => `<th>${c}</th>`).join('')}<th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="7"><div class="empty">Belum ada data.</div></td></tr>'}</tbody></table></div>`;
}

// ---------- jembatan ke window (dipanggil dari onclick inline) ----------
window.__lesku_refreshAttSheet = refreshAttSheet;
window.__lesku_refreshLedger = refreshLedger;
window.__lesku_syncLedgerClass = () => {
  const c = byId('attSheetClass')?.value || '';
  if (byId('ledgerClass')) byId('ledgerClass').value = c;
  refreshLedger();
};
window.__lesku_setAttStatus = async (studentId, status) => {
  await upsertAttendance(studentId, { status });
  await refreshAttSheet();
  await refreshLedger();
  await renderHistoryTable();
  toast(`Absensi disimpan: ${status}`);
};
window.__lesku_setAttNote = async (studentId, notes) => {
  await upsertAttendance(studentId, { notes });
  await refreshLedger();
};
window.__lesku_markAllPresent = async () => {
  const classId = byId('attSheetClass')?.value || '';
  const students = await getClassStudents(classId);
  for (const s of students) await upsertAttendance(s.id, { status: 'Hadir' });
  await refreshAttSheet();
  await refreshLedger();
  await renderHistoryTable();
  toast('Semua siswa ditandai hadir.');
};
window.__lesku_deleteAttendance = async (id) => {
  await deleteRow('attendance', id);
  await refreshAttSheet();
  await refreshLedger();
  await renderHistoryTable();
};
