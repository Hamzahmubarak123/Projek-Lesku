// ============================================================
// PAGES/DOCUMENTS.JS
// Pusat Dokumen: pilih jenis dokumen, preview, lalu download
// PNG/PDF/print/kirim WA. Menggabungkan semua template di
// lib/docTemplates.js jadi satu pusat kendali.
// ============================================================
import { byId, escapeHtml, todayISO, safeFileName, waLink } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import {
  documentInvoiceHTML, documentReportHTML, documentAttendanceSheetHTML, documentLedgerHTML
} from '../lib/docTemplates.js';
import { exportElementPNG, exportElementPDF, printInNewWindow } from '../lib/exportUtils.js';

const DOC_TYPES = ['Invoice Pembayaran', 'Laporan Harian', 'Laporan Bulanan', 'Rapor Akhir Periode', 'Lembar Absensi Kelas', 'Legger Absensi Bulanan'];
const statusCode = (st) => ({ Hadir: 'H', Izin: 'I', Sakit: 'S', Alpha: 'A', Terlambat: 'T', Reschedule: 'R' }[st] || '-');

async function classOptionsHtml(selected = '') {
  const classes = await store.list('classes');
  return `<option value="">Semua Siswa Aktif</option>${classes.filter((c) => c.status !== 'Nonaktif').map((c) => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}`;
}

async function getClassStudents(classId) {
  const [students, enrollments] = await Promise.all([store.list('students'), store.list('enrollments')]);
  let ids = classId ? enrollments.filter((e) => e.classId === classId && e.status !== 'Berhenti').map((e) => e.studentId) : [];
  if (!ids.length) ids = students.filter((s) => s.status !== 'Nonaktif').map((s) => s.id);
  ids = [...new Set(ids)];
  return ids.map((id) => students.find((s) => s.id === id)).filter(Boolean);
}

export async function renderDocuments() {
  const section = byId('documents');
  const [students, classes, payments] = await Promise.all([store.list('students'), store.list('classes'), store.list('payments')]);
  const incomePayments = payments.filter((p) => (p.type || 'Pemasukan') === 'Pemasukan');
  const firstStudent = students[0]?.id || '', firstClass = classes[0]?.id || '', firstPayment = incomePayments[0]?.id || '';

  section.innerHTML = `<div class="card solid">
    <div class="cardHeader"><div><h2>Pusat Dokumen</h2><p>Siapkan dokumen lembaga dalam format profesional untuk PNG, PDF, print, dan WhatsApp.</p></div><span class="badge">Template Lembaga</span></div>
    <div class="grid forms">
      <div class="field"><label>Jenis Dokumen</label><select id="docType" onchange="window.__lesku_refreshDocControls();window.__lesku_renderDocPreview()">${DOC_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Siswa</label><select id="docStudent" onchange="window.__lesku_renderDocPreview()">${students.map((s) => `<option value="${s.id}" ${s.id === firstStudent ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice</label><select id="docPayment" onchange="window.__lesku_renderDocPreview()">${incomePayments.map((p) => `<option value="${p.id}" ${p.id === firstPayment ? 'selected' : ''}>${escapeHtml(p.invoiceNo || p.id)}</option>`).join('')}</select></div>
      <div class="field"><label>Kelas / Program</label><select id="docClass" onchange="window.__lesku_renderDocPreview()">${await classOptionsHtml(firstClass)}</select></div>
      <div class="field"><label>Tanggal / Awal Periode</label><input id="docStart" type="date" value="${todayISO()}" onchange="window.__lesku_renderDocPreview()"></div>
      <div class="field"><label>Akhir Periode</label><input id="docEnd" type="date" value="${todayISO()}" onchange="window.__lesku_renderDocPreview()"></div>
      <div class="field"><label>Bulan Legger</label><input id="docMonth" type="month" value="${todayISO().slice(0, 7)}" onchange="window.__lesku_renderDocPreview()"></div>
      <div class="field"><label>Pertemuan Ke</label><input id="docSession" type="number" min="1" value="1" onchange="window.__lesku_renderDocPreview()"></div>
    </div>
    <div class="docActions" style="margin-top:16px">
      <button class="btn primary" onclick="window.__lesku_renderDocPreview()">Preview</button>
      <button class="btn soft" onclick="window.__lesku_downloadDocPNG()">Download PNG</button>
      <button class="btn soft" onclick="window.__lesku_downloadDocPDF()">Download PDF</button>
      <button class="btn soft" onclick="window.__lesku_printDocCenter()">Print</button>
      <button class="btn primary" onclick="window.__lesku_sendDocWA()">Kirim WhatsApp</button>
    </div>
    <div class="divider"></div>
    <div id="docControlsNote" class="miniDocNote">Pilih jenis dokumen lalu tekan Preview.</div>
    <div class="docPreviewShell" style="margin-top:14px"><div id="documentPreviewBox"></div></div>
  </div>`;

  await refreshDocControls();
  await renderDocPreview();
}

async function refreshDocControls() {
  const t = byId('docType')?.value || '';
  const invoice = byId('docPayment'), cls = byId('docClass'), student = byId('docStudent');
  if (invoice) invoice.closest('.field').style.display = t === 'Invoice Pembayaran' ? 'block' : 'none';
  if (student) student.closest('.field').style.display = ['Laporan Harian', 'Laporan Bulanan', 'Rapor Akhir Periode'].includes(t) ? 'block' : 'none';
  if (cls) cls.closest('.field').style.display = ['Lembar Absensi Kelas', 'Legger Absensi Bulanan'].includes(t) ? 'block' : 'none';
  const session = byId('docSession');
  if (session) session.closest('.field').style.display = t === 'Lembar Absensi Kelas' ? 'block' : 'none';
  const month = byId('docMonth');
  if (month) month.closest('.field').style.display = t === 'Legger Absensi Bulanan' ? 'block' : 'none';
  byId('docControlsNote').textContent = t.includes('Absensi') ? 'Dokumen absensi memakai format landscape agar tabel lebih mudah dibaca.' : 'Dokumen siswa memakai format portrait A4 dan siap dibagikan.';
}

async function buildDocumentHTML(t) {
  const start = byId('docStart')?.value || todayISO();
  const end = byId('docEnd')?.value || start;
  const month = byId('docMonth')?.value || todayISO().slice(0, 7);
  const classId = byId('docClass')?.value || '';
  const students = await store.list('students');
  const studentId = byId('docStudent')?.value || students[0]?.id;
  const payments = (await store.list('payments')).filter((p) => (p.type || 'Pemasukan') === 'Pemasukan');
  const payId = byId('docPayment')?.value || payments[0]?.id;
  const settings = await store.getSettings();

  if (t === 'Invoice Pembayaran') {
    const p = payments.find((x) => x.id === payId) || payments[0];
    return p ? documentInvoiceHTML(p) : '<div class="empty">Belum ada invoice.</div>';
  }
  if (t === 'Lembar Absensi Kelas') {
    const classStudents = await getClassStudents(classId);
    const attendanceRows = await store.list('attendance');
    return documentAttendanceSheetHTML(classId, start, Number(byId('docSession')?.value || 1), classStudents, attendanceRows, settings);
  }
  if (t === 'Legger Absensi Bulanan') {
    const classStudents = await getClassStudents(classId);
    const attendanceRows = await store.list('attendance');
    return documentLedgerHTML(month, classStudents, attendanceRows, settings, statusCode);
  }
  return documentReportHTML(studentId, t, start, end);
}

async function renderDocPreview() {
  const t = byId('docType')?.value || 'Invoice Pembayaran';
  const box = byId('documentPreviewBox');
  if (!box) return;
  box.innerHTML = '<div class="empty">Memuat...</div>';
  box.innerHTML = await buildDocumentHTML(t);
}

window.__lesku_refreshDocControls = refreshDocControls;
window.__lesku_renderDocPreview = renderDocPreview;

window.__lesku_downloadDocPNG = () => {
  const t = byId('docType')?.value || 'dokumen';
  exportElementPNG('documentPreviewBox', safeFileName('lesku-' + t) + '.png');
};
window.__lesku_downloadDocPDF = () => {
  const t = byId('docType')?.value || 'dokumen';
  const landscape = ['Lembar Absensi Kelas', 'Legger Absensi Bulanan'].includes(t);
  exportElementPDF('documentPreviewBox', safeFileName('lesku-' + t) + '.pdf', landscape ? 'l' : 'p');
};
window.__lesku_printDocCenter = () => {
  printInNewWindow(byId('documentPreviewBox').innerHTML, document.body.dataset.theme);
};
window.__lesku_sendDocWA = async () => {
  const t = byId('docType')?.value || '';
  if (t === 'Invoice Pembayaran') {
    const payId = byId('docPayment')?.value;
    await window.__lesku_showPage('invoice');
    setTimeout(() => {
      if (byId('invoiceSelect')) { byId('invoiceSelect').value = payId; window.__lesku_renderInvoicePreview(payId); window.__lesku_sendInvoiceWA(); }
    }, 100);
    return;
  }
  const sid = byId('docStudent')?.value;
  const students = await store.list('students');
  const settings = await store.getSettings();
  const s = students.find((x) => x.id === sid) || {};
  if (!s.parentPhone) return window.__lesku_toast ? window.__lesku_toast('Nomor WhatsApp orang tua belum tersedia.') : alert('Nomor WhatsApp orang tua belum tersedia.');
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut ${t} dari ${settings.institutionName || 'Nama Lembaga Les'} untuk Ananda ${s.name || ''}. Dokumen PNG/PDF dapat dilampirkan setelah diunduh dari aplikasi. Terima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};
