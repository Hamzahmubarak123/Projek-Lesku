// ============================================================
// MAIN.JS
// Titik masuk aplikasi. Urutannya penting:
// 1. Cek lisensi dulu (demo / login_required / active / blocked)
// 2. Kalau login_required -> tampilkan layar Login, STOP sampai
//    login berhasil
// 3. Kalau blocked -> tampilkan halaman terkunci, STOP di sini
// 4. Kalau demo/active -> render app seperti biasa
// ============================================================
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/documents.css';

import { checkLicense, LICENSE_STATUS, logout } from './lib/license.js';
import { renderLoginScreen } from './pages/login.js';
import { buildNav, showPage } from './app.js';
import { applyTheme } from './lib/theme.js';
import * as store from './lib/dataStore.js';

async function init() {
  const root = document.getElementById('app-root');
  const { status, message } = await checkLicense();

  if (status === LICENSE_STATUS.LOGIN_REQUIRED) {
    renderLoginScreen(root, () => init());
    return; // STOP - tunggu sampai login berhasil, init() dipanggil ulang
  }

  if (status === LICENSE_STATUS.BLOCKED) {
    root.innerHTML = `
      <div class="blockedScreen">
        <div class="card">
          <h2>🔒 Akses Belum Aktif</h2>
          <p class="muted">${message || 'Akses aplikasi ini belum aktif. Silakan hubungi admin untuk mengaktifkan.'}</p>
        </div>
      </div>`;
    return; // STOP - jangan render app sama sekali
  }

  renderAppShell(root, status === LICENSE_STATUS.DEMO);

  buildNav();
  document.getElementById('hambBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  const settings = await store.getSettings();
  applyTheme(settings);

  await showPage('dashboard');
}

function renderAppShell(root, isDemo) {
  root.innerHTML = `
    ${isDemo ? `<div class="demoBanner">🧪 Mode Demo — data yang kamu input di sini bersifat sementara dan tersimpan di perangkat ini saja.</div>` : ''}
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brandLogo" id="sideLogo">LK</div>
          <div class="brandText"><b>LesKu</b><span>Powered by Hasilin</span></div>
        </div>
        <nav class="nav" id="nav"></nav>
        <div class="sidebarFooter">
          <b>${isDemo ? 'Mode Demo' : 'Mode Live'}</b><br>
          ${isDemo ? 'Coba semua fitur secara bebas. Hubungi admin untuk mengaktifkan versi penuh.' : 'Data tersimpan aman di server.'}
          ${!isDemo ? `<div style="margin-top:10px"><button class="btn small ghost" id="logoutBtn" style="width:100%">Keluar</button></div>` : ''}
        </div>
      </aside>
      <main class="main">
        <div class="topbar noPrint">
          <button class="btn hamb" id="hambBtn">☰</button>
          <div class="topTitle"><h1 id="pageTitle">Dashboard</h1><p id="pageSubtitle"></p></div>
          <div class="actions">
            <button class="btn soft" onclick="window.__lesku_showPage('attendance')">＋ Absensi</button>
            <button class="btn soft" onclick="window.__lesku_showPage('expenses')">＋ Pengeluaran</button>
            <button class="btn primary" onclick="window.__lesku_showPage('students')">Tambah Siswa</button>
          </div>
        </div>
        <section id="dashboard" class="section active"></section>
        <section id="students" class="section"></section>
        <section id="classes" class="section"></section>
        <section id="enrollments" class="section"></section>
        <section id="schedules" class="section"></section>
        <section id="attendance" class="section"></section>
        <section id="learning" class="section"></section>
        <section id="assessments" class="section"></section>
        <section id="payments" class="section"></section>
        <section id="expenses" class="section"></section>
        <section id="monthlyRecap" class="section"></section>
        <section id="cashflow" class="section"></section>
        <section id="invoice" class="section"></section>
        <section id="reports" class="section"></section>
        <section id="documents" class="section"></section>
        <section id="settings" class="section"></section>
      </main>
    </div>
    <div class="modalOverlay" id="modalOverlay">
      <div class="modal">
        <div class="modalHead"><h3 id="modalTitle">Form</h3><button class="btn small ghost" onclick="window.__lesku_closeModal()">✕</button></div>
        <div class="modalBody" id="modalBody"></div>
        <div class="modalFoot" id="modalFoot"></div>
      </div>
    </div>
    <div class="toast" id="toast"></div>`;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
}

init();
