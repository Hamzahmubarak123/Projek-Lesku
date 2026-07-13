// ============================================================
// THEME.JS
// Daftar tema warna & fungsi terapkan tema ke seluruh app (dipakai
// baik saat startup/main.js maupun saat ganti tema di Settings).
// ============================================================
export const THEME_OPTIONS = [
  ['yellow', 'Yellow Edu', '#F6C343', '#FFE08A', '#7DA66B'],
  ['sage', 'Calm Sage Green', '#4F9D69', '#A7D7C5', '#F2C94C'],
  ['blue', 'Sky Blue Clean', '#2563EB', '#93C5FD', '#22C55E'],
  ['lavender', 'Lavender Modern', '#7C3AED', '#C4B5FD', '#F59E0B'],
  ['peach', 'Soft Peach Edu', '#F97316', '#FDBA74', '#10B981'],
  ['rose', 'Rose Mint Soft', '#E11D48', '#FDA4AF', '#14B8A6']
];

export function themeColor(t) {
  return { yellow: '#F6C343', sage: '#4F9D69', blue: '#2563EB', lavender: '#7C3AED', peach: '#F97316', rose: '#E11D48' }[t] || '#F6C343';
}

/** Terapkan tema + logo ke seluruh tampilan app (body theme, meta tag, logo sidebar) */
export function applyTheme(settings) {
  const theme = settings?.theme || 'yellow';
  document.body.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themeColor(theme);
  const logo = document.getElementById('sideLogo');
  if (logo) logo.innerHTML = settings?.logoData ? `<img alt="Logo" src="${settings.logoData}">` : 'LK';
}
