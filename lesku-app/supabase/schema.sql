-- ============================================================
-- SCHEMA.SQL
-- Jalankan file ini di Supabase SQL Editor SETIAP KALI provisioning
-- klien baru (1 project Supabase = 1 klien/guru).
--
-- CATATAN: akun login guru (email+password) dibuat di project
-- LICENSE SERVER (lihat license-schema.sql), BUKAN di project ini.
-- Project ini murni penyimpanan data (siswa, kelas, dst).
--
-- Setelah dijalankan, jangan lupa:
-- 1. Catat Project URL & anon key (Settings > API di project ini)
-- 2. Masukkan ke tabel `licenses` di License Server, sekaligus
--    buat akun login guru di sana (lihat langkah lengkap di
--    license-schema.sql)
-- ============================================================

create extension if not exists "pgcrypto";

create table students (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  dob date,
  parent_name text,
  parent_phone text,
  status text default 'Aktif',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table classes (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text,
  program text,
  teacher text,
  schedule_text text,
  capacity int,
  status text default 'Aktif',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table enrollments (
  id text primary key default gen_random_uuid()::text,
  student_id text references students(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  package_type text,
  price numeric,
  start_date date,
  end_date date,
  meetings_quota int,
  status text default 'Aktif',
  created_at timestamptz default now()
);

create table schedules (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  time_start time,
  time_end time,
  class_id text references classes(id) on delete set null,
  student_id text references students(id) on delete set null,
  topic text,
  status text default 'Terjadwal',
  created_at timestamptz default now()
);

create table attendance (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  class_id text references classes(id) on delete set null,
  student_id text references students(id) on delete cascade,
  session_no int,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table learning (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  class_id text references classes(id) on delete set null,
  student_id text references students(id) on delete cascade,
  material text,
  reading text,
  writing text,
  counting text,
  focus text,
  attitude text,
  homework text,
  parent_note text,
  created_at timestamptz default now()
);

create table assessments (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  class_id text references classes(id) on delete set null,
  student_id text references students(id) on delete cascade,
  reading_score int,
  writing_score int,
  counting_score int,
  focus_score int,
  independence_score int,
  level text,
  stars text,
  note text,
  created_at timestamptz default now()
);

create table payments (
  id text primary key default gen_random_uuid()::text,
  invoice_no text,
  date date not null,
  type text default 'Pemasukan', -- kolom lama, tetap ada untuk kompatibilitas (semua payments = Pemasukan)
  student_id text references students(id) on delete set null,
  class_id text references classes(id) on delete set null,
  period text,
  package_type text,
  amount numeric default 0,
  paid numeric default 0,
  paid_date date,
  method text,
  due_date date,
  status text default 'Belum Lunas',
  note text,
  created_at timestamptz default now()
);

create table expenses (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  item_name text,
  price numeric default 0,
  qty numeric default 1,
  note text,
  created_at timestamptz default now()
);

create table settings (
  id int primary key default 1,
  institution_name text default 'Nama Lembaga Les',
  teacher_name text default 'Nama Guru',
  phone text,
  address text,
  invoice_note text,
  theme text default 'yellow',
  theme_locked boolean default false,
  logo_data text
);
insert into settings (id) values (1);

-- ============================================================
-- ROW LEVEL SECURITY
-- CATATAN PENTING: mulai versi ini, gerbang LOGIN (email+password)
-- ada di LICENSE SERVER (project terpisah), BUKAN di project ini.
-- Guru login di License Server -> baru dikasih anon key project
-- klien ini oleh aplikasi. Jadi project ini sendiri tidak perlu
-- Supabase Auth-nya sendiri lagi.
--
-- Konsekuensinya: RLS di sini dibuka untuk anon key (bukan
-- mensyaratkan auth.role()='authenticated' seperti sebelumnya),
-- karena verifikasi "siapa boleh masuk" sudah terjadi SEBELUM
-- anon key ini pernah sampai ke browser guru. Anon key TIDAK
-- pernah dipublikasikan di tempat lain selain lewat proses
-- login yang sudah terverifikasi itu.
-- ============================================================
alter table students enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;
alter table learning enable row level security;
alter table assessments enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;

create policy "Akses via anon key (sudah lolos gerbang License Server)" on students for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on classes for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on enrollments for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on schedules for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on attendance for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on learning for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on assessments for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on payments for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on expenses for all using (true);
create policy "Akses via anon key (sudah lolos gerbang License Server)" on settings for all using (true);
