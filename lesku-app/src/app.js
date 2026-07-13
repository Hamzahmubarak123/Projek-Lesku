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
import { renderCashflow } from './pages/cashflow.js';

let currentPage = 'dashboard';

const CUSTOM_RENDERERS = {
  dashboard: renderDashboard,
  monthlyRecap: renderMonthlyRecap,
  cashflow: renderCashflow,
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

  if (!el) {
    console.warn(`Halaman "${page}" tidak punya <section> di HTML shell (main.js). Cek main.js.`);
    return;
  }

  try {
    if (CUSTOM_PAGES.has(page)) {
      await CUSTOM_RENDERERS[page]();
    } else if (schemas[page]) {
      await renderCrudPage(page);
    }
  } catch (err) {
    console.error(`Gagal render halaman "${page}":`, err);
    el.innerHTML = `<div class="card"><div class="empty">
      Terjadi kesalahan saat memuat halaman ini.<br><span class="subtle">${(err.message || String(err)).replace(/</g, '&lt;')}</span><br><br>
      <button class="btn soft" onclick="window.__lesku_showPage('${page}')">Coba Lagi</button>
    </div></div>`;
  }
}

window.__lesku_showPage = showPage;
