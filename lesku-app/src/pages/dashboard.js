// ============================================================
// PAGES/DASHBOARD.JS
// Halaman ringkasan LENGKAP - porting penuh dari prototype asli:
// KPI, Aktivitas Hari Ini (jadwal + donut kehadiran), Insight,
// Progress Penilaian, status Pembayaran, Siswa Perlu Perhatian
// (dengan tombol WA ke orang tua), Paket Pertemuan, Shortcut Cepat.
// ============================================================
import {
  byId,
  todayISO,
  pct,
  rupiah,
  avg,
  escapeHtml,
  waLink,
  fmtDate,
} from '../lib/utils.js';
import * as store from '../lib/dataStore.js';

function kpi(icon, label, value, hint) {
  return `<div class="card kpiCard"><div class="kpiIcon">${icon}</div><div class="kpiLabel">${label}</div><div class="kpiValue">${value}</div><div class="kpiHint">${hint}</div></div>`;
}

export async function renderDashboard() {
  const section = byId('dashboard');
  section.innerHTML = `<div class="grid kpi"><div class="empty">Memuat ringkasan...</div></div>`;

  const [
    students,
    classes,
    attendance,
    payments,
    schedules,
    enrollments,
    assessments,
    learning,
  ] = await Promise.all([
    store.list('students'),
    store.list('classes'),
    store.list('attendance'),
    store.list('payments'),
    store.list('schedules'),
    store.list('enrollments'),
    store.list('assessments'),
    store.list('learning'),
  ]);

  const studentName = (id) =>
    (students.find((s) => s.id === id) || {}).name || '-';
  const className = (id) =>
    (classes.find((c) => c.id === id) || {}).name || '-';

  // ---------- Statistik dasar ----------
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const activeClasses = classes.filter((c) => c.status === 'Aktif').length;
  const today = todayISO();
  const todaysAttendance = attendance.filter((a) => a.date === today);
  const hadir = todaysAttendance.filter((a) => a.status === 'Hadir').length;
  const pctHadir = pct(hadir, todaysAttendance.length);

  const unpaid = payments.filter(
    (p) =>
      (p.type || 'Pemasukan') === 'Pemasukan' &&
      (p.status !== 'Lunas' || Number(p.paid || 0) < Number(p.amount || 0))
  );
  const totalDue = unpaid.reduce(
    (s, p) => s + (Number(p.amount || 0) - Number(p.paid || 0)),
    0
  );
  const dueSoon = unpaid.filter((p) => daysUntil(p.dueDate) <= 3).length;

  const packageAlerts = enrollments.filter((en) => {
    if (en.status !== 'Aktif') return false;
    const used = attendance.filter(
      (a) =>
        a.studentId === en.studentId &&
        a.classId === en.classId &&
        a.status !== 'Reschedule'
    ).length;
    return (
      Number(en.meetingsQuota || 0) > 0 &&
      Number(en.meetingsQuota || 0) - used <= 2
    );
  }).length;

  const todaySchedule = schedules
    .filter((s) => s.date === today)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

  // ---------- Siswa perlu perhatian ----------
  const needs = students
    .filter((s) => s.status === 'Aktif')
    .map((s) => {
      const ass = assessments
        .filter((a) => a.studentId === s.id)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const alphas = attendance.filter(
        (a) => a.studentId === s.id && a.status === 'Alpha'
      ).length;
      const score = ass
        ? avg(
            [
              'readingScore',
              'writingScore',
              'countingScore',
              'focusScore',
              'independenceScore',
            ].map((k) => ass[k])
          )
        : 100;
      const weak =
        ass &&
        (score < 70 ||
          String(ass.level || '').startsWith('BB') ||
          String(ass.level || '').startsWith('MB'));
      return {
        ...s,
        score: Math.round(score),
        reason: weak
          ? 'Perlu penguatan belajar'
          : alphas >= 2
          ? 'Absensi perlu perhatian'
          : '',
      };
    })
    .filter((s) => s.reason)
    .slice(0, 6);

  // ---------- Render ----------
  section.innerHTML = `
    <div class="grid kpi">
      ${kpi('👧', 'Siswa Aktif', activeStudents, 'Anak sedang mengikuti les')}
      ${kpi('🏫', 'Kelas Aktif', activeClasses, 'Privat dan kelompok belajar')}
      ${kpi(
        '✅',
        'Absensi Hari Ini',
        todaysAttendance.length,
        `${pctHadir}% tercatat hadir`
      )}
      ${kpi(
        '💳',
        'Tagihan Belum Lunas',
        rupiah(totalDue),
        `${dueSoon} jatuh tempo dekat`
      )}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="cardHeader"><div><h2>Aktivitas Hari Ini</h2><p>Jadwal dan absensi yang perlu dipantau guru.</p></div><span class="badge">${fmtDate(
          today
        )}</span></div>
        <div class="grid two">
          <div>${renderScheduleToday(
            todaySchedule,
            className,
            studentName
          )}</div>
          <div>${renderAttendanceDonut(todaysAttendance)}</div>
        </div>
      </div>
      <div class="card solid">
        <div class="cardHeader"><div><h2>Insight</h2><p>Prioritas tindakan guru.</p></div><span class="badge ${
          unpaid.length ? 'warn' : 'ok'
        }">${unpaid.length ? 'Perlu Follow-up' : 'Aman'}</span></div>
        ${renderInsights(todaySchedule, unpaid, needs, packageAlerts, totalDue)}
      </div>
    </div>
    <div class="grid three" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h3>Progress Penilaian</h3><p>Rata-rata aspek calistung.</p></div></div>${renderScoreBars(
        assessments
      )}</div>
      <div class="card"><div class="cardHeader"><div><h3>Pembayaran</h3><p>Status tagihan siswa.</p></div></div>${renderPaymentStatus(
        payments
      )}</div>
      <div class="card"><div class="cardHeader"><div><h3>Siswa Perlu Perhatian</h3><p>Berdasarkan nilai dan catatan terakhir.</p></div></div>${renderNeedsList(
        needs
      )}</div>
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h3>Paket Pertemuan</h3><p>Kontrol kuota pertemuan siswa.</p></div><span class="badge ${
        packageAlerts ? 'warn' : 'ok'
      }">${packageAlerts} hampir habis</span></div>${renderPackageProgress(
    enrollments,
    attendance,
    studentName
  )}</div>
      <div class="card"><div class="cardHeader"><div><h3>Shortcut Cepat</h3><p>Input data harian tanpa banyak klik.</p></div></div>
        <div class="grid two">
          <button class="btn primary" onclick="window.__lesku_quickAdd('attendance')">Tambah Absensi</button>
          <button class="btn primary" onclick="window.__lesku_quickAdd('learning')">Catat Pembelajaran</button>
          <button class="btn soft" onclick="window.__lesku_quickAdd('assessments')">Input Penilaian</button>
          <button class="btn soft" onclick="window.__lesku_quickAdd('payments')">Input Pembayaran</button>
        </div>
      </div>
    </div>`;
}

function daysUntil(d) {
  if (!d) return 9999;
  const a = new Date(todayISO() + 'T00:00:00');
  const b = new Date(d + 'T00:00:00');
  return Math.ceil((b - a) / 86400000);
}

function renderScheduleToday(items, className, studentName) {
  if (!items.length)
    return `<div class="empty">Belum ada jadwal hari ini.</div>`;
  return `<div class="timeline">${items
    .map(
      (x) =>
        `<div class="timelineItem"><b>${escapeHtml(
          x.timeStart || ''
        )} - ${escapeHtml(className(x.classId))}</b><span>${
          x.studentId ? escapeHtml(studentName(x.studentId)) + ' · ' : ''
        }${escapeHtml(x.topic || '-')} · ${escapeHtml(
          x.status || ''
        )}</span></div>`
    )
    .join('')}</div>`;
}

function renderAttendanceDonut(items) {
  const counts = {
    Hadir: 0,
    Terlambat: 0,
    Izin: 0,
    Sakit: 0,
    Alpha: 0,
    Reschedule: 0,
  };
  items.forEach((a) => (counts[a.status] = (counts[a.status] || 0) + 1));
  const total = items.length || 1;
  const hadir = counts.Hadir || 0,
    telat = counts.Terlambat || 0,
    izin = (counts.Izin || 0) + (counts.Sakit || 0),
    alpha = (counts.Alpha || 0) + (counts.Reschedule || 0);
  const deg1 = (360 * hadir) / total,
    deg2 = deg1 + (360 * telat) / total,
    deg3 = deg2 + (360 * izin) / total;
  return `<div class="donutWrap"><div class="donut" style="background:conic-gradient(var(--success) 0deg ${deg1}deg,var(--warning) ${deg1}deg ${deg2}deg,var(--info) ${deg2}deg ${deg3}deg,var(--danger) ${deg3}deg 360deg)"><div class="donutInner"><div><b>${pct(
    hadir,
    items.length
  )}%</b><br><span class="subtle">Hadir</span></div></div></div><div class="legend"><div class="legendItem"><span class="dot" style="background:var(--success)"></span>Hadir: ${hadir}</div><div class="legendItem"><span class="dot" style="background:var(--warning)"></span>Terlambat: ${telat}</div><div class="legendItem"><span class="dot" style="background:var(--info)"></span>Izin/Sakit: ${izin}</div><div class="legendItem"><span class="dot" style="background:var(--danger)"></span>Alpha/Reschedule: ${alpha}</div></div></div>`;
}

function renderInsights(todaySchedule, unpaid, needs, packageAlerts, totalDue) {
  const lines = [];
  if (todaySchedule.length)
    lines.push(
      `Ada ${todaySchedule.length} jadwal hari ini. Prioritaskan pencatatan absensi setelah sesi selesai.`
    );
  else
    lines.push(
      'Belum ada jadwal hari ini. Guru bisa menyiapkan jadwal minggu berjalan.'
    );
  if (unpaid.length)
    lines.push(
      `Terdapat ${unpaid.length} tagihan belum lunas dengan total ${rupiah(
        totalDue
      )}.`
    );
  else lines.push('Status pembayaran aman, belum ada tagihan terbuka.');
  if (needs.length)
    lines.push(
      `${needs.length} siswa perlu pendampingan belajar berdasarkan nilai/catatan terbaru.`
    );
  else lines.push('Belum ada siswa yang masuk kategori perhatian khusus.');
  if (packageAlerts)
    lines.push(
      `${packageAlerts} paket pertemuan hampir habis, siapkan follow-up paket lanjutan.`
    );
  return `<div class="miniList">${lines
    .map(
      (l, i) =>
        `<div class="miniItem"><div><b>${i + 1}. ${escapeHtml(
          l
        )}</b></div></div>`
    )
    .join('')}</div>`;
}

function renderScoreBars(assessments) {
  const fields = [
    ['Membaca', 'readingScore'],
    ['Menulis', 'writingScore'],
    ['Berhitung', 'countingScore'],
    ['Fokus', 'focusScore'],
    ['Mandiri', 'independenceScore'],
  ];
  if (!assessments.length)
    return `<div class="empty">Belum ada data penilaian.</div>`;
  return `<div class="barChart">${fields
    .map(([label, key]) => {
      const v = Math.round(avg(assessments.map((a) => a[key])));
      return `<div class="barRow"><div class="barLabel">${label}</div><div class="barTrack"><span style="width:${Math.max(
        0,
        Math.min(100, v)
      )}%"></span></div><div class="barVal">${v}</div></div>`;
    })
    .join('')}</div>`;
}

function renderPaymentStatus(payments) {
  const groups = ['Lunas', 'Sebagian', 'Belum Lunas', 'Jatuh Tempo'];
  const max = Math.max(
    1,
    ...groups.map((g) => payments.filter((p) => p.status === g).length)
  );
  return `<div class="barChart">${groups
    .map((g) => {
      const v = payments.filter((p) => p.status === g).length;
      const color =
        g === 'Lunas'
          ? 'var(--success)'
          : g === 'Jatuh Tempo'
          ? 'var(--danger)'
          : g === 'Sebagian'
          ? 'var(--warning)'
          : 'var(--primary)';
      return `<div class="barRow"><div class="barLabel">${g}</div><div class="barTrack"><span style="width:${pct(
        v,
        max
      )}%;background:${color}"></span></div><div class="barVal">${v}</div></div>`;
    })
    .join('')}</div>`;
}

function renderNeedsList(needs) {
  if (!needs.length)
    return `<div class="empty">Tidak ada prioritas khusus saat ini.</div>`;
  return `<div class="miniList">${needs
    .map((s) => {
      const waBtn = s.parentPhone
        ? `<button class="btn small soft" onclick="window.__lesku_dashboardWA('${s.id}')">💬 WA</button>`
        : '';
      return `<div class="miniItem"><div class="studentNeed"><div class="avatar">${escapeHtml(
        (s.name || '?').slice(0, 1)
      )}</div><div><b>${escapeHtml(s.name)}</b><span>${escapeHtml(
        s.reason
      )} · Skor ${
        s.score
      }</span></div></div><div class="tdActions">${waBtn}<button class="btn small" onclick="window.__lesku_openStudentReport('${
        s.id
      }')">Laporan</button></div></div>`;
    })
    .join('')}</div>`;
}

function renderPackageProgress(enrollments, attendance, studentName) {
  if (!enrollments.length)
    return `<div class="empty">Belum ada paket les.</div>`;
  return `<div class="miniList">${enrollments
    .filter((e) => e.status === 'Aktif')
    .map((e) => {
      const used = attendance.filter(
        (a) =>
          a.studentId === e.studentId &&
          a.classId === e.classId &&
          a.status !== 'Reschedule'
      ).length;
      const quota = Number(e.meetingsQuota || 0) || 8;
      const rem = Math.max(0, quota - used);
      return `<div class="miniItem"><div style="flex:1"><b>${escapeHtml(
        studentName(e.studentId)
      )}</b><span>${escapeHtml(
        e.packageType
      )} · sisa ${rem}/${quota}</span><div class="progress" style="margin-top:8px"><span style="width:${pct(
        used,
        quota
      )}%"></span></div></div><span class="badge ${rem <= 2 ? 'warn' : 'ok'}">${
        rem <= 2 ? 'Follow-up' : 'Aman'
      }</span></div>`;
    })
    .join('')}</div>`;
}

// ---------- jembatan ke window (dipanggil dari onclick inline) ----------
window.__lesku_quickAdd = (key) => {
  window.__lesku_showPage(key);
  setTimeout(() => window.__lesku_openForm(key), 120);
};

window.__lesku_dashboardWA = async (studentId) => {
  const students = await store.list('students');
  const s = students.find((x) => x.id === studentId);
  if (!s || !s.parentPhone) return;
  const msg = `Assalamu'alaikum Bapak/Ibu ${
    s.parentName || ''
  }, kami ingin menginformasikan perkembangan belajar Ananda ${
    s.name || ''
  } yang perlu sedikit perhatian ekstra akhir-akhir ini. Kami senang bisa berdiskusi lebih lanjut mengenai langkah pendampingan yang bisa dilakukan bersama. Terima kasih.`;
  window.open(waLink(s.parentPhone, msg), '_blank');
};
