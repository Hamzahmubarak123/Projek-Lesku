// ============================================================
// PAGES/MONTHLYRECAP.JS
// Rekap bulanan dengan TAGIHAN OTOMATIS:
// - Setiap siswa dengan paket aktif otomatis dapat tagihan bulan ini
//   (kalau belum ada), tidak perlu input manual satu-satu.
// - Checkbox "Lunas" dengan konfirmasi, lalu TERKUNCI setelah dicentang
//   supaya tidak berubah tidak sengaja. Koreksi tetap bisa lewat
//   halaman Pembayaran biasa kalau memang perlu.
// - Tombol Invoice & reminder WA langsung di tiap baris.
// ============================================================
import {
  byId,
  rupiah,
  escapeHtml,
  monthKey,
  todayISO,
  waLink,
  toast,
  uid,
} from '../lib/utils.js';
import * as store from '../lib/dataStore.js';

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function currentMonthValue() {
  return todayISO().slice(0, 7);
}

function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return `${BULAN_ID[m - 1]} ${y}`;
}

async function nextInvoiceNo() {
  const payments = await store.list('payments');
  const year = new Date().getFullYear();
  return 'INV-' + year + '-' + String(payments.length + 1).padStart(3, '0');
}

/**
 * Cek semua siswa dengan paket (enrollment) aktif -> kalau belum ada
 * tagihan untuk bulan yang dipilih, buatkan otomatis (status Belum Lunas).
 * Aman dipanggil berkali-kali (tidak akan duplikat).
 */
async function ensureMonthlyBills(month) {
  const [enrollments, payments] = await Promise.all([
    store.list('enrollments'),
    store.list('payments'),
  ]);
  const activeEnrollments = enrollments.filter((e) => e.status === 'Aktif');
  const existingForMonth = payments.filter(
    (p) => (p.type || 'Pemasukan') === 'Pemasukan' && monthKey(p.date) === month
  );

  for (const en of activeEnrollments) {
    const already = existingForMonth.find(
      (p) => p.studentId === en.studentId && p.classId === en.classId
    );
    if (already) continue;
    const invoiceNo = await nextInvoiceNo();
    await store.create('payments', {
      id: uid('pay'),
      invoiceNo,
      date: `${month}-01`,
      type: 'Pemasukan',
      studentId: en.studentId,
      classId: en.classId,
      period: monthLabel(month),
      packageType: en.packageType || 'Bulanan',
      amount: Number(en.price || 0),
      paid: 0,
      paidDate: '',
      method: '',
      dueDate: `${month}-10`,
      status: 'Belum Lunas',
      note: 'Tagihan otomatis bulanan',
    });
    // refresh daftar existing supaya tidak generate 2x dalam loop yang sama
    existingForMonth.push({
      studentId: en.studentId,
      classId: en.classId,
      date: `${month}-01`,
    });
  }
}

export async function renderMonthlyRecap() {
  const section = byId('monthlyRecap');
  section.innerHTML = `<div class="card"><div class="empty">Memuat rekap & menyiapkan tagihan bulan ini...</div></div>`;

  const month = byId('recapMonth')?.value || currentMonthValue();
  await ensureMonthlyBills(month);
  await renderTable(month);
}

async function renderTable(month) {
  const section = byId('monthlyRecap');
  const [payments, students] = await Promise.all([
    store.list('payments'),
    store.list('students'),
  ]);

  const monthPayments = payments.filter((p) => monthKey(p.date) === month);
  const pemasukan = monthPayments.filter(
    (p) => (p.type || 'Pemasukan') === 'Pemasukan'
  );
  const pengeluaran = monthPayments.filter((p) => p.type === 'Pengeluaran');

  const totalPemasukanTertagih = pemasukan.reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );
  const totalSudahBayar = pemasukan.reduce(
    (s, p) => s + Number(p.paid || 0),
    0
  );
  const totalPengeluaran = pengeluaran.reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );
  const selisih = totalSudahBayar - totalPengeluaran;

  const studentName = (id) =>
    (students.find((s) => s.id === id) || {}).name || '-';
  const studentPhone = (id) =>
    (students.find((s) => s.id === id) || {}).parentPhone || '';

  const sortedPemasukan = [...pemasukan].sort((a, b) =>
    studentName(a.studentId).localeCompare(studentName(b.studentId))
  );

  const rows = sortedPemasukan
    .map((p) => {
      const isLunas = p.status === 'Lunas';
      const statusBadge = isLunas
        ? `<span class="badge ok">Lunas</span>`
        : `<span class="badge warn">Belum Lunas</span>`;
      const waBtn =
        !isLunas && studentPhone(p.studentId)
          ? `<button class="btn small soft" onclick="window.__lesku_recapReminderWA('${p.id}')">💬 Reminder</button>`
          : '';
      const invoiceBtn = `<button class="btn small" onclick="window.__lesku_previewInvoiceFor('${p.id}')">🧾 Invoice</button>`;
      return `<tr>
      <td><input type="checkbox" ${
        isLunas ? 'checked disabled' : ''
      } onchange="window.__lesku_markLunas('${
        p.id
      }', this)" style="width:18px;height:18px;cursor:${
        isLunas ? 'default' : 'pointer'
      }"></td>
      <td><b>${escapeHtml(studentName(p.studentId))}</b></td>
      <td>${escapeHtml(p.period || '-')}</td>
      <td>${rupiah(p.amount)}</td>
      <td>${statusBadge}</td>
      <td>${p.paidDate ? p.paidDate : '<span class="muted">-</span>'}</td>
      <td class="tdActions">${invoiceBtn}${waBtn}</td>
    </tr>`;
    })
    .join('');

  section.innerHTML = `
    <div class="card">
      <div class="cardHeader">
        <div><h2>Rekap Bulanan</h2><p>Tagihan siswa aktif dibuat otomatis. Centang saat orang tua sudah bayar.</p></div>
        <input type="month" id="recapMonth" value="${month}" onchange="window.__lesku_renderMonthlyRecap()">
      </div>
      <div class="grid kpi" style="margin-bottom:18px">
        <div class="card kpiCard"><div class="kpiIcon">💰</div><div class="kpiLabel">Total Tertagih</div><div class="kpiValue">${rupiah(
          totalPemasukanTertagih
        )}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">✅</div><div class="kpiLabel">Sudah Dibayar</div><div class="kpiValue">${rupiah(
          totalSudahBayar
        )}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">📉</div><div class="kpiLabel">Pengeluaran</div><div class="kpiValue">${rupiah(
          totalPengeluaran
        )}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">📈</div><div class="kpiLabel">Selisih (Profit)</div><div class="kpiValue">${rupiah(
          selisih
        )}</div></div>
      </div>
      <div class="cardHeader"><div><h3>Status Bayar Orang Tua — ${monthLabel(
        month
      )}</h3></div>
        <button class="btn soft" onclick="window.__lesku_openForm('payments')">＋ Catat Pengeluaran / Tagihan Lain</button>
      </div>
      <div class="tableWrap"><table>
        <thead><tr><th>Lunas</th><th>Siswa</th><th>Periode</th><th>Tagihan</th><th>Status</th><th>Tgl Bayar</th><th>Aksi</th></tr></thead>
        <tbody>${
          rows ||
          '<tr><td colspan="7"><div class="empty">Belum ada siswa dengan paket aktif bulan ini.</div></td></tr>'
        }</tbody>
      </table></div>
    </div>`;
}

window.__lesku_renderMonthlyRecap = renderMonthlyRecap;

window.__lesku_markLunas = async (paymentId, checkboxEl) => {
  const payments = await store.list('payments');
  const p = payments.find((x) => x.id === paymentId);
  if (!p) return;
  const students = await store.list('students');
  const name =
    (students.find((s) => s.id === p.studentId) || {}).name || 'siswa ini';

  const confirmed = confirm(
    `Yakin ${name} sudah membayar tagihan sebesar ${rupiah(
      p.amount
    )}?\n\nSetelah dikonfirmasi, status akan terkunci dan tidak bisa diubah lewat halaman ini lagi.`
  );
  if (!confirmed) {
    checkboxEl.checked = false;
    return;
  }

  await store.update('payments', paymentId, {
    status: 'Lunas',
    paid: p.amount,
    paidDate: todayISO(),
  });
  toast(`Pembayaran ${name} tercatat Lunas.`);
  const month = byId('recapMonth')?.value || currentMonthValue();
  await renderTable(month);
};

window.__lesku_recapReminderWA = async (paymentId) => {
  const payments = await store.list('payments');
  const p = payments.find((x) => x.id === paymentId);
  if (!p) return;
  const students = await store.list('students');
  const s = students.find((x) => x.id === p.studentId) || {};
  if (!s.parentPhone) return toast('Nomor WhatsApp orang tua belum tersedia.');
  const sisa = Number(p.amount || 0) - Number(p.paid || 0);
  const msg = `Assalamu'alaikum Bapak/Ibu ${
    s.parentName || ''
  }, mengingatkan pembayaran les Ananda ${s.name || ''} periode ${
    p.period || ''
  } sebesar ${rupiah(sisa)}. Terima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};
