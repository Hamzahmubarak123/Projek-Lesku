-- ============================================================
-- SCHEMA.SQL
-- Jalankan file ini di Supabase SQL Editor SETIAP KALI provisioning
-- klien baru (1 project Supabase = 1 klien/guru).
--
-- Setelah dijalankan, jangan lupa:
-- 1. Buat 1 user lewat Authentication > Users (email guru)
-- 2. Catat Project URL & anon key -> masukkan ke tabel `licenses`
--    di License Server (lihat license-schema.sql)
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
  type text default 'Pemasukan', -- 'Pemasukan' | 'Pengeluaran' (untuk fitur Rekap Bulanan)
  student_id text references students(id) on delete set null,
  class_id text references classes(id) on delete set null,
  period text,
  package_type text,
  amount numeric default 0,
  paid numeric default 0,
  method text,
  due_date date,
  status text default 'Belum Lunas',
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
-- Wajib aktif: hanya user yang sudah login (guru) yang boleh
-- baca/tulis data. Karena 1 project = 1 klien, cukup 1 aturan
-- sederhana "harus login", tidak perlu pemisahan tenant_id.
-- ============================================================
alter table students enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;
alter table learning enable row level security;
alter table assessments enable row level security;
alter table payments enable row level security;
alter table settings enable row level security;

create policy "Guru login bisa akses semua data" on students for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on classes for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on enrollments for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on schedules for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on attendance for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on learning for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on assessments for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on payments for all using (auth.role() = 'authenticated');
create policy "Guru login bisa akses semua data" on settings for all using (auth.role() = 'authenticated');
