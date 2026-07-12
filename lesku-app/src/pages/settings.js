// ============================================================
// PAGES/SETTINGS.JS
// Profil lembaga, tema, dan backup data (hanya relevan untuk
// Mode Demo - saat Mode Live, backup sebenarnya sudah otomatis
// aman di Supabase, tombol backup tetap disediakan sebagai lapisan ekstra).
// ============================================================
import { byId, escapeHtml, toast } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import { getLicenseStatus, LICENSE_STATUS } from '../lib/license.js';

export async function renderSettings() {
  const section = byId('settings');
  const set = await store.getSettings();
  const isDemo = getLicenseStatus() !== LICENSE_STATUS.ACTIVE;

  section.innerHTML = `
    <div class="grid two">
      <div class="card solid">
        <div class="cardHeader"><div><h2>Profil Lembaga</h2><p>Identitas ini tampil di app, invoice, rapor, dan semua dokumen.</p></div></div>
        <div class="grid forms">
          <div class="field"><label>Nama Lembaga</label><input id="setInstitution" value="${escapeHtml(set.institutionName || '')}"></div>
          <div class="field"><label>Nama Guru</label><input id="setTeacher" value="${escapeHtml(set.teacherName || '')}"></div>
          <div class="field"><label>Nomor HP Lembaga</label><input id="setPhone" value="${escapeHtml(set.phone || '')}"></div>
          <div class="field" style="grid-column:1/-1"><label>Alamat</label><textarea id="setAddress">${escapeHtml(set.address || '')}</textarea></div>
        </div>
        <div style="margin-top:16px"><button class="btn primary" onclick="window.__lesku_saveSettings()">Simpan Profil</button></div>
      </div>
      <div class="card">
        <div class="cardHeader"><div><h2>Status Aplikasi</h2></div></div>
        ${isDemo
          ? `<div class="badge warn" style="margin-bottom:10px">Mode Demo</div><p class="muted">Data saat ini tersimpan sementara di perangkat ini. Hubungi admin Hasilin untuk aktivasi Mode Live (data tersimpan aman di server).</p>`
          : `<div class="badge ok" style="margin-bottom:10px">Mode Live — Aktif</div><p class="muted">Data lembaga kamu tersimpan aman di server.</p>`
        }
        ${isDemo ? `<div class="divider"></div><div class="miniList">
          <button class="btn soft" onclick="window.__lesku_exportBackup()">Download Backup Data (Demo)</button>
          <button class="btn danger" onclick="window.__lesku_resetDemo()">Reset Data Demo</button>
        </div>` : ''}
      </div>
    </div>`;
}

window.__lesku_saveSettings = async function () {
  await store.updateSettings({
    institutionName: byId('setInstitution').value,
    teacherName: byId('setTeacher').value,
    phone: byId('setPhone').value,
    address: byId('setAddress').value
  });
  toast('Profil lembaga tersimpan.');
};

window.__lesku_exportBackup = function () {
  const a = document.createElement('a');
  a.download = 'lesku-demo-backup.json';
  a.href = URL.createObjectURL(new Blob([store.exportDemoBackup()], { type: 'application/json' }));
  a.click();
  URL.revokeObjectURL(a.href);
};

window.__lesku_resetDemo = function () {
  if (!confirm('Reset ke data contoh? Data demo saat ini akan diganti.')) return;
  store.resetDemoData();
  toast('Data demo dimuat ulang.');
  window.__lesku_showPage('dashboard');
};
