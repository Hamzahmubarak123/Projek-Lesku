// ============================================================
// PAGES/CASHFLOW.JS
// Rekap uang masuk (dari pemasukan yang sudah dibayar) vs uang
// keluar (pengeluaran), bisa difilter Semua Bulan atau bulan tertentu.
// ============================================================
import { byId, rupiah, escapeHtml, monthKey, fmtDate, todayISO } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return `${BULAN_ID[m - 1]} ${y}`;
}

function expenseAmount(e) {
  return Number(e.price || 0) * Number(e.qty || 1);
}

export async function renderCashflow() {
  const section = byId('cashflow');
  section.innerHTML = `<div class="card"><div class="empty">Memuat cashflow...</div></div>`;

  const [payments, expenses] = await Promise.all([store.list('payments'), store.list('expenses')]);

  // Kumpulkan semua bulan yang ada datanya (dari pemasukan atau pengeluaran)
  const monthsSet = new Set([
    ...payments.map((p) => monthKey(p.date)),
    ...expenses.map((e) => monthKey(e.date))
  ].filter(Boolean));
  const months = [...monthsSet].sort().reverse();
  const selected = byId('cashflowMonth')?.value || 'all';

  await renderBody(payments, expenses, months, selected);
}

async function renderBody(payments, expenses, months, selected) {
  const section = byId('cashflow');

  const filteredIncome = selected === 'all' ? payments : payments.filter((p) => monthKey(p.date) === selected);
  const filteredExpense = selected === 'all' ? expenses : expenses.filter((e) => monthKey(e.date) === selected);

  const totalIncome = filteredIncome.reduce((s, p) => s + Number(p.paid || 0), 0);
  const totalExpense = filteredExpense.reduce((s, e) => s + expenseAmount(e), 0);
  const net = totalIncome - totalExpense;

  const students = await store.list('students');
  const studentName = (id) => (students.find((s) => s.id === id) || {}).name || '-';

  // Gabung jadi 1 daftar transaksi, urut terbaru dulu
  const transactions = [
    ...filteredIncome.filter((p) => Number(p.paid || 0) > 0).map((p) => ({
      date: p.paidDate || p.date, type: 'masuk',
      label: `Pembayaran les — ${studentName(p.studentId)}`,
      detail: p.period || '-', amount: Number(p.paid || 0)
    })),
    ...filteredExpense.map((e) => ({
      date: e.date, type: 'keluar',
      label: e.itemName || 'Pengeluaran',
      detail: e.note || '-', amount: expenseAmount(e)
    }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const rows = transactions.map((t) => `<tr>
    <td>${fmtDate(t.date)}</td>
    <td><span class="badge ${t.type === 'masuk' ? 'ok' : 'danger'}">${t.type === 'masuk' ? '↓ Masuk' : '↑ Keluar'}</span></td>
    <td><b>${escapeHtml(t.label)}</b><div class="subtle">${escapeHtml(t.detail)}</div></td>
    <td class="nowrap" style="text-align:right"><b style="color:${t.type === 'masuk' ? 'var(--success)' : 'var(--danger)'}">${t.type === 'masuk' ? '+' : '-'} ${rupiah(t.amount)}</b></td>
  </tr>`).join('');

  section.innerHTML = `
    <div class="card">
      <div class="cardHeader">
        <div><h2>Cashflow</h2><p>Rekap uang masuk dan keluar lembaga kamu.</p></div>
        <select id="cashflowMonth" onchange="window.__lesku_renderCashflow()">
          <option value="all" ${selected === 'all' ? 'selected' : ''}>Semua Bulan</option>
          ${months.map((m) => `<option value="${m}" ${selected === m ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}
        </select>
      </div>
      <div class="grid kpi" style="margin-bottom:18px">
        <div class="card kpiCard"><div class="kpiIcon">💰</div><div class="kpiLabel">Uang Masuk</div><div class="kpiValue" style="color:var(--success)">${rupiah(totalIncome)}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">🧾</div><div class="kpiLabel">Uang Keluar</div><div class="kpiValue" style="color:var(--danger)">${rupiah(totalExpense)}</div></div>
        <div class="card kpiCard"><div class="kpiIcon">📈</div><div class="kpiLabel">Selisih (Bersih)</div><div class="kpiValue">${rupiah(net)}</div></div>
      </div>
      <div class="cardHeader"><div><h3>Riwayat Transaksi</h3></div>
        <button class="btn soft" onclick="window.__lesku_showPage('expenses')">＋ Catat Pengeluaran</button>
      </div>
      <div class="tableWrap"><table>
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th style="text-align:right">Nominal</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4"><div class="empty">Belum ada transaksi pada periode ini.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

window.__lesku_renderCashflow = renderCashflow;
