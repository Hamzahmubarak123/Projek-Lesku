// ============================================================
// PAGES/LOGIN.JS
// Layar gerbang masuk sebelum app kebuka. Cuma muncul kalau
// License Server sudah dikonfigurasi (Mode Live) - Mode Demo
// tidak lewat sini sama sekali.
// ============================================================
import { loginWithPassword, LICENSE_STATUS } from '../lib/license.js';

export function renderLoginScreen(root, onSuccess) {
  root.innerHTML = `
    <div class="blockedScreen">
      <div class="card solid" style="max-width:380px;width:100%">
        <div style="text-align:center;margin-bottom:18px">
          <div class="brandLogo" style="margin:0 auto 12px">LK</div>
          <b style="font-size:20px">Masuk ke LesKu</b>
          <p class="muted" style="margin-top:4px">Powered by Hasilin</p>
        </div>
        <div class="grid" style="gap:12px">
          <div class="field"><label>Email</label><input id="loginEmail" type="email" placeholder="email@contoh.com"></div>
          <div class="field"><label>Password</label><input id="loginPassword" type="password" placeholder="Password"></div>
          <div id="loginError" class="badge danger" style="display:none"></div>
          <button class="btn primary" id="loginSubmitBtn" style="width:100%">Masuk</button>
        </div>
      </div>
    </div>`;

  const submit = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errBox = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmitBtn');

    errBox.style.display = 'none';
    if (!email || !password) {
      errBox.textContent = 'Email dan password wajib diisi.';
      errBox.style.display = 'inline-flex';
      return;
    }

    btn.textContent = 'Memeriksa...';
    btn.disabled = true;
    const result = await loginWithPassword(email, password);
    btn.textContent = 'Masuk';
    btn.disabled = false;

    if (result.status === LICENSE_STATUS.ACTIVE) {
      onSuccess();
      return;
    }

    errBox.textContent = result.message || 'Akses ditolak.';
    errBox.style.display = 'inline-flex';
  };

  document.getElementById('loginSubmitBtn').addEventListener('click', submit);
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}
