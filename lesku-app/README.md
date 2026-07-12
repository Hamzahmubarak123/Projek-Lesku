# LesKu — Aplikasi Manajemen Lembaga Les

## Struktur Project (File Map)

```
lesku-app/
├── index.html                 shell HTML, hampir kosong (app di-render lewat JS)
├── package.json / vite.config.js   konfigurasi build
├── .env.example                template variabel lingkungan
│
├── src/
│   ├── main.js                 ENTRY POINT: cek lisensi -> render app
│   ├── app.js                  router: sidebar nav & pindah halaman
│   │
│   ├── styles/
│   │   ├── variables.css       warna & tema (edit di sini untuk ganti tema)
│   │   ├── layout.css          struktur sidebar/topbar/grid
│   │   ├── components.css      tombol, kartu, tabel, modal, dsb
│   │   └── documents.css       tampilan invoice/rapor/dokumen cetak
│   │
│   ├── lib/
│   │   ├── utils.js            fungsi bantu (format tanggal, rupiah, dsb)
│   │   ├── schemas.js          DEFINISI SEMUA ENTITAS DATA — edit di sini
│   │   │                       untuk nambah field/entitas baru
│   │   ├── supabaseClient.js   koneksi ke Supabase milik KLIEN
│   │   ├── license.js          cek status demo/active/blocked
│   │   ├── dataStore.js        lapisan akses data (auto switch Demo/Live)
│   │   └── crud.js             mesin tabel+form generik (7 halaman otomatis)
│   │
│   └── pages/
│       ├── dashboard.js        halaman ringkasan
│       ├── monthlyRecap.js     FITUR BARU: rekap bulanan
│       ├── settings.js         profil lembaga & backup
│       └── placeholder.js      halaman yang belum di-porting (lihat di bawah)
│
└── supabase/
    ├── schema.sql               jalankan di TIAP project Supabase klien
    └── license-schema.sql       jalankan SEKALI di License Server milikmu
```

## Status Migrasi dari Prototype Lama

✅ **Migrasi TUNTAS — semua fitur dari prototype lama sudah ada di sini:**
- Dashboard, Settings
- 7 halaman CRUD otomatis: Siswa, Kelas, Paket Les, Jadwal, Pembelajaran, Penilaian, Pembayaran
- Absensi versi grid interaktif (tap per siswa) + Legger Bulanan + Riwayat
- Invoice (generate + print/PNG/PDF + kirim WA)
- Reports/Rapor (narasi otomatis, harian/bulanan/akhir periode)
- Pusat Dokumen (export PNG/PDF, semua jenis dokumen dalam 1 tempat)
- Fitur baru: Rekap Bulanan (pemasukan/pengeluaran & status bayar)
- Sistem Demo Mode (localStorage) vs Live Mode (Supabase) — otomatis switch
- Sistem lisensi (demo / active / blocked)
- html2canvas & jsPDF di-lazy-load (bukan dibundel di awal) supaya loading app tetap ringan

## Cara Menjalankan di Komputer Kamu (Development)

```bash
npm install
cp .env.example .env
# isi .env dengan URL & anon key Supabase (boleh kosongkan dulu -> otomatis Mode Demo)
npm run dev
```

Buka `http://localhost:5173` — kalau `.env` kosong/`VITE_LICENSE_KEY=demo`, app otomatis jalan di **Mode Demo** (data dummy, localStorage).

## Cara Deploy ke Cloudflare Pages

1. Push folder ini ke GitHub
2. Di Cloudflare Pages: Connect ke repo, build command `npm run build`, output folder `dist`
3. Set environment variables (`VITE_LICENSE_SERVER_URL`, dst) di pengaturan Cloudflare Pages

## Cara Provisioning Klien Baru (setelah lunas)

1. Bikin Supabase project baru (pakai akunmu)
2. Jalankan `supabase/schema.sql` di SQL Editor project itu
3. Bikin 1 user di Authentication > Users (email guru klien)
4. Catat: Project URL & anon key (Settings > API)
5. Di License Server, update baris klien itu: `status='active'`, isi `supabase_project_url` & `supabase_anon_key`
6. Simpan semua kredensial di password manager kamu (Bitwarden/1Password)

## Kalau Mau Nambah Field/Entitas Baru

Cukup edit `src/lib/schemas.js` — tambahkan field ke entitas yang ada, atau tambah entitas baru + daftar di `pages`. Halaman tabel & form-nya otomatis mengikuti (lihat `src/lib/crud.js`), TIDAK perlu bikin file baru untuk itu.
