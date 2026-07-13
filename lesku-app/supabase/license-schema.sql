-- ============================================================
-- LICENSE-SCHEMA.SQL
-- Jalankan HANYA SEKALI, di 1 Supabase project TERPISAH yang
-- kamu (Mubarak) pegang sendiri sebagai "License Server".
-- Project ini TIDAK PERNAH menyimpan data siswa/klien - isinya
-- cuma status lisensi + LOGIN GATE tiap instalasi LesKu.
--
-- Sistem ini sekaligus jadi "gerbang login": guru masuk pakai
-- email+password yang tersimpan di Supabase Auth PROJECT INI,
-- bukan di Supabase milik klien.
-- ============================================================

create table clients (
  id uuid primary key default gen_random_uuid(),
  nama_guru text not null,
  nama_lembaga text,
  email text,
  no_wa text,
  tanggal_daftar timestamptz default now()
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,  -- akun login guru (dibuat di Authentication > Users)
  status text not null default 'demo',    -- 'demo' | 'active' | 'blocked'
  supabase_project_url text,              -- diisi saat provisioning (status jadi 'active')
  supabase_anon_key text,
  tanggal_lunas date,
  catatan text,
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Guru yang login HANYA boleh lihat baris lisensi MILIKNYA SENDIRI
-- (dicocokkan lewat user_id = akun yang sedang login). Tidak ada
-- siapa pun (termasuk guru lain) yang bisa lihat data klien lain.
-- ============================================================
alter table licenses enable row level security;
create policy "User hanya bisa lihat lisensi miliknya sendiri" on licenses
  for select using (auth.uid() = user_id);

-- Insert/update/delete licenses HANYA lewat dashboard Supabase kamu
-- sendiri (sebagai admin), sengaja TIDAK ada policy untuk itu di sini
-- supaya guru tidak bisa ubah statusnya sendiri lewat aplikasi.

-- ============================================================
-- CARA PROVISIONING KLIEN BARU (dari dashboard Supabase kamu):
-- ============================================================
-- 1. Authentication > Users > Add user
--    - Email: email guru
--    - Password: buatkan password, simpan di password manager
--    - Centang "Auto Confirm User"
--    - Setelah dibuat, COPY User UID-nya (dibutuhkan di langkah 3)
--
-- 2. Table Editor > clients > Insert row
--    - nama_guru, nama_lembaga, email, no_wa
--
-- 3. Table Editor > licenses > Insert row
--    - client_id: pilih dari langkah 2
--    - user_id: paste User UID dari langkah 1
--    - status: 'active' (kalau sudah lunas) atau 'demo' (kalau masih trial)
--    - supabase_project_url & supabase_anon_key: dari project Supabase KLIEN
--      (Settings > API di project klien tersebut)
--
-- Kalau perlu blokir suatu saat: tinggal ubah kolom "status" jadi 'blocked'
-- di baris lisensi klien itu - guru langsung tidak bisa login lagi.
-- ============================================================
