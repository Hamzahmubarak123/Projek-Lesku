// ============================================================
// PAGES/INVOICE.JS
// Pilih tagihan, preview invoice, print/download/kirim WhatsApp.
// ============================================================
import { byId, escapeHtml, rupiah, fmtDate, waLink } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import { invoiceHTML } from '../lib/docTemplates.js';
import { exportElementPNG, exportElementPDF, printElement } from '../lib/exportUtils.js';

export async function renderInvoice() {
  const section = byId('invoice');
  const payments = await store.list('payments');
  const incomePayments = payments.filter((p) => (p.type || 'Pemasukan') === 'Pemasukan');
  const students = await store.list('students');
  const studentName = (id) => (students.find((s) => s.id === id) || {}).name || '-';

  const options = incomePayments.map((p) => `<option value="${p.id}">${escapeHtml(p.invoiceNo || p.id)} — ${escapeHtml(studentName(p.studentId))} — ${rupiah(p.amount)}</option>`).join('');
  const selected = (incomePayments[0] || {}).id || '';

  section.innerHTML = `<div class="card solid">
    <div class="cardHeader"><div><h2>Invoice Pembayaran</h2><p>Pilih tagihan, cetak invoice, download, atau kirim ke WhatsApp orang tua.</p></div><button class="btn primary" onclick="window.__lesku_showPage('payments')">Kelola Pembayaran</button></div>
    <div class="grid forms">
      <div class="field"><label>Pilih Invoice</label><select id="invoiceSelect" onchange="window.__lesku_renderInvoicePreview(this.value)">${options}</select></div>
      <div style="display:flex;align-items:end;gap:10px;flex-wrap:wrap">
        <button class="btn soft" onclick="window.__lesku_printInvoice()">Print</button>
        <button class="btn soft" onclick="window.__lesku_downloadInvoicePNG()">Download PNG</button>
        <button class="btn soft" onclick="window.__lesku_downloadInvoicePDF()">Download PDF</button>
        <button class="btn primary" onclick="window.__lesku_sendInvoiceWA()">Kirim WhatsApp</button>
      </div>
    </div>
    <div class="divider"></div>
    <div id="invoicePreviewBox"><div class="empty">Memuat...</div></div>
  </div>`;

  await renderPreview(selected);
}

async function renderPreview(id) {
  const payments = await store.list('payments');
  const p = payments.find((x) => x.id === id) || payments.find((x) => (x.type || 'Pemasukan') === 'Pemasukan');
  byId('invoicePreviewBox').innerHTML = p ? await invoiceHTML(p) : `<div class="empty">Belum ada data pembayaran.</div>`;
}

async function selectedPayment() {
  const id = byId('invoiceSelect')?.value;
  const payments = await store.list('payments');
  return payments.find((x) => x.id === id) || payments[0];
}

window.__lesku_renderInvoicePreview = renderPreview;
window.__lesku_printInvoice = () => printElement('invoice');
window.__lesku_downloadInvoicePNG = async () => {
  const p = await selectedPayment();
  if (p) exportElementPNG('invoicePreviewBox', (p.invoiceNo || 'invoice') + '.png');
};
window.__lesku_downloadInvoicePDF = async () => {
  const p = await selectedPayment();
  if (p) exportElementPDF('invoicePreviewBox', (p.invoiceNo || 'invoice') + '.pdf', 'p');
};
window.__lesku_sendInvoiceWA = async () => {
  const p = await selectedPayment();
  if (!p) return;
  const students = await store.list('students');
  const settings = await store.getSettings();
  const s = students.find((x) => x.id === p.studentId) || {};
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut invoice pembayaran les ${settings.institutionName || 'LesKu'} untuk Ananda ${s.name || ''}.\n\nNomor Invoice: ${p.invoiceNo || '-'}\nPeriode: ${p.period || '-'}\nTagihan: ${rupiah(p.amount)}\nSudah dibayar: ${rupiah(p.paid)}\nSisa: ${rupiah(Number(p.amount || 0) - Number(p.paid || 0))}\nStatus: ${p.status || '-'}\nJatuh tempo: ${fmtDate(p.dueDate)}\n\nTerima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};

/** Dipanggil dari tombol "Lihat Invoice" di tabel Pembayaran (lib/crud.js) */
window.__lesku_previewInvoiceFor = async (id) => {
  await window.__lesku_showPage('invoice');
  setTimeout(async () => {
    if (byId('invoiceSelect')) { byId('invoiceSelect').value = id; await renderPreview(id); }
  }, 80);
};
