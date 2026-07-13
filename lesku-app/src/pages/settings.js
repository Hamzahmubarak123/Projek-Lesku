// ============================================================
// PAGES/SETTINGS.JS
// Profil lembaga, TEMA WARNA (preview + kunci), UPLOAD LOGO,
// preview branding dokumen, dan backup data (Mode Demo).
// ============================================================
import { byId, escapeHtml, toast } from '../lib/utils.js';
import * as store from '../lib/dataStore.js';
import { getLicenseStatus, LICENSE_STATUS } from '../lib/license.js';
import { THEME_OPTIONS, applyTheme, themeColor } from '../lib/theme.js';
import { brandedDocHeader, docFooter } from '../lib/docTemplates.js';

export async function renderSettings() {
  const section = byId('settings');
  const set = await store.getSettings();
  const isDemo = getLicenseStatus() !== LICENSE_STATUS.ACTIVE;
  const theme = set.theme || 'yellow';
  const locked = !!set.themeLocked;

  section.innerHTML = `
    <div class="grid two">
      <div class="card solid">
        <div class="cardHeader"><div><h2>Profil Lembaga</h2><p>Identitas ini tampil di app, invoice, rapor, dan semua dokumen.</p></div></div>
        <div class="grid forms">
          <div class="field"><label>Nama Lembaga</label><input id="setInstitution" value="${escapeHtml(set.institutionName || '')}"></div>
          <div class="field"><label>Nama Guru</label><input id="setTeacher" value="${escapeHtml(set.teacherName || '')}"></div>
          <div class="field"><label>Nomor HP Lembaga</label><input id="setPhone" value="${escapeHtml(set.phone || '')}"></div>
          <div class="field"><label>Logo Lembaga</label><input id="setLogo" type="file" accept="image/*"><small>Logo otomatis tampil di sidebar, invoice, rapor, laporan, dan dokumen.</small></div>
          <div class="field" style="grid-column:1/-1"><label>Alamat</label><textarea id="setAddress">${escapeHtml(set.address || '')}</textarea></div>
          <div class="field" style="grid-column:1/-1"><label>Catatan Invoice</label><textarea id="setInvoiceNote">${escapeHtml(set.invoiceNote || '')}</textarea></div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn primary" onclick="window.__lesku_saveSettings()">Simpan Profil</button>
          <button class="btn soft" onclick="window.__lesku_showPage('documents')">Buka Pusat Dokumen</button>
        </div>
      </div>

      <div class="card">
        <div class="cardHeader"><div><h2>Tema Warna</h2><p>Pilih tema, preview dulu, lalu simpan dan kunci agar tidak berubah tanpa sengaja.</p></div>${locked ? '<span class="themeLocked">🔒 Tema Terkunci</span>' : '<span class="badge warn">Belum Dikunci</span>'}</div>
        <div class="field"><label>Pilihan Tema</label>
          <select id="setTheme" ${locked ? 'disabled' : ''} onchange="window.__lesku_previewTheme()">
            ${THEME_OPTIONS.map((t) => `<option value="${t[0]}" ${t[0] === theme ? 'selected' : ''}>${t[1]}</option>`).join('')}
          </select>
        </div>
        <div class="themePreviewGrid" style="margin-top:12px">
          ${THEME_OPTIONS.map((t) => `<div class="themePreviewCard ${theme === t[0] ? 'active' : ''}" onclick="window.__lesku_selectThemePreview('${t[0]}')">
            <div class="themeDots"><span style="background:${t[2]}"></span><span style="background:${t[3]}"></span><span style="background:${t[4]}"></span></div>
            <b>${t[1]}</b><p class="muted" style="margin:4px 0 0;font-size:12px">Klik untuk preview</p>
          </div>`).join('')}
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn soft" onclick="window.__lesku_previewTheme()" ${locked ? 'disabled' : ''}>Preview Tema</button>
          <button class="btn primary" onclick="window.__lesku_saveThemeLock()" ${locked ? 'disabled' : ''}>Simpan & Kunci Tema</button>
          <button class="btn" onclick="window.__lesku_unlockTheme()" ${locked ? '' : 'disabled'}>Buka Kunci</button>
        </div>
      </div>
    </div>

    <div class="grid two" style="margin-top:16px">
      <div class="card">
        <div class="cardHeader"><div><h2>Preview Branding</h2><p>Contoh tampilan header dokumen dengan logo dan nama lembaga.</p></div></div>
        <div class="docPreviewShell"><div class="docPaper" style="width:100%;min-height:280px;padding-bottom:58px">
          ${brandedDocHeader(set, 'CONTOH DOKUMEN', 'Preview lembaga')}
          <div class="docSection docBox"><b>${escapeHtml(set.institutionName || 'Nama Lembaga Les')}</b><p>Identitas lembaga akan tampil dominan, sementara LesKu powered by Hasilin tampil kecil sebagai platform.</p></div>
          ${docFooter()}
        </div></div>
      </div>

      <div class="card">
        <div class="cardHeader"><div><h2>Status Aplikasi & Backup</h2></div></div>
        ${isDemo
          ? `<div class="badge warn" style="margin-bottom:10px">Mode Demo</div><p class="muted">Data saat ini tersimpan sementara di perangkat ini. Hubungi admin Hasilin untuk aktivasi Mode Live (data tersimpan aman di server).</p>`
          : `<div class="badge ok" style="margin-bottom:10px">Mode Live — Aktif</div><p class="muted">Data lembaga kamu tersimpan aman di server.</p>`
        }
        <div class="divider"></div>
        <div class="miniList">
          ${isDemo ? `
            <button class="btn soft" onclick="window.__lesku_exportBackup()">Download Backup Data (Demo)</button>
            <button class="btn danger" onclick="window.__lesku_resetDemo()">Reset Data Demo</button>
          ` : ''}
          <button class="btn" onclick="window.__lesku_downloadSampleCSV()">Download Template Struktur Data (CSV)</button>
        </div>
      </div>
    </div>`;
}

// ---------- Profil & Logo ----------
window.__lesku_saveSettings = async function () {
  const fileInput = byId('setLogo');
  const file = fileInput?.files?.[0];

  const basePatch = {
    institutionName: byId('setInstitution').value || 'Nama Lembaga Les',
    teacherName: byId('setTeacher').value || 'Nama Guru',
    phone: byId('setPhone').value,
    address: byId('setAddress').value,
    invoiceNote: byId('setInvoiceNote').value
  };

  const applyAndSave = async (logoData) => {
    const patch = logoData !== undefined ? { ...basePatch, logoData } : basePatch;
    const updated = await store.updateSettings(patch);
    applyTheme(updated);
    toast('Profil lembaga tersimpan.');
    await renderSettings();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => applyAndSave(e.target.result);
    reader.readAsDataURL(file);
  } else {
    await applyAndSave(undefined);
  }
};

// ---------- Tema ----------
window.__lesku_selectThemePreview = async function (theme) {
  const set = await store.getSettings();
  if (set.themeLocked) return toast('Tema sedang terkunci. Buka kunci dulu untuk mengganti.');
  const select = byId('setTheme');
  if (select) select.value = theme;
  window.__lesku_previewTheme();
};

window.__lesku_previewTheme = async function () {
  const set = await store.getSettings();
  if (set.themeLocked) return toast('Tema sedang terkunci.');
  const t = byId('setTheme')?.value || 'yellow';
  document.body.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themeColor(t);
  toast('Preview tema diterapkan. Klik "Simpan & Kunci Tema" untuk mengunci.');
};

window.__lesku_saveThemeLock = async function () {
  const t = byId('setTheme')?.value || 'yellow';
  const updated = await store.updateSettings({ theme: t, themeLocked: true });
  applyTheme(updated);
  toast('Tema disimpan dan dikunci.');
  await renderSettings();
};

window.__lesku_unlockTheme = async function () {
  const updated = await store.updateSettings({ themeLocked: false });
  applyTheme(updated);
  toast('Kunci tema dibuka.');
  await renderSettings();
};

// ---------- Backup (Mode Demo) ----------
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

window.__lesku_downloadSampleCSV = function () {
  const csv = 'Sheet,Kolom Utama\nSISWA,"id,nama,tanggal_lahir,nama_orang_tua,wa_orang_tua,status,catatan"\nKELAS,"id,nama_kelas,tipe,program,guru,jadwal_tetap,kapasitas,status"\nJADWAL,"id,tanggal,jam_mulai,jam_selesai,id_kelas,id_siswa,materi,status"\nABSENSI,"id,tanggal,id_kelas,id_siswa,pertemuan_ke,status,catatan"\nPEMBELAJARAN,"id,tanggal,id_kelas,id_siswa,materi,membaca,menulis,berhitung,fokus,sikap,pr,catatan_ortu"\nPENILAIAN,"id,tanggal,id_kelas,id_siswa,nilai_membaca,nilai_menulis,nilai_berhitung,nilai_fokus,nilai_mandiri,level,bintang,catatan"\nPEMBAYARAN,"id,no_invoice,tanggal,id_siswa,id_kelas,periode,jenis_paket,nominal,dibayar,metode,jatuh_tempo,status,catatan"';
  const a = document.createElement('a');
  a.download = 'lesku-struktur-data.csv';
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.click();
  URL.revokeObjectURL(a.href);
};
