// ============================================================
// PAGES/DASHBOARD.JS
// Halaman ringkasan. Kalau mau ubah kartu KPI atau statistik
// yang tampil di dashboard, cukup edit file ini saja.
// ============================================================
import { byId, todayISO, pct, rupiah } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';

function kpi(icon, label, value, hint) {
  return `<div class="card kpiCard"><div class="kpiIcon">${icon}</div><div class="kpiLabel">${label}</div><div class="kpiValue">${value}</div><div class="kpiHint">${hint}</div></div>`;
}

export async function renderDashboard() {
  const section = byId('dashboard');
  section.innerHTML = `<div class="grid kpi"><div class="empty">Memuat ringkasan...</div></div>`;

  const [students, classes, attendance, payments] = await Promise.all([
    store.list('students'), store.list('classes'), store.list('attendance'), store.list('payments')
  ]);

  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const activeClasses = classes.filter((c) => c.status === 'Aktif').length;
  const today = todayISO();
  const todaysAttendance = attendance.filter((a) => a.date === today);
  const hadir = todaysAttendance.filter((a) => a.status === 'Hadir').length;
  const pctHadir = pct(hadir, todaysAttendance.length);

  const unpaid = payments.filter((p) => (p.type || 'Pemasukan') === 'Pemasukan' && (p.status !== 'Lunas' || Number(p.paid || 0) < Number(p.amount || 0)));
  const totalDue = unpaid.reduce((s, p) => s + (Number(p.amount || 0) - Number(p.paid || 0)), 0);

  section.innerHTML = `
    <div class="grid kpi">
      ${kpi('👧', 'Siswa Aktif', activeStudents, 'Anak sedang mengikuti les')}
      ${kpi('🏫', 'Kelas Aktif', activeClasses, 'Kelas & program berjalan')}
      ${kpi('✅', 'Kehadiran Hari Ini', pctHadir + '%', `${hadir} dari ${todaysAttendance.length} tercatat`)}
      ${kpi('💳', 'Tagihan Belum Lunas', rupiah(totalDue), `${unpaid.length} tagihan menunggu`)}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="cardHeader"><div><h2>Selamat Datang di LesKu</h2><p>Ringkasan cepat aktivitas lembaga les kamu hari ini.</p></div></div>
        <p class="muted">Gunakan menu di samping untuk mengelola siswa, kelas, absensi, pembayaran, hingga cetak dokumen. Untuk melihat perkembangan bulanan (pemasukan/pengeluaran & status bayar), buka menu <b>Rekap Bulanan</b>.</p>
      </div>
      <div class="card">
        <div class="cardHeader"><div><h2>Aksi Cepat</h2></div></div>
        <div class="miniList">
          <button class="btn soft" onclick="window.__lesku_showPage('attendance')">✅ Catat Absensi Hari Ini</button>
          <button class="btn soft" onclick="window.__lesku_showPage('payments')">💳 Catat Pembayaran</button>
          <button class="btn soft" onclick="window.__lesku_showPage('monthlyRecap')">📊 Lihat Rekap Bulanan</button>
        </div>
      </div>
    </div>`;
}
