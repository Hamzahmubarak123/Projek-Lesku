// ============================================================
// SCHEMAS.JS
// Definisi semua entitas data (dulu tercampur di index.html).
// Kalau mau nambah field baru ke satu entitas, atau bikin
// entitas baru sama sekali, CUKUP UBAH FILE INI.
// Halaman CRUD generik (lib/crud.js) otomatis mengikuti skema ini.
// ============================================================

export const pages = [
  ['dashboard', 'Dashboard', '🏠', 'Ringkasan aktivitas les hari ini.'],
  ['students', 'Siswa', '👧', 'Kelola data siswa dan orang tua.'],
  ['classes', 'Kelas', '🏫', 'Kelola kelas, program, dan tipe les.'],
  ['enrollments', 'Paket Les', '🎒', 'Atur program siswa dan paket pembayaran.'],
  ['schedules', 'Jadwal', '🗓️', 'Atur jadwal privat dan kelompok.'],
  ['attendance', 'Absensi', '✅', 'Catat kehadiran setiap pertemuan.'],
  ['learning', 'Pembelajaran', '📚', 'Catatan materi dan perkembangan harian.'],
  ['assessments', 'Penilaian', '⭐', 'Nilai, level perkembangan, dan catatan guru.'],
  ['payments', 'Pemasukan', '💳', 'Tagihan siswa otomatis per bulan.'],
  ['expenses', 'Pengeluaran', '🧾', 'Catat kebutuhan operasional lembaga.'],
  ['monthlyRecap', 'Rekap Bulanan', '📊', 'Status bayar orang tua bulan ini — tinggal centang.'],
  ['cashflow', 'Cashflow', '💹', 'Rekap uang masuk vs keluar, semua bulan atau per bulan.'],
  ['invoice', 'Invoice', '🧾', 'Cetak dan kirim invoice formal.'],
  ['reports', 'Laporan', '📄', 'Laporan harian, bulanan, dan rapor akhir.'],
  ['documents', 'Pusat Dokumen', '🖼️', 'Preview, unduh PNG/PDF, print, dan kirim dokumen.'],
  ['settings', 'Pengaturan', '⚙️', 'Profil lembaga, tema, dan backup data.']
];

// Halaman yang punya tampilan KHUSUS (bukan CRUD generik biasa).
// Sisanya (students, classes, enrollments, dst) otomatis dirender
// oleh lib/crud.js memakai definisi di bawah ini.
export const CUSTOM_PAGES = new Set([
  'dashboard', 'attendance', 'monthlyRecap', 'cashflow', 'invoice', 'reports', 'documents', 'settings'
]);

export const schemas = {
  students: {
    title: 'Siswa', singular: 'Siswa',
    fields: [
      ['name', 'Nama Siswa', 'text', true],
      ['dob', 'Tanggal Lahir', 'date'],
      ['parentName', 'Nama Orang Tua', 'text'],
      ['parentPhone', 'WhatsApp Orang Tua', 'tel'],
      ['status', 'Status', 'select', true, ['Aktif', 'Nonaktif']],
      ['notes', 'Catatan Khusus', 'textarea']
    ],
    columns: ['name', 'parentName', 'parentPhone', 'status', 'notes']
  },
  classes: {
    title: 'Kelas / Program', singular: 'Kelas',
    fields: [
      ['name', 'Nama Kelas', 'text', true],
      ['type', 'Tipe Les', 'select', true, ['Privat', 'Kelompok']],
      ['program', 'Program', 'select', true, ['Calistung Dasar', 'Membaca Lancar', 'Menulis Rapi', 'Berhitung Dasar', 'Persiapan SD', 'Custom']],
      ['teacher', 'Guru Pengampu', 'text'],
      ['scheduleText', 'Jadwal Tetap', 'text'],
      ['capacity', 'Kapasitas', 'number'],
      ['status', 'Status', 'select', true, ['Aktif', 'Nonaktif']]
    ],
    columns: ['name', 'type', 'program', 'teacher', 'scheduleText', 'status']
  },
  enrollments: {
    title: 'Paket Les', singular: 'Paket Les',
    fields: [
      ['studentId', 'Siswa', 'student', true],
      ['classId', 'Kelas / Program', 'class', true],
      ['packageType', 'Jenis Paket', 'select', true, ['Bulanan', 'Paket 8x Pertemuan / Bulan', 'Custom']],
      ['price', 'Biaya Paket', 'currency'],
      ['startDate', 'Mulai', 'date'],
      ['endDate', 'Selesai', 'date'],
      ['meetingsQuota', 'Kuota Pertemuan', 'number'],
      ['status', 'Status', 'select', true, ['Aktif', 'Selesai', 'Berhenti']]
    ],
    columns: ['studentId', 'classId', 'packageType', 'price', 'meetingsQuota', 'status']
  },
  schedules: {
    title: 'Jadwal Les', singular: 'Jadwal',
    fields: [
      ['date', 'Tanggal', 'date', true],
      ['timeStart', 'Jam Mulai', 'time'],
      ['timeEnd', 'Jam Selesai', 'time'],
      ['classId', 'Kelas / Program', 'class'],
      ['studentId', 'Siswa Privat / Opsional', 'student'],
      ['topic', 'Rencana Materi', 'text'],
      ['status', 'Status', 'select', true, ['Terjadwal', 'Selesai', 'Reschedule', 'Batal']]
    ],
    columns: ['date', 'timeStart', 'timeEnd', 'classId', 'studentId', 'topic', 'status']
  },
  attendance: {
    title: 'Absensi', singular: 'Absensi',
    fields: [
      ['date', 'Tanggal', 'date', true],
      ['classId', 'Kelas / Program', 'class'],
      ['studentId', 'Siswa', 'student', true],
      ['sessionNo', 'Pertemuan Ke', 'number'],
      ['status', 'Status Kehadiran', 'select', true, ['Hadir', 'Izin', 'Sakit', 'Alpha', 'Terlambat', 'Reschedule']],
      ['notes', 'Catatan', 'textarea']
    ],
    columns: ['date', 'studentId', 'classId', 'sessionNo', 'status', 'notes']
  },
  learning: {
    title: 'Rekam Pembelajaran', singular: 'Catatan Pembelajaran',
    fields: [
      ['date', 'Tanggal', 'date', true],
      ['classId', 'Kelas / Program', 'class'],
      ['studentId', 'Siswa', 'student', true],
      ['material', 'Materi Hari Ini', 'textarea', true],
      ['reading', 'Membaca', 'textarea'],
      ['writing', 'Menulis', 'textarea'],
      ['counting', 'Berhitung', 'textarea'],
      ['focus', 'Fokus / Konsentrasi', 'textarea'],
      ['attitude', 'Sikap Belajar', 'select', false, ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Pendampingan']],
      ['homework', 'Latihan Rumah', 'textarea'],
      ['parentNote', 'Catatan untuk Orang Tua', 'textarea']
    ],
    columns: ['date', 'studentId', 'classId', 'material', 'attitude', 'parentNote']
  },
  assessments: {
    title: 'Penilaian', singular: 'Penilaian',
    fields: [
      ['date', 'Tanggal', 'date', true],
      ['classId', 'Kelas / Program', 'class'],
      ['studentId', 'Siswa', 'student', true],
      ['readingScore', 'Membaca', 'number'],
      ['writingScore', 'Menulis', 'number'],
      ['countingScore', 'Berhitung', 'number'],
      ['focusScore', 'Fokus', 'number'],
      ['independenceScore', 'Kemandirian', 'number'],
      ['level', 'Level Perkembangan', 'select', true, ['BB - Belum Berkembang', 'MB - Mulai Berkembang', 'BSH - Berkembang Sesuai Harapan', 'BSB - Berkembang Sangat Baik']],
      ['stars', 'Bintang', 'select', false, ['1', '2', '3', '4', '5']],
      ['note', 'Catatan Guru', 'textarea']
    ],
    columns: ['date', 'studentId', 'classId', 'readingScore', 'writingScore', 'countingScore', 'level', 'note']
  },
  payments: {
    title: 'Pemasukan', singular: 'Pemasukan',
    fields: [
      ['invoiceNo', 'Nomor Invoice', 'text'],
      ['date', 'Tanggal Tagihan', 'date', true],
      ['studentId', 'Siswa', 'student'],
      ['classId', 'Kelas / Program', 'class'],
      ['period', 'Periode', 'text', true],
      ['packageType', 'Jenis Paket', 'select', false, ['Bulanan', 'Paket 8x Pertemuan / Bulan', 'Custom']],
      ['amount', 'Nominal Tagihan', 'currency', true],
      ['paid', 'Sudah Dibayar', 'currency'],
      ['paidDate', 'Tanggal Dibayar', 'date'],
      ['method', 'Metode Bayar', 'select', false, ['Tunai', 'Transfer', 'QRIS', 'Lainnya']],
      ['dueDate', 'Jatuh Tempo', 'date'],
      ['status', 'Status', 'select', true, ['Belum Lunas', 'Sebagian', 'Lunas', 'Jatuh Tempo']],
      ['note', 'Catatan', 'textarea']
    ],
    // catatan: payments sekarang KHUSUS pemasukan (tagihan siswa) - dibuat
    // otomatis tiap bulan lewat Rekap Bulanan. Pengeluaran dipisah ke
    // entity "expenses" sendiri (lebih simpel: nama barang, harga, jumlah).
    columns: ['invoiceNo', 'date', 'studentId', 'period', 'amount', 'paid', 'dueDate', 'status']
  },
  expenses: {
    title: 'Pengeluaran', singular: 'Pengeluaran',
    fields: [
      ['date', 'Tanggal', 'date', true],
      ['itemName', 'Nama Kebutuhan', 'text', true],
      ['price', 'Harga Satuan', 'currency', true],
      ['qty', 'Jumlah', 'number', true],
      ['note', 'Keterangan', 'textarea']
    ],
    columns: ['date', 'itemName', 'price', 'qty', 'note']
  }
};
