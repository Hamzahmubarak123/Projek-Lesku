// ============================================================
// EXPORTUTILS.JS
// Export dokumen ke PNG/PDF & print. Dulu html2canvas & jsPDF
// dimuat dari CDN (script tag), sekarang jadi npm package biasa
// - lebih stabil (tidak tergantung internet CDN saat runtime)
// dan otomatis ikut ter-bundle rapi oleh Vite.
// ============================================================
import { byId, toast } from './utils.js';

// html2canvas & jsPDF di-load LAZY (baru diambil pas dibutuhkan), bukan
// dibundel di awal - karena ukurannya lumayan besar (~600KB) dan cuma
// dipakai di 3 halaman (Invoice, Reports, Documents), bukan di semua halaman.
// Ini bikin loading awal app jauh lebih cepat, terutama buat koneksi HP.
async function loadHtml2Canvas() {
  const mod = await import('html2canvas');
  return mod.default;
}
async function loadJsPDF() {
  const mod = await import('jspdf');
  return mod.jsPDF;
}

export async function exportElementPNG(elementId, filename) {
  const el = byId(elementId);
  if (!el) return toast('Dokumen belum tersedia.');
  toast('Menyiapkan file...');
  const html2canvas = await loadHtml2Canvas();
  const target = el.querySelector('.docPaper,.invoicePreview,.officialReport') || el;
  const oldTransform = target.style.transform;
  target.style.transform = 'none';
  const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true });
  target.style.transform = oldTransform;
  const a = document.createElement('a');
  a.download = filename || 'dokumen-lesku.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export async function exportElementPDF(elementId, filename, orientation = 'p') {
  const el = byId(elementId);
  if (!el) return toast('Dokumen belum tersedia.');
  toast('Menyiapkan file...');
  const [html2canvas, jsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPDF()]);
  const target = el.querySelector('.docPaper,.invoicePreview,.officialReport') || el;
  const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true });
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageW = orientation === 'l' ? 297 : 210;
  const pageH = orientation === 'l' ? 210 : 297;
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio, h = canvas.height * ratio;
  pdf.addImage(img, 'PNG', (pageW - w) / 2, 0, w, h);
  pdf.save(filename || 'dokumen-lesku.pdf');
}

export function printElement(sectionId) {
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('printTarget'));
  const el = byId(sectionId);
  if (el) el.classList.add('printTarget');
  window.print();
}

/** Print di jendela baru (dipakai Pusat Dokumen supaya style dokumen tetap dipakai) */
export function printInNewWindow(innerHTML, themeAttr) {
  const w = window.open('', '_blank');
  const styles = [...document.querySelectorAll('link[rel=stylesheet], style')].map((n) => n.outerHTML).join('');
  w.document.write(`<html><head><title>Print Dokumen</title>${styles}</head><body data-theme="${themeAttr}">${innerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
