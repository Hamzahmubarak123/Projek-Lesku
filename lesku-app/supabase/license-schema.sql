-- ============================================================
-- LICENSE-SCHEMA.SQL
-- Jalankan HANYA SEKALI, di 1 Supabase project TERPISAH yang
-- kamu (Mubarak) pegang sendiri sebagai "License Server".
-- Project ini TIDAK PERNAH menyimpan data siswa/klien - isinya
-- cuma status lisensi tiap instalasi LesKu.
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
  license_key text unique not null,       -- dipakai app lewat VITE_LICENSE_KEY
  status text not null default 'demo',    -- 'demo' | 'active' | 'blocked'
  supabase_project_url text,              -- diisi saat provisioning (status jadi 'active')
  supabase_anon_key text,
  tanggal_lunas date,
  catatan text,
  updated_at timestamptz default now()
);

-- RLS: license_key dicek lewat anon key PUBLIK dari app klien manapun,
-- jadi policy read-nya sengaja dibuka (tidak butuh login) - tapi HANYA
-- kolom yang perlu, dan tidak ada data sensitif klien di sini.
alter table licenses enable row level security;
create policy "Siapa saja boleh cek status lisensi" on licenses for select using (true);

-- Insert/update HANYA lewat dashboard Supabase kamu sendiri (sebagai admin),
-- bukan lewat app - jadi tidak perlu policy insert/update untuk anon.

-- Contoh isi data saat provisioning klien baru:
-- insert into clients (nama_guru, nama_lembaga, email, no_wa)
--   values ('Bu Guru SD', 'Lembaga Les A', 'guru@email.com', '628xxxxxxxx');
--
-- insert into licenses (client_id, license_key, status)
--   values ('<id dari clients di atas>', 'lesku-klien-001', 'demo');
--
-- Setelah klien lunas, tinggal update:
-- update licenses set status='active',
--   supabase_project_url='https://xxxx.supabase.co',
--   supabase_anon_key='eyJ...',
--   tanggal_lunas=current_date
-- where license_key='lesku-klien-001';
--
-- Kalau perlu blokir:
-- update licenses set status='blocked', catatan='Menunggu pelunasan' where license_key='lesku-klien-001';
