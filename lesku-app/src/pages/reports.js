// ============================================================
// PAGES/REPORTS.JS
// Laporan harian, bulanan, dan rapor akhir periode per siswa.
// ============================================================
import { byId, escapeHtml, todayISO, waLink } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import { reportHTML } from '../lib/docTemplates.js';
import { exportElementPNG, exportElementPDF, printElement } from '../lib/exportUtils.js';

export async function renderReports() {
  const section = byId('reports');
  const students = await store.list('students');

  section.innerHTML = `<div class="card solid">
    <div class="cardHeader"><div><h2>Laporan & Rapor</h2><p>Buat laporan harian, bulanan, atau rapor akhir periode.</p></div></div>
    <div class="grid forms">
      <div class="field"><label>Siswa</label><select id="reportStudent" onchange="window.__lesku_generateReport()">${students.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Jenis Laporan</label><select id="reportType" onchange="window.__lesku_generateReport()"><option>Laporan Harian</option><option>Laporan Bulanan</option><option>Rapor Akhir Periode</option></select></div>
      <div class="field"><label>Tanggal / Awal Periode</label><input id="reportStart" type="date" value="${todayISO()}" onchange="window.__lesku_generateReport()"></div>
      <div class="field"><label>Akhir Periode</label><input id="reportEnd" type="date" value="${todayISO()}" onchange="window.__lesku_generateReport()"></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0">
      <button class="btn soft" onclick="window.__lesku_printReport()">Print</button>
      <button class="btn soft" onclick="window.__lesku_downloadReportPNG()">Download PNG</button>
      <button class="btn soft" onclick="window.__lesku_downloadReportPDF()">Download PDF</button>
      <button class="btn primary" onclick="window.__lesku_sendReportWA()">Kirim WhatsApp</button>
    </div>
    <div id="reportPreviewBox"><div class="empty">Memuat...</div></div>
  </div>`;

  await generateReport();
}

async function generateReport() {
  const sid = byId('reportStudent')?.value || (await store.list('students'))[0]?.id;
  const type = byId('reportType')?.value || 'Laporan Harian';
  const start = byId('reportStart')?.value || todayISO();
  const end = byId('reportEnd')?.value || start;
  byId('reportPreviewBox').innerHTML = await reportHTML(sid, type, start, end);
}

window.__lesku_generateReport = generateReport;
window.__lesku_printReport = () => printElement('reports');
window.__lesku_downloadReportPNG = async () => {
  const students = await store.list('students');
  const s = students.find((x) => x.id === byId('reportStudent')?.value) || {};
  exportElementPNG('reportPreviewBox', 'laporan-' + (s.name || 'siswa') + '.png');
};
window.__lesku_downloadReportPDF = async () => {
  const students = await store.list('students');
  const s = students.find((x) => x.id === byId('reportStudent')?.value) || {};
  exportElementPDF('reportPreviewBox', 'laporan-' + (s.name || 'siswa') + '.pdf', 'p');
};
window.__lesku_sendReportWA = async () => {
  const sid = byId('reportStudent')?.value;
  const students = await store.list('students');
  const s = students.find((x) => x.id === sid) || {};
  const type = byId('reportType')?.value;
  const start = byId('reportStart')?.value;
  const end = byId('reportEnd')?.value;
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut ${type} Ananda ${s.name || ''} periode ${start} - ${end}. Mohon dicek lampiran gambar/PDF-nya. Terima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};

/** Dipanggil dari halaman lain (mis. tombol "Lihat Rapor" di Siswa) */
window.__lesku_openStudentReport = async (id) => {
  await window.__lesku_showPage('reports');
  setTimeout(async () => {
    if (byId('reportStudent')) { byId('reportStudent').value = id; await generateReport(); }
  }, 80);
};
