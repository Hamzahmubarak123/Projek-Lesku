// ============================================================
// PAGES/MONTHLYRECAP.JS  (FITUR BARU - sesuai roadmap Bagian 6)
// Rekap bulanan: siapa yang sudah/belum bayar bulan ini, total
// pemasukan, total pengeluaran, dan selisihnya.
// ============================================================
import { byId, rupiah, escapeHtml, monthKey, todayISO, waLink } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';

function currentMonthValue() {
  return todayISO().slice(0, 7); // format YYYY-MM buat <input type="month">
}

export async function renderMonthlyRecap() {
  const section = byId('monthlyRecap');
  section.innerHTML = `<div class="card"><div class="empty">Memuat rekap...</div></div>`;

  const month = byId('recapMonth')?.value || currentMonthValue();
  const [payments, students] = await Promise.all([store.list('payments'), store.list('students')]);

  const monthPayments = payments.filter((p) => monthKey(p.date) === month);
  const pemasukan = monthPayments.filter((p) => (p.type || 'Pemasukan') === 'Pemasukan');
  const pengeluaran = monthPayments.filter((p) => p.type === 'Pengeluaran');

  const totalPemasukanTertagih = pemasukan.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalSudahBayar = pemasukan.reduce((s, p) => s + Number(p.paid || 0), 0);
  const totalPengeluaran = pengeluaran.reduce((s, p) => s + Number(p.amount || 0), 0);
  const selisih = totalSudahBayar - totalPengeluaran;

  const studentName = (id) => (students.find((s) => s.id === id) || {}).name || '-';
  const studentPhone = (id) => (students.find((s) => s.id === id) || {}).parentPhone || '';

  const rows = pemasukan.map((p) => {
    const belumLunas = Number(p.paid || 0) < Number(p.amount || 0);
    const statusBadge = belumLunas
      ? `<span class="badge warn">Belum Lunas</span>`
      : `<span class="badge ok">Lunas</span>`;
    const waBtn = belumLunas && studentPhone(p.studentId)
      ? `<button class="btn small soft" onclick="window.open('${waLink(studentPhone(p.studentId), `Assalamu'alaikum, mengingatkan pembayaran les Ananda ${studentName(p.studentId)} periode ${p.period || month} sebesar ${rupiah(Number(p.amount || 0) - Number(p.paid || 0))}. Terima kasih.`)}','_blank')">💬 Reminder</button>`
      : '';
    return `<tr><td>${escapeHtml(studentName(p.studentId))}</td><td>${escapeHtml(p.period || '-')}</td><td>${rupiah(p.amount)}</td><td>${rupiah(p.paid)}</td><td>${statusBadge}</td><td class="tdActions">${waBtn}</td></tr>`;
  }).join('');

  section.innerHTML = `
    <div class="card">
      <div class="cardHeader">
        <div><h2>Rekap Bulanan</h2><p>Pantau status pembayaran orang tua serta pemasukan & pengeluaran per bulan.</p></div>
        <input type="month" id="recapMonth" value="${month}" onchange="window.__lesku_renderMonthlyRecap()">
      </div>
      <div class="grid kpi" style="margin-bottom:18px">
        <div class="card kpiCard"><div class="kpiIcon">💰</div><div class="kpiLabel">Total Tertagih</div><div class="kpiValue">${rupiah(totalPemasukanTertagih)}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">✅</div><div class="kpiLabel">Sudah Dibayar</div><div class="kpiValue">${rupiah(totalSudahBayar)}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">📉</div><div class="kpiLabel">Pengeluaran</div><div class="kpiValue">${rupiah(totalPengeluaran)}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">📈</div><div class="kpiLabel">Selisih (Profit)</div><div class="kpiValue">${rupiah(selisih)}</div></div>
      </div>
      <div class="cardHeader"><div><h3>Status Bayar Orang Tua — ${month}</h3></div>
        <button class="btn soft" onclick="window.__lesku_openForm('payments')">＋ Catat Pemasukan/Pengeluaran</button>
      </div>
      <div class="tableWrap"><table>
        <thead><tr><th>Siswa</th><th>Periode</th><th>Tagihan</th><th>Dibayar</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6"><div class="empty">Belum ada data pembayaran bulan ini.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

window.__lesku_renderMonthlyRecap = renderMonthlyRecap;
