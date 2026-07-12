// ============================================================
// APP.JS
// Router sederhana: bangun menu sidebar & pindah antar halaman.
// Ini pengganti showPage()/renderPage() di prototype lama, tapi
// sekarang setiap halaman adalah modul terpisah (lihat import di bawah).
// ============================================================
import { pages, CUSTOM_PAGES, schemas } from './lib/schemas.js';
import { byId } from './lib/utils.js';
import { renderCrudPage } from './lib/crud.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMonthlyRecap } from './pages/monthlyRecap.js';
import { renderSettings } from './pages/settings.js';
import { renderAttendance } from './pages/attendance.js';
import { renderInvoice } from './pages/invoice.js';
import { renderReports } from './pages/reports.js';
import { renderDocuments } from './pages/documents.js';

let currentPage = 'dashboard';

const CUSTOM_RENDERERS = {
  dashboard: renderDashboard,
  monthlyRecap: renderMonthlyRecap,
  settings: renderSettings,
  attendance: renderAttendance,
  invoice: renderInvoice,
  reports: renderReports,
  documents: renderDocuments
};

export function buildNav() {
  byId('nav').innerHTML = pages
    .map((p) => `<button id="nav_${p[0]}" onclick="window.__lesku_showPage('${p[0]}')"><span class="ico">${p[2]}</span><span>${p[1]}</span></button>`)
    .join('');
}

export async function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  const el = byId(page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('active'));
  const navBtn = byId('nav_' + page);
  if (navBtn) navBtn.classList.add('active');

  const meta = pages.find((p) => p[0] === page) || pages[0];
  byId('pageTitle').textContent = meta[1];
  byId('pageSubtitle').textContent = meta[3];
  byId('sidebar').classList.remove('open');

  if (CUSTOM_PAGES.has(page)) {
    await CUSTOM_RENDERERS[page]();
  } else if (schemas[page]) {
    await renderCrudPage(page);
  }
}

window.__lesku_showPage = showPage;
