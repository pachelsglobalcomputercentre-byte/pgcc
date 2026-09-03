/* =========================================================
   PGCC INSTITUTE — ADMIN DASHBOARD LOGIC
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  PGCC_UI.init('admin');
  const D = PGCC_DATA;

  document.querySelector('#welcomeName').textContent = PGCC_UI.user.name.split(' ')[0];

  /* =========================================================
     OVERVIEW — real stats, with graceful demo fallback
     ========================================================= */
  let adminStats = null;
  let liveApplications = null;
  let livePayments = null;
  let liveStudents = null;
  let liveCourses = null;
  let liveAnnouncements = null;

  async function loadOverview() {
    try {
      adminStats = await PGCC_AUTH.apiFetch('/admin/stats');
    } catch (err) {
      console.warn('Could not load dashboard stats, using demo data:', err.message);
      adminStats = null;
    }
    renderStatCards();
    renderAdmissionsPreview();
    renderPaymentsPreview();
  }

  function renderStatCards() {
    const statCards = document.querySelector('#adminStatCards');
    if (!statCards) return;
    const totalStudents = adminStats ? adminStats.totalStudents : D.analyticsAdmin.totalStudents;
    const pending = adminStats ? adminStats.pendingApplications : D.admissions.filter(a => a.status === 'pending').length;
    const revenue = adminStats ? `₦${adminStats.totalRevenue.toLocaleString()}` : D.analyticsAdmin.revenue;
    statCards.innerHTML = `
      <div class="stat-card"><div class="top"><div class="ic g"><i class="bi bi-people"></i></div><span class="trend up"><i class="bi bi-arrow-up-short"></i></span></div><b class="num">${totalStudents.toLocaleString()}</b><span class="label">Total Students</span></div>
      <div class="stat-card"><div class="top"><div class="ic a"><i class="bi bi-person-plus"></i></div></div><b class="num">${pending}</b><span class="label">Pending Admissions</span></div>
      <div class="stat-card"><div class="top"><div class="ic s"><i class="bi bi-cash-stack"></i></div></div><b class="num">${revenue}</b><span class="label">Total Revenue</span></div>
      <div class="stat-card"><div class="top"><div class="ic c"><i class="bi bi-person-workspace"></i></div></div><b class="num">${adminStats ? adminStats.totalInstructors : D.analyticsAdmin.totalInstructors}</b><span class="label">Instructors</span></div>`;
  }

  function renderAdmissionsPreview() {
    const host = document.querySelector('#admissionsQueuePreview');
    if (!host) return;
    if (adminStats) {
      host.innerHTML = '<p class="muted" style="font-size:13px;">Loading…</p>';
      PGCC_AUTH.apiFetch('/applications').then(apps => {
        const pending = apps.filter(a => a.status === 'pending').slice(0, 4);
        host.innerHTML = pending.length ? pending.map(a => `
          <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-person-plus"></i></div>
          <div class="body"><b>${a.fullName}</b><span>${a.course}</span></div><div class="meta">${new Date(a.submittedAt).toLocaleDateString()}</div></div>`).join('')
          : '<p class="muted" style="font-size:13px;">No pending applications.</p>';
      }).catch(() => { host.innerHTML = '<p class="muted" style="font-size:13px;">Could not load.</p>'; });
    } else {
      host.innerHTML = D.admissions.filter(a => a.status === 'pending').slice(0, 4).map(a => `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-person-plus"></i></div>
        <div class="body"><b>${a.name}</b><span>${a.course}</span></div><div class="meta">${a.date}</div></div>`).join('');
    }
  }

  function renderPaymentsPreview() {
    const host = document.querySelector('#paymentsPreview');
    if (!host) return;
    if (adminStats) {
      host.innerHTML = adminStats.recentPayments.length ? adminStats.recentPayments.map(p => `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-cash"></i></div>
        <div class="body"><b>${p.studentName}</b><span>${p.course || '—'} · ${p.method === 'cash' ? 'Cash' : 'Online'}</span></div><div class="meta">₦${(p.amount || 0).toLocaleString()}</div></div>`).join('')
        : '<p class="muted" style="font-size:13px;">No payments yet.</p>';
    } else {
      host.innerHTML = D.payments.slice(0, 4).map(p => `
        <div class="list-row"><div class="ic" style="background:${p.status==='paid'?'var(--green-100)':p.status==='overdue'?'#fceae7':'#fdf1dc'};color:${p.status==='paid'?'var(--green-700)':p.status==='overdue'?'#a3382a':'var(--amber-ink)'};"><i class="bi bi-cash"></i></div>
        <div class="body"><b>${p.student}</b><span>${p.course}</span></div><div class="meta">${p.amount}</div></div>`).join('');
    }
  }

  /* =========================================================
     MANAGE STUDENTS — real, approved-only students
     ========================================================= */
  const studentsBody = document.querySelector('#adminStudentsBody');
  let activeStudentFilter = 'all';

  async function loadStudents() {
    try {
      liveStudents = await PGCC_AUTH.apiFetch('/admin/students');
    } catch (err) {
      console.warn('Could not load students, using demo data:', err.message);
      liveStudents = null;
    }
    renderAdminStudents();
  }

  function parseDurationToDays(duration) {
    if (!duration) return null;
    const m = String(duration).match(/(\d+)\s*(week|month|day)/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (unit === 'day') return n;
    if (unit === 'week') return n * 7;
    if (unit === 'month') return n * 30;
    return null;
  }
  function timeRemainingLabel(enrolledAt, duration) {
    const days = parseDurationToDays(duration);
    if (!days || !enrolledAt) return '—';
    const end = new Date(new Date(enrolledAt).getTime() + days * 86400000);
    const diffDays = Math.ceil((end - new Date()) / 86400000);
    if (diffDays <= 0) return '<span class="pill pill-green">Completed</span>';
    if (diffDays < 14) return `<span class="pill pill-amber">${diffDays} day${diffDays === 1 ? '' : 's'} left</span>`;
    return `${Math.round(diffDays / 7)} weeks left`;
  }

  function renderAdminStudents(search = '') {
    if (!studentsBody) return;
    if (Array.isArray(liveStudents)) {
      let rows = liveStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      if (activeStudentFilter === 'new') rows = rows.filter(s => s.enrollmentType === 'new');
      if (activeStudentFilter === 'old') rows = rows.filter(s => s.enrollmentType === 'old');
      if (activeStudentFilter === 'owing') rows = rows.filter(s => s.balanceDue > 0);
      if (activeStudentFilter === 'online') rows = rows.filter(s => (s.deliveryMode || 'online') === 'online');
      if (activeStudentFilter === 'physical') rows = rows.filter(s => s.deliveryMode === 'physical');

      if (!rows.length) {
        studentsBody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ic"><i class="bi bi-search"></i></div><h4>No students found</h4></div></td></tr>`;
        return;
      }

      // Group by course category, so admin sees students organized by the
      // course track they applied for rather than one flat list.
      const groups = {};
      rows.forEach(s => { (groups[s.courseCategory] = groups[s.courseCategory] || []).push(s); });

      studentsBody.innerHTML = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([category, students]) => `
        <tr class="group-header-row"><td colspan="9" style="background:var(--paper-2);padding:12px 16px;"><b style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--green-700);"><i class="bi bi-collection"></i> ${category}</b> <span class="muted" style="font-size:12px;">(${students.length})</span></td></tr>
        ${students.map(s => `
        <tr>
          <td><div class="td-person"><img src="${s.profileImage ? resolveUploadUrl(s.profileImage) : FALLBACK_IMG}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"><div><b>${s.name}</b><span>${s.email}</span></div></div></td>
          <td>${s.course}</td>
          <td><span class="pill ${s.deliveryMode === 'physical' ? 'pill-amber' : 'pill-sky'}" style="font-size:11px;"><i class="bi bi-${s.deliveryMode === 'physical' ? 'building' : 'laptop'}"></i> ${s.deliveryMode === 'physical' ? 'Physical' : 'Online'}</span></td>
          <td>${new Date(s.createdAt).toLocaleDateString()}</td>
          <td>₦${s.courseCost.toLocaleString()}</td>
          <td style="color:var(--green-700);">₦${s.amountPaid.toLocaleString()}</td>
          <td style="color:${s.balanceDue > 0 ? 'var(--coral)' : 'var(--green-700)'};">₦${s.balanceDue.toLocaleString()}</td>
          <td>${timeRemainingLabel(s.enrolledAt, s.courseDuration)}</td>
          <td class="row-actions"><button class="icon-btn" data-view-student="${s._id}"><i class="bi bi-eye"></i></button></td>
        </tr>`).join('')}`).join('');

      studentsBody.querySelectorAll('[data-view-student]').forEach(btn => btn.addEventListener('click', () => openStudentDetail(btn.dataset.viewStudent)));
    } else {
      const rows = D.adminStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      studentsBody.innerHTML = rows.map(s => `
        <tr><td><div class="td-person"><img src="${s.avatar}" onerror="${ONERR}"><div><b>${s.name}</b><span>${s.id}</span></div></div></td>
        <td>${s.course}</td><td>—</td><td>${s.joined}</td><td>—</td><td>—</td><td>—</td><td>—</td>
        <td class="row-actions"><button class="icon-btn"><i class="bi bi-eye"></i></button></td></tr>`).join('') ||
        `<tr><td colspan="9"><div class="empty-state"><div class="ic"><i class="bi bi-search"></i></div><h4>No students found</h4></div></td></tr>`;
    }
  }

  function openStudentDetail(id) {
    const s = liveStudents.find(x => x._id === id);
    const body = document.querySelector('#studentDetailBody');
    const photoUrl = s.profileImage ? resolveUploadUrl(s.profileImage) : (s.passportPhotoUrl ? resolveUploadUrl(s.passportPhotoUrl) : FALLBACK_IMG);
    body.innerHTML = `
      <div class="flex items-center gap-16" style="margin-bottom:20px;">
        <img src="${photoUrl}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" style="width:64px;height:64px;border-radius:14px;object-fit:cover;border:2px solid var(--line);cursor:zoom-in;" alt="" data-enlarge-photo title="Click to enlarge">
        <div><h3 style="margin-bottom:2px;">${s.name}</h3><span class="muted" style="font-size:13px;">${s.email}</span></div>
      </div>
      <div class="grid grid-2" style="gap:14px;margin-bottom:20px;">
        <div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Course</span><b style="display:block;font-size:14px;">${s.course}</b></div>
        <div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Training Mode</span><b style="display:block;font-size:14px;"><span class="pill ${s.deliveryMode === 'physical' ? 'pill-amber' : 'pill-sky'}" style="font-size:11px;"><i class="bi bi-${s.deliveryMode === 'physical' ? 'building' : 'laptop'}"></i> ${s.deliveryMode === 'physical' ? 'Physical' : 'Online'}</span></b></div>
        <div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Enrollment</span><b style="display:block;font-size:14px;">${s.enrollmentType === 'old' ? 'Returning Student' : 'New Student'}</b></div>
        <div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Phone</span><b style="display:block;font-size:14px;">${s.phone || '—'}</b></div>
        <div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Time Remaining</span><b style="display:block;font-size:14px;">${timeRemainingLabel(s.enrolledAt, s.courseDuration).replace(/<[^>]+>/g, '')}</b></div>
        ${s.currentStage ? `<div><span class="muted" style="font-size:11.5px;text-transform:uppercase;">Current Stage</span><b style="display:block;font-size:14px;">${s.currentStage}</b></div>` : ''}
      </div>
      <div class="stat-strip" style="margin-bottom:20px;">
        <div class="stat-block" style="flex:1;text-align:center;"><b>₦${s.courseCost.toLocaleString()}</b><span>Course Cost</span></div>
        <div class="stat-block" style="flex:1;text-align:center;"><b style="color:var(--green-700);">₦${s.amountPaid.toLocaleString()}</b><span>Paid</span></div>
        <div class="stat-block" style="flex:1;text-align:center;"><b style="color:${s.balanceDue > 0 ? 'var(--coral)' : 'var(--green-700)'};">₦${s.balanceDue.toLocaleString()}</b><span>Balance</span></div>
      </div>
      <p class="eyebrow">PAYMENT HISTORY</p>
      ${s.payments.length ? s.payments.map(p => `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-cash"></i></div>
        <div class="body"><b>₦${p.amount.toLocaleString()}</b><span>${p.method === 'cash' ? 'Cash' : 'Flutterwave'}</span></div><div class="meta">${new Date(p.date).toLocaleDateString()}</div></div>`).join('')
        : '<p class="muted" style="font-size:13.5px;">No payments recorded yet.</p>'}`;
    document.querySelector('#studentDetailModal').classList.add('open');
  }

  document.querySelectorAll('.chip[data-student-filter]').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-student-filter]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeStudentFilter = chip.dataset.studentFilter;
    renderAdminStudents(document.querySelector('#adminStudentSearch')?.value || '');
  }));
  document.querySelector('#adminStudentSearch')?.addEventListener('input', (e) => renderAdminStudents(e.target.value));

  /* ---------- Manual / cash registration ---------- */
  NATIONALITIES.forEach(n => document.querySelector('#manualNationalitySelect').insertAdjacentHTML('beforeend', `<option ${n==='Nigerian'?'selected':''}>${n}</option>`));
  NIGERIA_STATES.forEach(s => document.querySelector('#manualStateSelect').insertAdjacentHTML('beforeend', `<option>${s}</option>`));

  let enrollmentType = 'new';
  document.querySelectorAll('.enrollment-type-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.enrollment-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    enrollmentType = btn.dataset.type;
    const hint = document.querySelector('#enrollmentTypeHint');
    const cashField = document.querySelector('#cashAmountField');
    const stageField = document.querySelector('#currentStageField');
    if (enrollmentType === 'old') {
      hint.textContent = 'An existing student being added to the system — payment fields are optional, and you can record where they left off.';
      cashField.style.display = 'none';
      stageField.style.display = 'block';
    } else {
      hint.textContent = 'A fresh cash enrollment — records a payment and creates full login credentials.';
      cashField.style.display = 'block';
      stageField.style.display = 'none';
    }
  }));

  function updateManualBalance() {
    const cost = Number(document.querySelector('#manualCourseCostInput').value) || 0;
    const paid = Number(document.querySelector('#manualAmountPaidInput').value) || 0;
    const balance = Math.max(0, cost - paid);
    const display = document.querySelector('#manualBalanceDisplay');
    display.textContent = `₦${balance.toLocaleString()}`;
    display.style.color = balance > 0 ? 'var(--coral)' : 'var(--green-700)';
  }
  document.querySelector('#manualCourseCostInput')?.addEventListener('input', updateManualBalance);
  document.querySelector('#manualAmountPaidInput')?.addEventListener('input', updateManualBalance);
  // pre-fill course cost from the catalog when a course is picked, if the admin hasn't typed one yet
  document.querySelector('#addStudentCourseSelect')?.addEventListener('change', (e) => {
    const costInput = document.querySelector('#manualCourseCostInput');
    if (costInput.value) return;
    const course = (Array.isArray(liveCourses) ? liveCourses : D.courses).find(c => c.title === e.target.value);
    if (course?.price) { costInput.value = parseInt(String(course.price).replace(/[^\d]/g, ''), 10) || ''; updateManualBalance(); }
  });

  document.querySelector('#generateManualPasskeyBtn')?.addEventListener('click', () => {
    document.querySelector('#manualPasskeyInput').value = generatePasskeyClientSide();
  });
  document.querySelector('#addStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#addStudentMsg');
    msg.style.display = 'none';
    const fd = new FormData(e.target);
    fd.set('enrollmentType', enrollmentType);

    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Registering…';
    try {
      const token = PGCC_AUTH.token();
      const res = await fetch(`${API_BASE_URL}/admin/students/manual`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed.');
      PGCC_UI.toast(`${fd.get('fullName')} registered successfully`, 'bi-person-check');
      e.target.closest('.d-modal-overlay').classList.remove('open');
      e.target.reset();
      updateManualBalance();
      loadStudents(); loadOverview();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     MANAGE INSTRUCTORS — real accounts (department/rating fields
     aren't tracked yet, shown as "—" until that's built out)
     ========================================================= */
  const instBody = document.querySelector('#adminInstructorsBody');
  async function loadInstructors() {
    try {
      const instructors = await PGCC_AUTH.apiFetch('/admin/instructors');
      if (!instBody) return;
      instBody.innerHTML = instructors.map(i => `
        <tr><td><div class="td-person"><img src="${i.profileImage ? resolveUploadUrl(i.profileImage) : FALLBACK_IMG}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"><div><b>${i.name}</b><span>${i.email}</span></div></div></td>
        <td>—</td><td>0</td><td>—</td>
        <td class="row-actions"><button class="icon-btn"><i class="bi bi-eye"></i></button></td></tr>`).join('') ||
        `<tr><td colspan="5"><div class="empty-state"><div class="ic"><i class="bi bi-person-workspace"></i></div><h4>No instructors yet</h4></div></td></tr>`;
    } catch (err) {
      console.warn('Could not load instructors:', err.message);
      if (instBody) instBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="ic"><i class="bi bi-exclamation-triangle"></i></div><h4>Could not load — is the backend running?</h4></div></td></tr>`;
    }
  }

  document.querySelector('#generateInstructorPasskeyBtn')?.addEventListener('click', () => {
    document.querySelector('#instructorPasskeyInput').value = generatePasskeyClientSide();
  });
  document.querySelector('#addInstructorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#addInstructorMsg');
    msg.style.display = 'none';
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());

    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Adding…';
    try {
      await PGCC_AUTH.apiFetch('/admin/instructors', { method: 'POST', body: JSON.stringify(payload) });
      PGCC_UI.toast(`${payload.name} added — login created`, 'bi-person-check');
      e.target.closest('.d-modal-overlay').classList.remove('open');
      e.target.reset();
      loadInstructors(); loadOverview();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     MANAGE PAYMENTS — real payment log
     ========================================================= */
  async function loadPayments() {
    try {
      livePayments = await PGCC_AUTH.apiFetch('/payments');
    } catch (err) {
      console.warn('Could not load payments, using demo data:', err.message);
      livePayments = null;
    }
    renderPayments();
  }
  function renderPayments() {
    const payBody = document.querySelector('#adminPaymentsBody');
    const payTotals = document.querySelector('#paymentTotals');
    if (!payBody) return;
    if (Array.isArray(livePayments)) {
      payBody.innerHTML = livePayments.map(p => `
        <tr><td>${p.studentName}</td><td>${p.course || '—'}</td><td><b>₦${p.amount.toLocaleString()}</b></td>
        <td><span class="pill ${p.method === 'cash' ? 'pill-amber' : 'pill-green'}">${p.method === 'cash' ? 'Cash' : 'Flutterwave'}</span></td>
        <td>${new Date(p.date).toLocaleDateString()}</td>
        <td class="row-actions"><button class="icon-btn"><i class="bi bi-receipt"></i></button></td></tr>`).join('') ||
        `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-cash-stack"></i></div><h4>No payments yet</h4></div></td></tr>`;
      if (payTotals) {
        const cashTotal = livePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
        const onlineTotal = livePayments.filter(p => p.method === 'flutterwave').reduce((s, p) => s + p.amount, 0);
        const total = livePayments.reduce((s, p) => s + p.amount, 0);
        payTotals.innerHTML = `
          <div class="stat-block" style="flex:1;text-align:center;"><b style="color:var(--green-700);">₦${total.toLocaleString()}</b><span>Total Amount Collected</span></div>
          <div class="stat-block" style="flex:1;text-align:center;"><b style="color:var(--sky);">₦${onlineTotal.toLocaleString()}</b><span>Online Payments</span></div>
          <div class="stat-block" style="flex:1;text-align:center;"><b style="color:var(--amber-ink);">₦${cashTotal.toLocaleString()}</b><span>Cash Payments</span></div>`;
      }
    } else {
      payBody.innerHTML = D.payments.map(p => `
        <tr><td>${p.student}</td><td>${p.course}</td><td><b>${p.amount}</b></td><td>${payBadge(p.status)}</td><td>${p.date}</td>
        <td class="row-actions"><button class="icon-btn"><i class="bi bi-receipt"></i></button></td></tr>`).join('');
      if (payTotals) {
        const paid = D.payments.filter(p => p.status === 'paid').length;
        payTotals.innerHTML = `<div class="stat-block" style="flex:1;text-align:center;"><b style="color:var(--green-700);">${paid}</b><span>Fully Paid</span></div>`;
      }
    }
  }

  /* =========================================================
     APPROVE ADMISSIONS
     ========================================================= */
  const admBody = document.querySelector('#admissionsBody');

  async function loadApplications() {
    try {
      liveApplications = await PGCC_AUTH.apiFetch('/applications');
    } catch (err) {
      console.warn('Could not load applications from the server (is it running?), showing demo data instead:', err.message);
      liveApplications = null;
    }
    renderAdmissions();
  }

  function renderAdmissions() {
    if (!admBody) return;
    const usingLive = Array.isArray(liveApplications);
    const rows = usingLive
      ? liveApplications.map(a => ({ id: a._id, name: a.fullName, course: a.course, deliveryMode: a.deliveryMode, date: new Date(a.submittedAt).toLocaleDateString(), status: a.status }))
      : D.admissions.map((a, i) => ({ id: i, name: a.name, course: a.course, deliveryMode: null, date: a.date, status: a.status }));

    document.querySelector('#admCount').textContent = rows.filter(r => r.status === 'pending').length;

    admBody.innerHTML = rows.map(r => `
      <tr><td><b>${r.name}</b></td><td>${r.course}</td>
      <td>${r.deliveryMode ? `<span class="pill ${r.deliveryMode === 'physical' ? 'pill-amber' : 'pill-sky'}" style="font-size:11px;"><i class="bi bi-${r.deliveryMode === 'physical' ? 'building' : 'laptop'}"></i> ${r.deliveryMode === 'physical' ? 'Physical' : 'Online'}</span>` : '—'}</td>
      <td>${r.date}</td>
      <td>${statusPill(r.status)}</td>
      <td class="row-actions">
        ${r.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-review="${r.id}"><i class="bi bi-eye"></i> Review</button>` : ''}
        <button class="icon-btn" data-edit-app="${r.id}" title="Edit"><i class="bi bi-pencil"></i></button>
      </td></tr>`).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-inbox"></i></div><h4>No applications yet</h4></div></td></tr>`;

    admBody.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', () => openReviewModal(btn.dataset.review, usingLive)));
    admBody.querySelectorAll('[data-edit-app]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.editApp, usingLive)));
  }
  function statusPill(status) {
    const map = { pending: 'pill-amber', approved: 'pill-sky', enrolled: 'pill-green', rejected: 'pill-coral' };
    return `<span class="pill ${map[status] || 'pill-outline'}">${status}</span>`;
  }

  function credentialFieldsHTML() {
    return `
      <hr style="border:none;border-top:1px solid var(--line);margin:20px 0;">
      <p class="eyebrow">ASSIGN LOGIN CREDENTIALS</p>
      <div class="form-field"><label>Official Email</label><input class="form-control" id="officialEmailInput" placeholder="e.g. precious@pgcc.edu.ng"></div>
      <div class="form-field">
        <label>Passkey <span class="muted" style="font-weight:400;">(leave blank to auto-generate)</span></label>
        <div class="flex gap-8"><input class="form-control" id="passkeyInput" placeholder="e.g. 2468-44-5GF-81TP">
        <button type="button" class="btn btn-outline btn-sm" id="generatePasskeyBtn"><i class="bi bi-shuffle"></i> Generate</button></div>
      </div>
      <div class="flex gap-8" style="margin-top:20px;">
        <button class="btn btn-primary" id="confirmApproveBtn" style="flex:1;"><i class="bi bi-check2-circle"></i> Approve & Send Payment Link</button>
        <button class="btn btn-outline" id="confirmRejectBtn"><i class="bi bi-x-lg"></i> Reject</button>
      </div>`;
  }

  function openReviewModal(id, usingLive) {
    const body = document.querySelector('#reviewApplicationBody');
    if (usingLive) {
      const app = liveApplications.find(x => x._id === id);
      const photoUrl = app.passportPhotoUrl ? resolveUploadUrl(app.passportPhotoUrl) : FALLBACK_IMG;
      body.innerHTML = `
        <div class="flex items-center gap-16" style="margin-bottom:20px;">
          <img src="${photoUrl}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" alt="" data-enlarge-photo style="width:64px;height:64px;border-radius:14px;object-fit:cover;border:2px solid var(--line);flex-shrink:0;cursor:zoom-in;" title="Click to enlarge">
          <div><h3 style="margin-bottom:2px;">${app.fullName}</h3><span class="muted" style="font-size:13px;">${app.course}</span></div>
        </div>
        <div class="grid grid-2" style="gap:14px;margin-bottom:20px;">
          ${detailRow('Training Mode', app.deliveryMode === 'physical' ? 'Physical Training' : 'Online Training')}
          ${detailRow('Gender', app.gender)}${detailRow('Date of Birth', app.dob)}
          ${detailRow('Nationality', app.nationality)}${detailRow('State of Origin', app.state)}
          ${detailRow('LGA', app.lga)}${detailRow('Phone', app.phone)}
          ${detailRow('Email', app.email)}${detailRow('NIN', app.nin)}
          ${detailRow('Course Cost', app.courseCost ? `₦${app.courseCost.toLocaleString()}` : '—')}${detailRow('Qualification', app.qualification)}
        </div>
        <div class="form-field"><label>Address</label><p class="muted" style="margin:0;">${app.address || '—'}</p></div>
        <div class="form-field"><label>Goal</label><p class="muted" style="margin:0;">${app.goal || '—'}</p></div>
        ${credentialFieldsHTML()}`;
      document.querySelector('[data-enlarge-photo]')?.addEventListener('click', () => PGCC_UI.openImageLightbox(photoUrl));
      document.querySelector('#generatePasskeyBtn').addEventListener('click', () => { document.querySelector('#passkeyInput').value = generatePasskeyClientSide(); });
      document.querySelector('#confirmApproveBtn').addEventListener('click', () => approveLive(id));
      document.querySelector('#confirmRejectBtn').addEventListener('click', () => rejectLive(id));
    } else {
      const a = D.admissions[id];
      body.innerHTML = `
        <div class="grid grid-2" style="gap:14px;margin-bottom:20px;">${detailRow('Full Name', a.name)}${detailRow('Course', a.course)}${detailRow('Applied', a.date)}${detailRow('Status', a.status)}</div>
        <p class="muted" style="font-size:13px;">Full applicant details will appear here once the backend is running — this entry is demo data.</p>
        ${credentialFieldsHTML()}`;
      document.querySelector('#generatePasskeyBtn').addEventListener('click', () => { document.querySelector('#passkeyInput').value = generatePasskeyClientSide(); });
      document.querySelector('#confirmApproveBtn').addEventListener('click', () => {
        D.admissions[id].status = 'approved';
        PGCC_UI.toast(`${D.admissions[id].name} approved (demo mode)`, 'bi-check2-circle');
        document.querySelector('#reviewApplicationModal').classList.remove('open');
        renderAdmissions();
      });
      document.querySelector('#confirmRejectBtn').addEventListener('click', () => {
        PGCC_UI.toast(`${D.admissions[id].name}'s application declined`, 'bi-x-circle');
        D.admissions.splice(id, 1);
        document.querySelector('#reviewApplicationModal').classList.remove('open');
        renderAdmissions();
      });
    }
    document.querySelector('#reviewApplicationModal').classList.add('open');
  }

  /* ---------- Edit applicant details (any status) ---------- */
  function openEditModal(id, usingLive) {
    const body = document.querySelector('#editApplicationBody');
    const app = usingLive ? liveApplications.find(x => x._id === id) : { fullName: D.admissions[id].name, course: D.admissions[id].course };

    const editField = (label, key, value) => `<div class="form-field"><label>${label}</label><input class="form-control" id="edit_${key}" value="${value || ''}"></div>`;

    body.innerHTML = `
      ${app.passportPhotoUrl ? `<div class="text-center" style="margin-bottom:16px;"><img src="${resolveUploadUrl(app.passportPhotoUrl)}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" style="width:64px;height:64px;border-radius:14px;object-fit:cover;border:2px solid var(--line);" alt=""></div>` : ''}
      <div class="form-row">${editField('Full Name', 'fullName', app.fullName)}${editField('Email', 'email', app.email)}</div>
      <div class="form-row">${editField('Phone', 'phone', app.phone)}${editField('Course', 'course', app.course)}</div>
      <div class="form-row">
        <div class="form-field"><label>Training Mode</label>
          <select class="form-control" id="edit_deliveryMode">
            <option value="online" ${app.deliveryMode !== 'physical' ? 'selected' : ''}>Online Training</option>
            <option value="physical" ${app.deliveryMode === 'physical' ? 'selected' : ''}>Physical Training</option>
          </select>
        </div>
        ${editField('Gender', 'gender', app.gender)}
      </div>
      <div class="form-row">${editField('Nationality', 'nationality', app.nationality)}${editField('State of Origin', 'state', app.state)}</div>
      <div class="form-row">${editField('LGA', 'lga', app.lga)}${editField('NIN', 'nin', app.nin)}</div>
      <div class="form-row">${editField('Qualification', 'qualification', app.qualification)}${editField('Course Cost (₦)', 'courseCost', app.courseCost)}</div>
      <div class="form-row">${editField('Current Learning Stage', 'currentStage', app.currentStage)}</div>
      ${editField('Address', 'address', app.address)}
      <div id="editApplicationMsg" class="pill pill-coral" style="display:none;width:100%;box-sizing:border-box;padding:12px 16px;margin-bottom:16px;"></div>
      <button class="btn btn-primary btn-block" id="saveEditBtn"><i class="bi bi-check2-circle"></i> Save Changes</button>`;

    document.querySelector('#saveEditBtn').addEventListener('click', async () => {
      if (!usingLive) { PGCC_UI.toast('Connect the backend to save real edits', 'bi-exclamation-circle'); return; }
      const fields = ['fullName', 'email', 'phone', 'course', 'deliveryMode', 'gender', 'nationality', 'state', 'lga', 'nin', 'qualification', 'address', 'courseCost', 'currentStage'];
      const payload = {};
      fields.forEach(f => payload[f] = document.querySelector(`#edit_${f}`).value);

      const btn = document.querySelector('#saveEditBtn');
      btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
      try {
        await PGCC_AUTH.apiFetch(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        PGCC_UI.toast('Applicant details updated', 'bi-check2-circle');
        document.querySelector('#editApplicationModal').classList.remove('open');
        loadApplications();
      } catch (err) {
        document.querySelector('#editApplicationMsg').textContent = err.message;
        document.querySelector('#editApplicationMsg').style.display = 'block';
      }
      btn.disabled = false; btn.innerHTML = '<i class="bi bi-check2-circle"></i> Save Changes';
    });

    document.querySelector('#editApplicationModal').classList.add('open');
  }

  function detailRow(label, value) {
    return `<div><span class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:2px;">${label}</span><b style="font-size:14px;">${value || '—'}</b></div>`;
  }
  function generatePasskeyClientSide() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${rnd(4)}-${rnd(2)}-${rnd(3)}-${rnd(4)}`;
  }

  async function approveLive(applicationId) {
    const officialEmail = document.querySelector('#officialEmailInput').value.trim();
    const passkey = document.querySelector('#passkeyInput').value.trim();
    if (!officialEmail) { PGCC_UI.toast('Enter an official email first', 'bi-exclamation-circle'); return; }
    const btn = document.querySelector('#confirmApproveBtn');
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Approving…';
    try {
      await PGCC_AUTH.apiFetch(`/applications/${applicationId}/approve`, { method: 'POST', body: JSON.stringify({ officialEmail, passkey: passkey || undefined }) });
      PGCC_UI.toast('Approved — payment link emailed to the applicant', 'bi-check2-circle');
      document.querySelector('#reviewApplicationModal').classList.remove('open');
      loadApplications(); loadOverview();
    } catch (err) {
      PGCC_UI.toast('Approval failed: ' + err.message, 'bi-exclamation-triangle');
      btn.disabled = false; btn.innerHTML = '<i class="bi bi-check2-circle"></i> Approve & Send Payment Link';
    }
  }
  async function rejectLive(applicationId) {
    try {
      await PGCC_AUTH.apiFetch(`/applications/${applicationId}/reject`, { method: 'POST' });
      PGCC_UI.toast('Application declined', 'bi-x-circle');
      document.querySelector('#reviewApplicationModal').classList.remove('open');
      loadApplications();
    } catch (err) {
      PGCC_UI.toast('Could not update: ' + err.message, 'bi-exclamation-triangle');
    }
  }

  /* =========================================================
     MANAGE COURSES + COURSE EDITOR (modules/lessons)
     ========================================================= */
  let currentEditingCourseId = null;
  let lessonQuill = null;
  let currentLessonTarget = null; // { moduleId, lessonId|null }

  async function loadCourses() {
    try {
      liveCourses = await PGCC_AUTH.apiFetch('/courses/admin/all');
    } catch (err) {
      console.warn('Could not load courses, using demo data:', err.message);
      liveCourses = null;
    }
    renderCoursesGrid();
  }

  let activeCourseFilter = 'all';
  function renderCoursesGrid() {
    const grid = document.querySelector('#adminCoursesGrid');
    if (!grid) return;
    const allCourses = Array.isArray(liveCourses) ? liveCourses : D.courses;
    const isLive = Array.isArray(liveCourses);
    const courses = activeCourseFilter === 'all' ? allCourses : allCourses.filter(c => (c.deliveryMode || 'online') === activeCourseFilter);
    grid.innerHTML = courses.map(c => `
      <div class="card">
        <div class="thumb" style="aspect-ratio:16/10;overflow:hidden;position:relative;">
          <img src="${resolveImg(c.image || c.img)}" onerror="${ONERR}" style="width:100%;height:100%;object-fit:cover;" alt="">
          ${isLive ? `<span class="pill ${c.status === 'published' ? 'pill-green' : 'pill-amber'}" style="position:absolute;top:10px;left:10px;">${c.status === 'published' ? 'Published' : 'Draft — Pending Approval'}</span>` : ''}
          <span class="pill ${c.deliveryMode === 'physical' ? 'pill-amber' : 'pill-sky'}" style="position:absolute;top:10px;right:10px;"><i class="bi bi-${c.deliveryMode === 'physical' ? 'building' : 'laptop'}"></i> ${c.deliveryMode === 'physical' ? 'Physical' : 'Online'}</span>
        </div>
        <div class="course-body">
          <span class="course-cat">${c.category || c.cat || '—'}</span>
          <h3 style="font-size:16px;">${c.title}</h3>
          <p class="muted" style="font-size:13px;">${c.duration || '—'} · ${c.price || '—'}</p>
          <div class="row-actions" style="flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" data-edit-course="${c._id || c.id}" ${isLive ? '' : 'disabled title="Connect the backend to edit"'}><i class="bi bi-pencil"></i> Edit</button>
            ${isLive ? (c.status === 'published'
              ? `<button class="btn btn-outline btn-sm" data-unpublish-course="${c._id}"><i class="bi bi-eye-slash"></i> Unpublish</button>`
              : `<button class="btn btn-primary btn-sm" data-publish-course="${c._id}"><i class="bi bi-check2-circle"></i> Approve &amp; Publish</button>`) : ''}
            <button class="icon-btn" data-delete-course="${c._id || c.id}" ${isLive ? '' : 'disabled'}><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>`).join('');

    grid.querySelectorAll('[data-edit-course]').forEach(btn => btn.addEventListener('click', () => openCourseEditor(btn.dataset.editCourse)));
    grid.querySelectorAll('[data-publish-course]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await PGCC_AUTH.apiFetch(`/courses/${btn.dataset.publishCourse}/publish`, { method: 'POST' });
        PGCC_UI.toast('Course approved and published — now visible to students and the public site', 'bi-check2-circle');
        loadCourses();
      } catch (err) { PGCC_UI.toast('Could not publish: ' + err.message, 'bi-exclamation-triangle'); }
    }));
    grid.querySelectorAll('[data-unpublish-course]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await PGCC_AUTH.apiFetch(`/courses/${btn.dataset.unpublishCourse}/unpublish`, { method: 'POST' });
        PGCC_UI.toast('Course unpublished', 'bi-eye-slash');
        loadCourses();
      } catch (err) { PGCC_UI.toast('Could not unpublish: ' + err.message, 'bi-exclamation-triangle'); }
    }));
    grid.querySelectorAll('[data-delete-course]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this course? This cannot be undone.')) return;
      try {
        await PGCC_AUTH.apiFetch(`/courses/${btn.dataset.deleteCourse}`, { method: 'DELETE' });
        PGCC_UI.toast('Course deleted', 'bi-trash3');
        loadCourses();
      } catch (err) { PGCC_UI.toast('Could not delete: ' + err.message, 'bi-exclamation-triangle'); }
    }));

    populateManualCourseSelect();
  }

  // Keeps the walk-in registration course list in sync with the catalog, and
  // filtered to the chosen training mode so physical/online students can't
  // accidentally be enrolled into the wrong kind of course.
  function populateManualCourseSelect() {
    const sel = document.querySelector('#addStudentCourseSelect');
    if (!sel) return;
    const mode = document.querySelector('#addStudentDeliveryModeSelect')?.value || 'online';
    const previous = sel.value;
    const all = Array.isArray(liveCourses) ? liveCourses : D.courses;
    const matching = all.filter(c => (c.deliveryMode || 'online') === mode);
    sel.innerHTML = (matching.length ? matching : all).map(c => `<option>${c.title}</option>`).join('');
    if (matching.some(c => c.title === previous)) sel.value = previous;
  }
  document.querySelector('#addStudentDeliveryModeSelect')?.addEventListener('change', populateManualCourseSelect);
  function resolveImg(src) {
    if (!src) return FALLBACK_IMG;
    if (src.startsWith('/uploads/')) return API_BASE_URL.replace('/api', '') + src;
    return src;
  }

  document.querySelectorAll('.chip[data-course-filter]').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-course-filter]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCourseFilter = chip.dataset.courseFilter;
    renderCoursesGrid();
  }));

  document.querySelector('#addCourseBtn')?.addEventListener('click', () => openCourseEditor(null));

  function openCourseEditor(id) {
    currentEditingCourseId = id;
    const isNew = !id;
    document.querySelector('#courseEditorTitle').textContent = isNew ? 'Add Course' : 'Edit Course';
    document.querySelector('#courseStructureWrap').style.display = isNew ? 'none' : 'block';

    if (isNew) {
      ['courseTitleInput', 'courseCategoryInput', 'courseDurationInput', 'coursePriceInput', 'courseDescriptionInput'].forEach(fid => document.querySelector(`#${fid}`).value = '');
      document.querySelector('#courseLevelInput').value = 'Beginner';
      document.querySelector('#courseDeliveryModeInput').value = 'online';
      document.querySelector('#courseModuleWeightInput').value = 40;
      document.querySelector('#courseExamWeightInput').value = 60;
      document.querySelector('#courseStatusBanner').style.display = 'none';
    } else {
      const course = liveCourses.find(c => c._id === id);
      document.querySelector('#courseTitleInput').value = course.title || '';
      document.querySelector('#courseCategoryInput').value = course.category || '';
      document.querySelector('#courseDurationInput').value = course.duration || '';
      document.querySelector('#coursePriceInput').value = course.price || '';
      document.querySelector('#courseLevelInput').value = course.level || 'Beginner';
      document.querySelector('#courseDeliveryModeInput').value = course.deliveryMode || 'online';
      document.querySelector('#courseDescriptionInput').value = course.description || '';
      document.querySelector('#courseModuleWeightInput').value = course.moduleWeight ?? 40;
      document.querySelector('#courseExamWeightInput').value = course.examWeight ?? 60;
      renderModules(course);
      renderCourseStatusBanner(course);
    }
    document.querySelectorAll('.dash-section').forEach(s => s.classList.toggle('active', s.id === 'course-editor'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCourseStatusBanner(course) {
    const banner = document.querySelector('#courseStatusBanner');
    banner.style.display = 'block';
    if (course.status === 'published') {
      banner.innerHTML = `<div class="flex items-center justify-between" style="flex-wrap:wrap;gap:12px;"><span class="pill pill-green"><i class="bi bi-check2-circle"></i> Published — visible to students and the public site</span><button class="btn btn-outline btn-sm" id="bannerUnpublishBtn"><i class="bi bi-eye-slash"></i> Unpublish</button></div>`;
      document.querySelector('#bannerUnpublishBtn').addEventListener('click', async () => {
        await PGCC_AUTH.apiFetch(`/courses/${course._id}/unpublish`, { method: 'POST' });
        PGCC_UI.toast('Course unpublished', 'bi-eye-slash');
        loadCourses(); openCourseEditor(course._id);
      });
    } else {
      banner.innerHTML = `<div class="flex items-center justify-between" style="flex-wrap:wrap;gap:12px;"><span class="pill pill-amber"><i class="bi bi-hourglass-split"></i> Draft — not visible to students or the public site yet</span><button class="btn btn-primary btn-sm" id="bannerPublishBtn"><i class="bi bi-check2-circle"></i> Approve &amp; Publish</button></div>`;
      document.querySelector('#bannerPublishBtn').addEventListener('click', async () => {
        await PGCC_AUTH.apiFetch(`/courses/${course._id}/publish`, { method: 'POST' });
        PGCC_UI.toast('Course approved and published', 'bi-check2-circle');
        loadCourses(); openCourseEditor(course._id);
      });
    }
  }

  document.querySelector('#courseDetailsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', document.querySelector('#courseTitleInput').value);
    fd.append('category', document.querySelector('#courseCategoryInput').value);
    fd.append('deliveryMode', document.querySelector('#courseDeliveryModeInput').value);
    fd.append('duration', document.querySelector('#courseDurationInput').value);
    fd.append('price', document.querySelector('#coursePriceInput').value);
    fd.append('level', document.querySelector('#courseLevelInput').value);
    fd.append('description', document.querySelector('#courseDescriptionInput').value);
    fd.append('moduleWeight', document.querySelector('#courseModuleWeightInput').value);
    fd.append('examWeight', document.querySelector('#courseExamWeightInput').value);
    const imageFile = document.querySelector('#courseImageInput').files[0];
    if (imageFile) fd.append('image', imageFile);

    const btn = document.querySelector('#saveCourseDetailsBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const token = PGCC_AUTH.token();
      const isNew = !currentEditingCourseId;
      const url = isNew ? `${API_BASE_URL}/courses` : `${API_BASE_URL}/courses/${currentEditingCourseId}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const course = await res.json();
      if (!res.ok) throw new Error(course.error || 'Save failed.');

      currentEditingCourseId = course._id;
      PGCC_UI.toast('Course details saved as a draft — approve & publish when ready', 'bi-check2-circle');
      document.querySelector('#courseEditorTitle').textContent = 'Edit Course';
      document.querySelector('#courseStructureWrap').style.display = 'block';
      renderModules(course);
      renderCourseStatusBanner(course);
      loadCourses();
    } catch (err) {
      PGCC_UI.toast('Could not save: ' + err.message, 'bi-exclamation-triangle');
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  function renderModules(course) {
    const host = document.querySelector('#modulesList');
    if (!course.modules || !course.modules.length) {
      host.innerHTML = `<div class="empty-state"><div class="ic"><i class="bi bi-collection"></i></div><h4>No modules yet</h4><p class="muted">Add your first module to start building this course.</p></div>`;
      return;
    }
    host.innerHTML = course.modules.map(m => `
      <div class="panel" style="background:var(--paper-2);margin-bottom:14px;">
        <div class="flex justify-between items-center" style="margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <div class="flex items-center gap-8" style="flex-wrap:wrap;">
            <b>${m.title}</b>
            <span class="pill pill-outline" style="font-size:11px;"><i class="bi bi-calendar-week"></i> Week ${m.unlockWeek || 1}</span>
            ${m.quiz?.enabled
              ? `<span class="pill pill-green" style="font-size:11px;"><i class="bi bi-patch-question"></i> Quiz: ${m.quiz.questionPool?.length || 0} questions · Pass ${m.quiz.passScore || 80}%</span>`
              : `<span class="pill pill-outline" style="font-size:11px;"><i class="bi bi-patch-question"></i> No quiz</span>`}
          </div>
          <div class="row-actions">
            <button class="icon-btn" data-edit-module="${m._id}" title="Edit module"><i class="bi bi-pencil"></i></button>
            <button class="icon-btn" data-quiz-module="${m._id}" title="Manage quiz"><i class="bi bi-patch-question"></i></button>
            <button class="icon-btn" data-add-lesson="${m._id}" title="Add lesson"><i class="bi bi-plus-lg"></i></button>
            <button class="icon-btn" data-delete-module="${m._id}" title="Delete module"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
        ${m.lessons.length ? m.lessons.map(l => `
          <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-${iconForType(l.contentType)}"></i></div>
          <div class="body"><b>${l.title}</b><span>${l.contentType}</span></div>
          <div class="row-actions"><button class="icon-btn" data-edit-lesson="${m._id}|${l._id}"><i class="bi bi-pencil"></i></button><button class="icon-btn" data-delete-lesson="${m._id}|${l._id}"><i class="bi bi-trash3"></i></button></div></div>`).join('')
          : '<p class="muted" style="font-size:13px;">No lessons in this module yet.</p>'}
      </div>`).join('');

    host.querySelectorAll('[data-add-lesson]').forEach(btn => btn.addEventListener('click', () => openLessonEditor(btn.dataset.addLesson, null)));
    host.querySelectorAll('[data-edit-lesson]').forEach(btn => btn.addEventListener('click', () => {
      const [moduleId, lessonId] = btn.dataset.editLesson.split('|');
      openLessonEditor(moduleId, lessonId);
    }));
    host.querySelectorAll('[data-edit-module]').forEach(btn => btn.addEventListener('click', () => openModuleEditor(btn.dataset.editModule)));
    host.querySelectorAll('[data-quiz-module]').forEach(btn => btn.addEventListener('click', () => openModuleQuiz(btn.dataset.quizModule)));
    host.querySelectorAll('[data-delete-module]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this module and all its lessons?')) return;
      const course = await PGCC_AUTH.apiFetch(`/courses/${currentEditingCourseId}/modules/${btn.dataset.deleteModule}`, { method: 'DELETE' });
      renderModules(course); renderCourseStatusBanner(course); loadCourses();
    }));
    host.querySelectorAll('[data-delete-lesson]').forEach(btn => btn.addEventListener('click', async () => {
      const [moduleId, lessonId] = btn.dataset.deleteLesson.split('|');
      if (!confirm('Delete this lesson?')) return;
      const course = await PGCC_AUTH.apiFetch(`/courses/${currentEditingCourseId}/modules/${moduleId}/lessons/${lessonId}`, { method: 'DELETE' });
      renderModules(course); renderCourseStatusBanner(course); loadCourses();
    }));
  }
  function iconForType(t) {
    return { text: 'file-text', video: 'play-circle', pdf: 'file-earmark-pdf', zip: 'file-earmark-zip', ppt: 'file-earmark-slides' }[t] || 'file-text';
  }

  /* ---------- Add / Edit Module (title + drip unlock week) ---------- */
  let currentModuleTarget = null; // moduleId, or null for a new module
  document.querySelector('#addModuleBtn')?.addEventListener('click', () => openModuleEditor(null));

  function openModuleEditor(moduleId) {
    currentModuleTarget = moduleId;
    const isNew = !moduleId;
    document.querySelector('#moduleFormMsg').style.display = 'none';
    document.querySelector('#moduleEditTitle').textContent = isNew ? 'Add Module' : 'Edit Module';
    if (isNew) {
      document.querySelector('#moduleTitleInput').value = '';
      document.querySelector('#moduleUnlockWeekInput').value = 1;
    } else {
      const course = liveCourses.find(c => c._id === currentEditingCourseId);
      const mod = course.modules.find(m => m._id === moduleId);
      document.querySelector('#moduleTitleInput').value = mod.title;
      document.querySelector('#moduleUnlockWeekInput').value = mod.unlockWeek || 1;
    }
    document.querySelector('#moduleEditModal').classList.add('open');
  }

  document.querySelector('#saveModuleBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#moduleFormMsg');
    msg.style.display = 'none';
    const title = document.querySelector('#moduleTitleInput').value.trim();
    if (!title) { msg.textContent = 'A module title is required.'; msg.style.display = 'block'; return; }
    const unlockWeek = document.querySelector('#moduleUnlockWeekInput').value;

    const btn = document.querySelector('#saveModuleBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const isNew = !currentModuleTarget;
      const url = isNew
        ? `/courses/${currentEditingCourseId}/modules`
        : `/courses/${currentEditingCourseId}/modules/${currentModuleTarget}`;
      const course = await PGCC_AUTH.apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify({ title, unlockWeek }) });
      liveCourses = liveCourses.map(c => c._id === course._id ? course : c);
      renderModules(course); renderCourseStatusBanner(course); loadCourses();
      document.querySelector('#moduleEditModal').classList.remove('open');
      PGCC_UI.toast('Module saved', 'bi-check2-circle');
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* ---------- Module Quiz (question pool, shuffled per attempt) ---------- */
  let currentQuizModuleId = null;
  let quizQuestions = [];

  async function openModuleQuiz(moduleId) {
    currentQuizModuleId = moduleId;
    document.querySelector('#quizFormMsg').style.display = 'none';
    try {
      const quiz = await PGCC_AUTH.apiFetch(`/courses/${currentEditingCourseId}/modules/${moduleId}/quiz`);
      document.querySelector('#quizEnabledInput').checked = !!quiz.enabled;
      document.querySelector('#quizQuestionsPerAttemptInput').value = quiz.questionsPerAttempt || 10;
      document.querySelector('#quizPassScoreInput').value = quiz.passScore || 80;
      quizQuestions = (quiz.questionPool || []).map(q => ({ questionText: q.questionText, options: [...q.options], correctIndex: q.correctIndex }));
      renderQuizQuestions();
      document.querySelector('#moduleQuizModal').classList.add('open');
    } catch (err) {
      PGCC_UI.toast('Could not load quiz: ' + err.message, 'bi-exclamation-triangle');
    }
  }

  function renderQuizQuestions() {
    const host = document.querySelector('#quizQuestionsList');
    if (!quizQuestions.length) {
      host.innerHTML = `<p class="muted" style="font-size:13px;">No questions yet — add at least one before enabling the quiz.</p>`;
      return;
    }
    host.innerHTML = quizQuestions.map((q, i) => `
      <div class="panel" style="background:var(--paper-2);margin-bottom:12px;">
        <div class="flex justify-between items-center" style="margin-bottom:10px;">
          <b style="font-size:13px;">Question ${i + 1}</b>
          <button type="button" class="icon-btn" data-remove-q="${i}"><i class="bi bi-trash3"></i></button>
        </div>
        <div class="form-field"><textarea class="form-control" rows="2" data-q-text="${i}" placeholder="Question text">${q.questionText || ''}</textarea></div>
        <div class="grid grid-2" style="gap:10px;">
          ${[0, 1, 2, 3].map(oi => `
            <div class="flex items-center gap-8">
              <input type="radio" name="correct_${i}" data-q-correct="${i}" value="${oi}" ${Number(q.correctIndex) === oi ? 'checked' : ''}>
              <input class="form-control" data-q-opt="${i}|${oi}" placeholder="Option ${oi + 1}" value="${(q.options && q.options[oi]) || ''}" style="flex:1;">
            </div>`).join('')}
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-remove-q]').forEach(btn => btn.addEventListener('click', () => {
      quizQuestions.splice(Number(btn.dataset.removeQ), 1);
      renderQuizQuestions();
    }));
    host.querySelectorAll('[data-q-text]').forEach(el => el.addEventListener('input', () => {
      quizQuestions[Number(el.dataset.qText)].questionText = el.value;
    }));
    host.querySelectorAll('[data-q-correct]').forEach(el => el.addEventListener('change', () => {
      quizQuestions[Number(el.dataset.qCorrect)].correctIndex = Number(el.value);
    }));
    host.querySelectorAll('[data-q-opt]').forEach(el => el.addEventListener('input', () => {
      const [qi, oi] = el.dataset.qOpt.split('|').map(Number);
      if (!quizQuestions[qi].options) quizQuestions[qi].options = ['', '', '', ''];
      quizQuestions[qi].options[oi] = el.value;
    }));
  }

  document.querySelector('#addQuizQuestionBtn')?.addEventListener('click', () => {
    quizQuestions.push({ questionText: '', options: ['', '', '', ''], correctIndex: 0 });
    renderQuizQuestions();
  });

  document.querySelector('#saveQuizBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#quizFormMsg');
    msg.style.display = 'none';
    const enabled = document.querySelector('#quizEnabledInput').checked;
    const incomplete = quizQuestions.some(q => !q.questionText?.trim() || !q.options || q.options.length !== 4 || q.options.some(o => !o?.trim()) || q.correctIndex === undefined || q.correctIndex === null);
    if (enabled && (!quizQuestions.length || incomplete)) {
      msg.textContent = 'Every question needs text, all 4 options filled in, and a marked correct answer before the quiz can be enabled.';
      msg.style.display = 'block';
      return;
    }

    const btn = document.querySelector('#saveQuizBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      await PGCC_AUTH.apiFetch(`/courses/${currentEditingCourseId}/modules/${currentQuizModuleId}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          enabled,
          questionPool: quizQuestions,
          questionsPerAttempt: Number(document.querySelector('#quizQuestionsPerAttemptInput').value) || 10,
          passScore: Number(document.querySelector('#quizPassScoreInput').value) || 80
        })
      });
      const course = await PGCC_AUTH.apiFetch(`/courses/${currentEditingCourseId}`);
      liveCourses = liveCourses.map(c => c._id === course._id ? course : c);
      renderModules(course);
      document.querySelector('#moduleQuizModal').classList.remove('open');
      PGCC_UI.toast('Quiz saved', 'bi-check2-circle');
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  function openLessonEditor(moduleId, lessonId) {
    currentLessonTarget = { moduleId, lessonId };
    const isNew = !lessonId;
    document.querySelector('#lessonEditorTitle').textContent = isNew ? 'Add Lesson' : 'Edit Lesson';
    document.querySelector('#lessonTitleInput').value = '';
    document.querySelector('#lessonTypeSelect').value = 'text';
    document.querySelector('#lessonVideoInput').value = '';
    document.querySelector('#lessonFileHint').textContent = '';
    toggleLessonTypeFields('text');

    if (!lessonQuill) lessonQuill = initRichEditor('#lessonQuillEditor');
    lessonQuill.root.innerHTML = '';

    if (!isNew) {
      const course = liveCourses.find(c => c._id === currentEditingCourseId);
      const mod = course.modules.find(m => m._id === moduleId);
      const lesson = mod.lessons.find(l => l._id === lessonId);
      document.querySelector('#lessonTitleInput').value = lesson.title;
      document.querySelector('#lessonTypeSelect').value = lesson.contentType;
      toggleLessonTypeFields(lesson.contentType);
      if (lesson.contentType === 'text') lessonQuill.root.innerHTML = lesson.richTextHtml || '';
      if (lesson.contentType === 'video') document.querySelector('#lessonVideoInput').value = lesson.videoUrl || '';
      if (lesson.fileName) document.querySelector('#lessonFileHint').textContent = `Current file: ${lesson.fileName}`;
    }
    document.querySelector('#lessonEditorModal').classList.add('open');
  }

  document.querySelector('#lessonTypeSelect')?.addEventListener('change', (e) => toggleLessonTypeFields(e.target.value));
  function toggleLessonTypeFields(type) {
    document.querySelector('#lessonTextWrap').style.display = type === 'text' ? 'block' : 'none';
    document.querySelector('#lessonVideoWrap').style.display = type === 'video' ? 'block' : 'none';
    document.querySelector('#lessonFileWrap').style.display = ['pdf', 'zip', 'ppt'].includes(type) ? 'block' : 'none';
  }

  document.querySelector('#saveLessonBtn')?.addEventListener('click', async () => {
    const { moduleId, lessonId } = currentLessonTarget;
    const type = document.querySelector('#lessonTypeSelect').value;
    const fd = new FormData();
    fd.append('title', document.querySelector('#lessonTitleInput').value);
    fd.append('contentType', type);
    if (type === 'text') fd.append('richTextHtml', lessonQuill.root.innerHTML);
    if (type === 'video') fd.append('videoUrl', document.querySelector('#lessonVideoInput').value);
    const file = document.querySelector('#lessonFileInput').files[0];
    if (file) fd.append('file', file);

    const btn = document.querySelector('#saveLessonBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const token = PGCC_AUTH.token();
      const isNew = !lessonId;
      const url = isNew
        ? `${API_BASE_URL}/courses/${currentEditingCourseId}/modules/${moduleId}/lessons`
        : `${API_BASE_URL}/courses/${currentEditingCourseId}/modules/${moduleId}/lessons/${lessonId}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const course = await res.json();
      if (!res.ok) throw new Error(course.error || 'Save failed.');
      liveCourses = liveCourses.map(c => c._id === course._id ? course : c);
      renderModules(course);
      renderCourseStatusBanner(course);
      loadCourses();
      document.querySelector('#lessonEditorModal').classList.remove('open');
      PGCC_UI.toast('Lesson saved', 'bi-check2-circle');
    } catch (err) {
      PGCC_UI.toast('Could not save lesson: ' + err.message, 'bi-exclamation-triangle');
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     ANNOUNCEMENTS / NEWS
     ========================================================= */
  let newsQuill = null;
  let editingNewsId = null;

  async function loadAnnouncements() {
    try {
      liveAnnouncements = await fetch(`${API_BASE_URL}/announcements`).then(r => r.json());
    } catch (err) {
      console.warn('Could not load announcements, using demo data:', err.message);
      liveAnnouncements = null;
    }
    renderAdminNews();
  }
  function renderAdminNews() {
    const grid = document.querySelector('#adminNewsGrid');
    if (!grid) return;
    const items = Array.isArray(liveAnnouncements) ? liveAnnouncements : D.news;
    const isLive = Array.isArray(liveAnnouncements);
    grid.innerHTML = items.map((n, i) => `
      <div class="card">
        <div class="thumb" style="aspect-ratio:16/10;overflow:hidden;"><img src="${resolveImg(n.image || n.img)}" onerror="${ONERR}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>
        <div class="course-body">
          <span class="course-cat">${n.category || n.cat} · ${isLive ? new Date(n.createdAt).toLocaleDateString() : n.date}</span>
          <h3 style="font-size:16px;">${n.title}</h3>
          <p class="muted" style="font-size:13px;">${n.excerpt}</p>
          <div class="row-actions">
            <button class="icon-btn" data-edit-news="${isLive ? n._id : i}" ${isLive ? '' : 'disabled'}><i class="bi bi-pencil"></i></button>
            <button class="icon-btn" data-del-news="${isLive ? n._id : i}"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>`).join('');

    grid.querySelectorAll('[data-edit-news]').forEach(btn => btn.addEventListener('click', () => openNewsModal(btn.dataset.editNews)));
    grid.querySelectorAll('[data-del-news]').forEach(btn => btn.addEventListener('click', async () => {
      if (!isLive) { D.news.splice(parseInt(btn.dataset.delNews), 1); renderAdminNews(); return; }
      if (!confirm('Delete this article?')) return;
      try {
        await PGCC_AUTH.apiFetch(`/announcements/${btn.dataset.delNews}`, { method: 'DELETE' });
        PGCC_UI.toast('Article removed', 'bi-trash3');
        loadAnnouncements();
      } catch (err) { PGCC_UI.toast('Could not delete: ' + err.message, 'bi-exclamation-triangle'); }
    }));
  }

  document.querySelector('#newArticleBtn')?.addEventListener('click', () => openNewsModal(null));

  function openNewsModal(id) {
    editingNewsId = id;
    document.querySelector('#newsModalTitle').textContent = id ? 'Edit Article' : 'New Article';
    document.querySelector('#newsTitleInput').value = '';
    document.querySelector('#newsExcerptInput').value = '';
    document.querySelector('#newsCategoryInput').value = 'Notice';
    document.querySelector('#newsFormMsg').style.display = 'none';
    if (!newsQuill) newsQuill = initRichEditor('#newsQuillEditor');
    newsQuill.root.innerHTML = '';

    if (id && Array.isArray(liveAnnouncements)) {
      const a = liveAnnouncements.find(x => x._id === id);
      document.querySelector('#newsTitleInput').value = a.title;
      document.querySelector('#newsExcerptInput').value = a.excerpt || '';
      document.querySelector('#newsCategoryInput').value = a.category || 'Notice';
      newsQuill.root.innerHTML = a.bodyHtml || '';
    }
    document.querySelector('#addNewsModal').classList.add('open');
  }

  document.querySelector('#saveNewsBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#newsFormMsg');
    msg.style.display = 'none';
    const title = document.querySelector('#newsTitleInput').value.trim();
    if (!title) { msg.textContent = 'Title is required.'; msg.style.display = 'block'; return; }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('excerpt', document.querySelector('#newsExcerptInput').value);
    fd.append('category', document.querySelector('#newsCategoryInput').value);
    fd.append('bodyHtml', newsQuill.root.innerHTML);
    const imageFile = document.querySelector('#newsImageInput').files[0];
    if (imageFile) fd.append('image', imageFile);
    const attachmentFile = document.querySelector('#newsAttachmentInput').files[0];
    if (attachmentFile) fd.append('attachment', attachmentFile);

    const btn = document.querySelector('#saveNewsBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Publishing…';
    try {
      const token = PGCC_AUTH.token();
      const url = editingNewsId ? `${API_BASE_URL}/announcements/${editingNewsId}` : `${API_BASE_URL}/announcements`;
      const res = await fetch(url, { method: editingNewsId ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publish failed.');
      PGCC_UI.toast('Article published', 'bi-newspaper');
      document.querySelector('#addNewsModal').classList.remove('open');
      loadAnnouncements();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     MY PROFILE
     ========================================================= */
  document.querySelector('#profileNameInput').value = PGCC_UI.user.name || '';
  document.querySelector('#profileEmailInput').value = PGCC_AUTH.session()?.email || '';
  document.querySelector('#profileImagePreview').src = PGCC_UI.user.avatar || FALLBACK_IMG;
  document.querySelector('#profileImagePreview').setAttribute('data-user-avatar', ''); // keeps this in sync automatically once the real photo loads
  document.querySelector('#profileImagePreview').onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };

  document.querySelector('#profileImageBtn')?.addEventListener('click', () => document.querySelector('#profileImageInput').click());
  document.querySelector('#profileImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.querySelector('#profileImagePreview').src = URL.createObjectURL(file);
  });
  document.querySelector('#profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#profileFormMsg');
    msg.style.display = 'none';
    const fd = new FormData();
    fd.append('name', document.querySelector('#profileNameInput').value);
    const file = document.querySelector('#profileImageInput').files[0];
    if (file) fd.append('image', file);

    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const token = PGCC_AUTH.token();
      const res = await fetch(`${API_BASE_URL}/admin/profile`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const admin = await res.json();
      if (!res.ok) throw new Error(admin.error || 'Save failed.');

      // Update everywhere this could be shown, right now, without needing a reload.
      PGCC_UI.user.name = admin.name;
      if (admin.profileImage) PGCC_UI.user.avatar = resolveUploadUrl(admin.profileImage);
      const s = PGCC_AUTH.session();
      s.name = admin.name;
      s.profileImage = admin.profileImage || '';
      localStorage.setItem(PGCC_AUTH.activeKey, JSON.stringify(s));
      PGCC_UI.fillUser();
      document.querySelector('#profileImagePreview').src = PGCC_UI.user.avatar || FALLBACK_IMG;

      msg.className = 'pill pill-green';
      msg.textContent = 'Profile updated successfully.';
      msg.style.display = 'block';
    } catch (err) {
      msg.className = 'pill pill-coral';
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     WEBSITE SETTINGS
     ========================================================= */
  document.querySelectorAll('.settings-tabs button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = p.id === btn.dataset.pane ? 'block' : 'none');
  }));

  async function loadSettings() {
    try {
      const s = await PGCC_AUTH.apiFetch('/admin/settings');
      document.querySelector('#setSchoolName').value = s.schoolName || '';
      document.querySelector('#setShortName').value = s.shortName || '';
      document.querySelector('#setAddress').value = s.address || '';
      document.querySelector('#setPhone').value = s.phone || '';
      document.querySelector('#setEmail').value = s.email || '';
      document.querySelector('#setPrimaryColor').value = s.primaryColor || '#17a34a';
      if (s.logoUrl) document.querySelector('#setLogoPreview').src = resolveUploadUrl(s.logoUrl);
      document.querySelector('#setEmailNotif').checked = !!s.emailNotifications;
      document.querySelector('#setSmsAlerts').checked = !!s.smsAlerts;
      document.querySelector('#setWeeklyDigest').checked = !!s.weeklyDigest;
      document.querySelector('#setTwoFactor').checked = !!s.twoFactorRequired;
      document.querySelector('#setAutoLogout').value = s.autoLogoutMinutes ?? 30;
    } catch (err) {
      console.warn('Could not load settings, form will use blank defaults until saved:', err.message);
    }
  }
  document.querySelector('#setLogoBtn')?.addEventListener('click', () => document.querySelector('#setLogoInput').click());
  document.querySelector('#setLogoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) document.querySelector('#setLogoPreview').src = URL.createObjectURL(file);
  });
  document.querySelector('#settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#settingsMsg');
    msg.style.display = 'none';
    const fd = new FormData();
    fd.append('schoolName', document.querySelector('#setSchoolName').value);
    fd.append('shortName', document.querySelector('#setShortName').value);
    fd.append('address', document.querySelector('#setAddress').value);
    fd.append('phone', document.querySelector('#setPhone').value);
    fd.append('email', document.querySelector('#setEmail').value);
    fd.append('primaryColor', document.querySelector('#setPrimaryColor').value);
    fd.append('emailNotifications', document.querySelector('#setEmailNotif').checked);
    fd.append('smsAlerts', document.querySelector('#setSmsAlerts').checked);
    fd.append('weeklyDigest', document.querySelector('#setWeeklyDigest').checked);
    fd.append('twoFactorRequired', document.querySelector('#setTwoFactor').checked);
    fd.append('autoLogoutMinutes', document.querySelector('#setAutoLogout').value);
    const logoFile = document.querySelector('#setLogoInput').files[0];
    if (logoFile) fd.append('logo', logoFile);

    const btn = document.querySelector('#saveSettingsBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const token = PGCC_AUTH.token();
      const res = await fetch(`${API_BASE_URL}/admin/settings`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed.');
      msg.className = 'pill pill-green';
      msg.textContent = 'Settings saved successfully.';
      msg.style.display = 'block';
      PGCC_UI.toast('Settings saved', 'bi-check2-circle');
    } catch (err) {
      msg.className = 'pill pill-coral';
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });
  loadSettings();

  /* =========================================================
     REPORTS + ANALYTICS — both driven by real computed data.
     Anything with no real tracking system yet (completion rate,
     satisfaction scores) has been removed rather than faked.
     ========================================================= */
  async function loadAnalytics() {
    let a = null;
    try {
      a = await PGCC_AUTH.apiFetch('/admin/analytics');
    } catch (err) {
      console.warn('Could not load analytics, showing zeros instead of fake numbers:', err.message);
    }
    renderReports(a);
    renderAnalyticsSummary(a);
  }

  function renderReports(a) {
    const reportHost = document.querySelector('#adminReportsGrid');
    if (reportHost) {
      if (a) {
        reportHost.innerHTML = `
          <div class="stat-card"><div class="top"><div class="ic g"><i class="bi bi-cash-stack"></i></div></div><b class="num">₦${a.totalRevenue.toLocaleString()}</b><span class="label">Total Revenue</span></div>
          <div class="stat-card"><div class="top"><div class="ic s"><i class="bi bi-credit-card"></i></div></div><b class="num">₦${a.onlineTotal.toLocaleString()}</b><span class="label">Online Payments</span></div>
          <div class="stat-card"><div class="top"><div class="ic a"><i class="bi bi-cash"></i></div></div><b class="num">₦${a.cashTotal.toLocaleString()}</b><span class="label">Cash Payments</span></div>`;
      } else {
        reportHost.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic"><i class="bi bi-bar-chart"></i></div><h4>Analytics unavailable</h4><p class="muted">Connect the backend to see real numbers here.</p></div>`;
      }
    }

    const revenueChart = document.querySelector('#revenueBars');
    if (revenueChart) {
      const months = a ? Object.entries(a.revenueByMonth) : [];
      if (!months.length) {
        revenueChart.innerHTML = `<p class="muted" style="font-size:13.5px;">No payments recorded yet.</p>`;
        return;
      }
      const max = Math.max(...months.map(([, v]) => v), 1);
      revenueChart.innerHTML = months.map(([label, val], i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">
          <div style="width:100%;height:160px;display:flex;align-items:flex-end;">
            <div title="₦${val.toLocaleString()}" style="width:100%;background:linear-gradient(180deg,var(--green-400),var(--green-700));border-radius:6px 6px 0 0;height:0%;transition:height 1s cubic-bezier(.22,1,.36,1) ${i*0.06}s;" data-h="${Math.round((val/max)*100)}"></div>
          </div>
          <span class="muted" style="font-size:11px;">${label}</span>
        </div>`).join('');
      requestAnimationFrame(() => { revenueChart.querySelectorAll('[data-h]').forEach(bar => bar.style.height = bar.dataset.h + '%'); });
    }
  }

  function renderAnalyticsSummary(a) {
    const analyticsHost = document.querySelector('#analyticsSummary');
    if (analyticsHost) {
      if (a) {
        analyticsHost.innerHTML = `
          <div class="stat-block"><b>${a.totalStudents.toLocaleString()}</b><span>Total Students</span></div>
          <div class="stat-block"><b>${a.totalInstructors}</b><span>Instructors</span></div>
          <div class="stat-block"><b>${a.totalCourses}</b><span>Active Courses</span></div>
          <div class="stat-block"><b>₦${a.totalRevenue.toLocaleString()}</b><span>Total Revenue</span></div>`;
      } else {
        analyticsHost.innerHTML = `<div class="stat-block"><b>—</b><span>Connect the backend for real numbers</span></div>`;
      }
    }
    const catHost = document.querySelector('#analyticsCategoryList');
    if (catHost) {
      const entries = a ? Object.entries(a.enrollmentByCourse) : [];
      catHost.innerHTML = entries.length ? entries.map(([course, count]) => `
        <div class="list-row"><div class="body"><b>${course}</b><span>${count} student${count === 1 ? '' : 's'}</span></div>
        <div class="meta" style="width:120px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${Math.min(100, count * 10)}"></div></div></div></div>`).join('')
        : '<p class="muted" style="font-size:13.5px;">No enrollments yet.</p>';
      PGCC_UI.animateVinesOnLoad();
    }
    const modeHost = document.querySelector('#analyticsModeList');
    if (modeHost) {
      const modes = a ? a.enrollmentByDeliveryMode : null;
      const total = modes ? modes.online + modes.physical : 0;
      modeHost.innerHTML = total ? `
        <div class="list-row"><div class="ic" style="background:#e4f2fb;color:#1f5f85;"><i class="bi bi-laptop"></i></div><div class="body"><b>Online Training</b><span>${modes.online} student${modes.online === 1 ? '' : 's'}</span></div>
        <div class="meta" style="width:120px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${Math.round((modes.online / total) * 100)}"></div></div></div></div>
        <div class="list-row"><div class="ic" style="background:#fdf1dc;color:var(--amber-ink);"><i class="bi bi-building"></i></div><div class="body"><b>Physical Training</b><span>${modes.physical} student${modes.physical === 1 ? '' : 's'}</span></div>
        <div class="meta" style="width:120px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${Math.round((modes.physical / total) * 100)}"></div></div></div></div>`
        : '<p class="muted" style="font-size:13.5px;">No enrollments yet.</p>';
      PGCC_UI.animateVinesOnLoad();
    }
    const ringHost = document.querySelector('#analyticsRing');
    if (ringHost) {
      if (a && a.totalStudents > 0) {
        const pctPaid = a.totalRevenue > 0 ? 100 : 0; // placeholder-free: just shows revenue exists or not
        ringHost.innerHTML = `<p class="muted" style="font-size:13px;">Completion-rate tracking isn't built yet — this will show real progress data once lesson completion is tracked per student.</p>`;
      } else {
        ringHost.innerHTML = `<p class="muted" style="font-size:13px;">No data yet.</p>`;
      }
    }
  }

  /* =========================================================
     CERTIFICATES (dummy data cleared — real issuance is a future phase)
     ========================================================= */
  const certAdminBody = document.querySelector('#adminCertificatesBody');
  if (certAdminBody) certAdminBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="ic"><i class="bi bi-patch-check"></i></div><h4>No certificates issued yet</h4><p class="muted">Certificate issuance isn't wired up yet — this will populate once that system is built.</p></div></td></tr>`;

  /* ---------------- helpers ---------------- */
  function statusBadge(status) {
    const map = { active: ['on', 'Active'], graduated: ['on', 'Graduated'], suspended: ['off', 'Suspended'] };
    const [dot, label] = map[status] || ['wait', status];
    return `<span class="status-dot ${dot}"></span>${label}`;
  }
  function payBadge(status) {
    const map = { paid: 'pill-green', partial: 'pill-amber', overdue: 'pill-coral' };
    return `<span class="pill ${map[status]}">${status}</span>`;
  }

  /* =========================================================
     EXAMS (admin) — create/edit via paste-parsing, CSV/text import,
     or manual entry. Questions stay editable right up to save.
     ========================================================= */
  let currentExamId = null;
  let currentQuestions = [];

  async function loadExams() {
    const body = document.querySelector('#adminExamsBody');
    if (!body) return;
    try {
      const exams = await PGCC_AUTH.apiFetch('/exams');
      if (!exams.length) {
        body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-pencil-square"></i></div><h4>No exams yet</h4></div></td></tr>`;
        return;
      }
      // Grouped by course (server already sorts this way) so exams read as
      // organized sections rather than one scattered flat list.
      const groups = {};
      exams.forEach(e => { (groups[e.course] = groups[e.course] || []).push(e); });

      body.innerHTML = Object.entries(groups).map(([course, list]) => `
        <tr class="group-header-row"><td colspan="6" style="background:var(--paper-2);padding:12px 16px;"><b style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--green-700);"><i class="bi bi-collection"></i> ${course}</b> <span class="muted" style="font-size:12px;">(${list.length})</span></td></tr>
        ${list.map(e => `
        <tr><td><b>${e.title}</b></td><td>${e.course}</td><td>${e.durationMinutes} min</td><td>${e.questionCount}</td>
        <td>${e.requiredModulesCompleted > 0 ? `<span class="pill pill-outline" style="font-size:11px;">${e.requiredModulesCompleted} module${e.requiredModulesCompleted === 1 ? '' : 's'}</span>` : `<span class="muted" style="font-size:12.5px;">No restriction</span>`}</td>
        <td class="row-actions"><button class="icon-btn" data-edit-exam="${e._id}"><i class="bi bi-pencil"></i></button><button class="icon-btn" data-delete-exam="${e._id}"><i class="bi bi-trash3"></i></button></td></tr>`).join('')}`).join('');

      body.querySelectorAll('[data-edit-exam]').forEach(btn => btn.addEventListener('click', () => openExamEditor(btn.dataset.editExam)));
      body.querySelectorAll('[data-delete-exam]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Delete this exam? All student attempts for it will be removed too.')) return;
        await PGCC_AUTH.apiFetch(`/exams/${btn.dataset.deleteExam}`, { method: 'DELETE' });
        PGCC_UI.toast('Exam deleted', 'bi-trash3');
        loadExams();
      }));
    } catch (err) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-exclamation-triangle"></i></div><h4>Could not load — is the backend running?</h4></div></td></tr>`;
    }
  }

  async function openExamEditor(id) {
    currentExamId = id;
    currentQuestions = [];
    document.querySelector('#examEditorTitle').textContent = id ? 'Edit Exam' : 'Create Exam';
    document.querySelector('#examTitleInput').value = '';
    document.querySelector('#examDurationInput').value = 30;
    document.querySelector('#examRequiredModulesInput').value = 0;
    document.querySelector('#examPasteInput').value = '';
    document.querySelector('#examEditorMsg').style.display = 'none';

    const courseSel = document.querySelector('#examCourseSelectInput');
    courseSel.innerHTML = (Array.isArray(liveCourses) ? liveCourses : D.courses).map(c => `<option>${c.title}</option>`).join('');

    if (id) {
      try {
        const exam = await PGCC_AUTH.apiFetch(`/exams/${id}`);
        document.querySelector('#examTitleInput').value = exam.title;
        document.querySelector('#examDurationInput').value = exam.durationMinutes;
        document.querySelector('#examRequiredModulesInput').value = exam.requiredModulesCompleted || 0;
        courseSel.value = exam.course;
        currentQuestions = exam.questions.map(q => ({ ...q }));
      } catch (err) {
        PGCC_UI.toast('Could not load exam: ' + err.message, 'bi-exclamation-triangle');
      }
    }
    renderQuestionBank();
    document.querySelectorAll('.dash-section').forEach(s => s.classList.toggle('active', s.id === 'exam-editor'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelector('#addExamBtn')?.addEventListener('click', () => openExamEditor(null));

  /* ---------- Parsing: numbered "1. Question / A. / B. / C. / D. / Correct Answer: X" format ---------- */
  function parseNumberedFormat(text) {
    const blocks = text.split(/\n(?=\s*\d+[.)])/).map(b => b.trim()).filter(Boolean);
    const parsed = [];
    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return;
      const questionText = lines[0].replace(/^\d+[.)]\s*/, '');
      const options = [];
      let correctIndex = -1;
      lines.slice(1).forEach(line => {
        const optMatch = line.match(/^([A-D])[.)]\s*(.+)$/i);
        if (optMatch) { options.push(optMatch[2].trim()); return; }
        const ansMatch = line.match(/correct\s*answer\s*:?\s*([A-D])/i);
        if (ansMatch) correctIndex = 'ABCD'.indexOf(ansMatch[1].toUpperCase());
      });
      if (questionText && options.length === 4 && correctIndex >= 0) {
        parsed.push({ questionText, options, correctIndex, imageUrl: '' });
      }
    });
    return parsed;
  }

  /* ---------- Parsing: pipe-delimited "Question | A | B | C | D | CorrectLetter" format ---------- */
  function parseDelimitedFormat(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 6) return;
      const [questionText, a, b, c, d, answer] = parts;
      let correctIndex = 'ABCD'.indexOf(answer.toUpperCase());
      if (correctIndex === -1) correctIndex = [a, b, c, d].findIndex(o => o.toLowerCase() === answer.toLowerCase());
      if (questionText && correctIndex >= 0) parsed.push({ questionText, options: [a, b, c, d], correctIndex, imageUrl: '' });
    });
    return parsed;
  }

  document.querySelector('#parsePastedBtn')?.addEventListener('click', () => {
    const text = document.querySelector('#examPasteInput').value.trim();
    if (!text) return;
    const parsed = /correct\s*answer/i.test(text) ? parseNumberedFormat(text) : parseDelimitedFormat(text);
    if (!parsed.length) { PGCC_UI.toast('Could not parse any questions — check the format matches the example', 'bi-exclamation-triangle'); return; }
    currentQuestions = currentQuestions.concat(parsed);
    document.querySelector('#examPasteInput').value = '';
    renderQuestionBank();
    PGCC_UI.toast(`${parsed.length} question(s) parsed and added`, 'bi-check2-circle');
  });

  document.querySelector('#examFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseDelimitedFormat(String(reader.result));
      if (!parsed.length) { PGCC_UI.toast('No valid rows found in that file', 'bi-exclamation-triangle'); return; }
      currentQuestions = currentQuestions.concat(parsed);
      renderQuestionBank();
      PGCC_UI.toast(`${parsed.length} question(s) imported`, 'bi-check2-circle');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.querySelector('#addQuestionManualBtn')?.addEventListener('click', () => {
    currentQuestions.push({ questionText: '', options: ['', '', '', ''], correctIndex: 0, imageUrl: '' });
    renderQuestionBank();
  });

  function renderQuestionBank() {
    document.querySelector('#questionCount').textContent = currentQuestions.length;
    const host = document.querySelector('#questionBankList');
    if (!currentQuestions.length) {
      host.innerHTML = `<p class="muted" style="font-size:13.5px;">No questions yet — paste formatted text above, import a file, or add one manually.</p>`;
      return;
    }
    host.innerHTML = currentQuestions.map((q, i) => `
      <div class="panel" style="background:var(--paper-2);margin-bottom:14px;">
        <div class="flex justify-between items-center" style="margin-bottom:10px;"><b>Question ${i + 1}</b><button type="button" class="icon-btn" data-remove-q="${i}"><i class="bi bi-trash3"></i></button></div>
        <div class="form-field"><input class="form-control" data-q="${i}" data-field="questionText" value="${escapeAttr(q.questionText)}" placeholder="Question text"></div>
        <div class="form-row">
          ${[0, 1].map(oi => `<div class="form-field"><label class="flex items-center gap-8" style="font-size:12.5px;"><input type="radio" name="correct-${i}" data-q="${i}" data-correct="${oi}" ${q.correctIndex === oi ? 'checked' : ''}> Option ${'ABCD'[oi]}${oi===q.correctIndex?' (correct)':''}</label><input class="form-control" data-q="${i}" data-field="opt${oi}" value="${escapeAttr(q.options[oi] || '')}" placeholder="Option ${'ABCD'[oi]}"></div>`).join('')}
        </div>
        <div class="form-row">
          ${[2, 3].map(oi => `<div class="form-field"><label class="flex items-center gap-8" style="font-size:12.5px;"><input type="radio" name="correct-${i}" data-q="${i}" data-correct="${oi}" ${q.correctIndex === oi ? 'checked' : ''}> Option ${'ABCD'[oi]}${oi===q.correctIndex?' (correct)':''}</label><input class="form-control" data-q="${i}" data-field="opt${oi}" value="${escapeAttr(q.options[oi] || '')}" placeholder="Option ${'ABCD'[oi]}"></div>`).join('')}
        </div>
      </div>`).join('');

    host.querySelectorAll('input[data-field]').forEach(inp => inp.addEventListener('input', () => {
      const qi = parseInt(inp.dataset.q);
      const field = inp.dataset.field;
      if (field === 'questionText') currentQuestions[qi].questionText = inp.value;
      else currentQuestions[qi].options[parseInt(field.replace('opt', ''))] = inp.value;
    }));
    host.querySelectorAll('input[data-correct]').forEach(radio => radio.addEventListener('change', () => {
      currentQuestions[parseInt(radio.dataset.q)].correctIndex = parseInt(radio.dataset.correct);
    }));
    host.querySelectorAll('[data-remove-q]').forEach(btn => btn.addEventListener('click', () => {
      currentQuestions.splice(parseInt(btn.dataset.removeQ), 1);
      renderQuestionBank();
    }));
  }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  document.querySelector('#saveExamBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#examEditorMsg');
    msg.style.display = 'none';
    const title = document.querySelector('#examTitleInput').value.trim();
    const course = document.querySelector('#examCourseSelectInput').value;
    const durationMinutes = Number(document.querySelector('#examDurationInput').value) || 30;
    const requiredModulesCompleted = Number(document.querySelector('#examRequiredModulesInput').value) || 0;

    if (!title || !course) { msg.textContent = 'Title and course are required.'; msg.style.display = 'block'; return; }
    if (!currentQuestions.length) { msg.textContent = 'Add at least one question first.'; msg.style.display = 'block'; return; }
    const invalid = currentQuestions.some(q => !q.questionText || q.options.some(o => !o));
    if (invalid) { msg.textContent = 'Every question needs text and all 4 options filled in.'; msg.style.display = 'block'; return; }

    const btn = document.querySelector('#saveExamBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const payload = { title, course, durationMinutes, questions: currentQuestions };
      if (currentExamId) await PGCC_AUTH.apiFetch(`/exams/${currentExamId}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await PGCC_AUTH.apiFetch('/exams', { method: 'POST', body: JSON.stringify(payload) });
      PGCC_UI.toast('Exam saved', 'bi-check2-circle');
      document.querySelector('.side-link[data-section="manage-exams"]')?.click();
      loadExams();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* =========================================================
     BROADCAST HUB
     ========================================================= */
  let broadcastQuill = null;
  let broadcastChannel = 'both';
  let broadcastAudience = 'all';

  document.querySelectorAll('.broadcast-channel-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.broadcast-channel-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    broadcastChannel = btn.dataset.channel;
  }));
  document.querySelectorAll('.broadcast-audience-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.broadcast-audience-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    broadcastAudience = btn.dataset.audience;
    document.querySelector('#broadcastCategoryWrap').style.display = broadcastAudience === 'category' ? 'block' : 'none';
    document.querySelector('#broadcastIndividualWrap').style.display = broadcastAudience === 'individual' ? 'block' : 'none';
  }));

  async function loadBroadcastForm() {
    if (!broadcastQuill) broadcastQuill = initRichEditor('#broadcastQuillEditor');
    try {
      const categories = await PGCC_AUTH.apiFetch('/admin/broadcast/categories');
      document.querySelector('#broadcastCategorySelect').innerHTML = categories.map(c => `<option value="${c.category}">${c.category} (${c.studentCount})</option>`).join('') || '<option value="">No categories yet</option>';
    } catch (err) { console.warn('Could not load broadcast categories:', err.message); }

    if (Array.isArray(liveStudents)) {
      document.querySelector('#broadcastStudentSelect').innerHTML = liveStudents.map(s => `<option value="${s._id}">${s.name} — ${s.email}</option>`).join('');
    }
  }

  document.querySelector('#sendBroadcastBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#broadcastMsg');
    msg.style.display = 'none';
    const title = document.querySelector('#broadcastTitleInput').value.trim();
    const bodyHtml = broadcastQuill.root.innerHTML;
    if (!title || broadcastQuill.getText().trim().length < 2) { msg.textContent = 'Add a subject and a message.'; msg.style.display = 'block'; return; }

    const payload = { title, bodyHtml, channel: broadcastChannel, recipientType: broadcastAudience };
    if (broadcastAudience === 'category') payload.category = document.querySelector('#broadcastCategorySelect').value;
    if (broadcastAudience === 'individual') payload.userIds = Array.from(document.querySelector('#broadcastStudentSelect').selectedOptions).map(o => o.value);

    const btn = document.querySelector('#sendBroadcastBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sending…';
    try {
      const result = await PGCC_AUTH.apiFetch('/admin/broadcast', { method: 'POST', body: JSON.stringify(payload) });
      PGCC_UI.toast(`Sent to ${result.recipientCount} student(s)${payload.channel !== 'notification' ? ` (${result.emailsSent} emails delivered${result.emailsFailed ? `, ${result.emailsFailed} failed` : ''})` : ''}`, 'bi-check2-circle');
      document.querySelector('#broadcastTitleInput').value = '';
      broadcastQuill.setText('');
      loadBroadcastHistory();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  async function loadBroadcastHistory() {
    const host = document.querySelector('#broadcastHistory');
    if (!host) return;
    try {
      const history = await PGCC_AUTH.apiFetch('/admin/broadcast/history');
      host.innerHTML = history.length ? history.map(h => `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-${h.channel === 'email' ? 'envelope' : h.channel === 'notification' ? 'bell' : 'envelope-check'}"></i></div>
        <div class="body"><b>${h.title}</b><span>${h.recipientType === 'all' ? 'All students' : h.recipientType === 'category' ? `Category: ${h.category}` : 'Selected students'} · ${h.recipientCount} recipient(s)</span></div>
        <div class="meta">${new Date(h.createdAt).toLocaleDateString()}</div></div>`).join('')
        : '<p class="muted" style="font-size:13.5px;">No broadcasts sent yet.</p>';
    } catch (err) {
      host.innerHTML = `<p class="muted" style="font-size:13.5px;">Could not load history.</p>`;
    }
  }

  /* ---------------- Assignments ---------------- */
  let currentAssignmentTarget = null; // assignment id, or null for a new one

  async function loadAssignments() {
    const body = document.querySelector('#adminAssignmentsBody');
    if (!body) return;
    try {
      const assignments = await PGCC_AUTH.apiFetch('/assignments');
      if (!assignments.length) {
        body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="ic"><i class="bi bi-list-check"></i></div><h4>No assignments yet</h4></div></td></tr>`;
        return;
      }
      const groups = {};
      assignments.forEach(a => { (groups[a.course] = groups[a.course] || []).push(a); });

      body.innerHTML = Object.entries(groups).map(([course, list]) => `
        <tr class="group-header-row"><td colspan="5" style="background:var(--paper-2);padding:12px 16px;"><b style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--green-700);"><i class="bi bi-collection"></i> ${course}</b> <span class="muted" style="font-size:12px;">(${list.length})</span></td></tr>
        ${list.map(a => `
        <tr>
          <td><b>${a.title}</b>${a.attachmentUrl ? `<br><span class="muted" style="font-size:11.5px;"><i class="bi bi-paperclip"></i> ${a.attachmentName}</span>` : ''}</td>
          <td>${a.course}</td>
          <td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
          <td>${a.submittedCount} submitted${a.submittedCount ? ` · ${a.gradedCount} graded` : ''}</td>
          <td class="row-actions">
            <button class="btn btn-outline btn-sm" data-view-submissions="${a._id}"><i class="bi bi-inbox"></i> Submissions</button>
            <button class="icon-btn" data-edit-assignment="${a._id}"><i class="bi bi-pencil"></i></button>
            <button class="icon-btn" data-delete-assignment="${a._id}"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>`).join('')}`).join('');

      body.querySelectorAll('[data-edit-assignment]').forEach(btn => btn.addEventListener('click', () => openAssignmentEditor(btn.dataset.editAssignment)));
      body.querySelectorAll('[data-view-submissions]').forEach(btn => btn.addEventListener('click', () => openSubmissionsModal(btn.dataset.viewSubmissions)));
      body.querySelectorAll('[data-delete-assignment]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Delete this assignment and every student submission for it?')) return;
        await PGCC_AUTH.apiFetch(`/assignments/${btn.dataset.deleteAssignment}`, { method: 'DELETE' });
        PGCC_UI.toast('Assignment deleted', 'bi-trash3');
        loadAssignments();
      }));
    } catch (err) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="ic"><i class="bi bi-exclamation-triangle"></i></div><h4>Could not load — is the backend running?</h4></div></td></tr>`;
    }
  }

  document.querySelector('#addAssignmentBtn')?.addEventListener('click', () => openAssignmentEditor(null));

  async function openAssignmentEditor(id) {
    currentAssignmentTarget = id;
    const msg = document.querySelector('#assignmentFormMsg');
    msg.style.display = 'none';
    document.querySelector('#assignmentEditorTitle').textContent = id ? 'Edit Assignment' : 'Create Assignment';
    document.querySelector('#assignmentAttachmentInput').value = '';

    const courseSel = document.querySelector('#assignmentCourseSelectInput');
    courseSel.innerHTML = (Array.isArray(liveCourses) ? liveCourses : D.courses).map(c => `<option>${c.title}</option>`).join('');

    if (!id) {
      document.querySelector('#assignmentTitleInput').value = '';
      document.querySelector('#assignmentInstructionsInput').value = '';
      document.querySelector('#assignmentDueDateInput').value = '';
      document.querySelector('#assignmentMaxScoreInput').value = 100;
      document.querySelector('#assignmentExistingAttachment').textContent = '';
    } else {
      try {
        const a = await PGCC_AUTH.apiFetch(`/assignments/${id}`);
        document.querySelector('#assignmentTitleInput').value = a.title;
        courseSel.value = a.course;
        document.querySelector('#assignmentInstructionsInput').value = a.instructions || '';
        document.querySelector('#assignmentDueDateInput').value = a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : '';
        document.querySelector('#assignmentMaxScoreInput').value = a.maxScore || 100;
        document.querySelector('#assignmentExistingAttachment').textContent = a.attachmentName ? `Currently attached: ${a.attachmentName}` : '';
      } catch (err) {
        PGCC_UI.toast('Could not load assignment: ' + err.message, 'bi-exclamation-triangle');
        return;
      }
    }
    document.querySelector('#assignmentEditorModal').classList.add('open');
  }

  document.querySelector('#saveAssignmentBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#assignmentFormMsg');
    msg.style.display = 'none';
    const title = document.querySelector('#assignmentTitleInput').value.trim();
    const course = document.querySelector('#assignmentCourseSelectInput').value;
    if (!title || !course) { msg.textContent = 'Title and course are required.'; msg.style.display = 'block'; return; }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('course', course);
    fd.append('instructions', document.querySelector('#assignmentInstructionsInput').value);
    fd.append('dueDate', document.querySelector('#assignmentDueDateInput').value);
    fd.append('maxScore', document.querySelector('#assignmentMaxScoreInput').value);
    const file = document.querySelector('#assignmentAttachmentInput').files[0];
    if (file) fd.append('attachment', file);

    const btn = document.querySelector('#saveAssignmentBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    try {
      const token = PGCC_AUTH.token();
      const isNew = !currentAssignmentTarget;
      const url = isNew ? `${API_BASE_URL}/assignments` : `${API_BASE_URL}/assignments/${currentAssignmentTarget}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Save failed.');

      document.querySelector('#assignmentEditorModal').classList.remove('open');
      PGCC_UI.toast('Assignment saved', 'bi-check2-circle');
      loadAssignments();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  async function openSubmissionsModal(assignmentId) {
    document.querySelector('#assignmentSubmissionsModal').classList.add('open');
    const host = document.querySelector('#assignmentSubmissionsList');
    host.innerHTML = `<p class="muted" style="padding:20px 0;">Loading…</p>`;
    try {
      const subs = await PGCC_AUTH.apiFetch(`/assignments/${assignmentId}/submissions`);
      if (!subs.length) {
        host.innerHTML = `<div class="empty-state"><div class="ic"><i class="bi bi-inbox"></i></div><h4>No submissions yet</h4></div>`;
        return;
      }
      host.innerHTML = subs.map(s => `
        <div class="panel" style="background:var(--paper-2);margin-bottom:12px;">
          <div class="flex justify-between items-center" style="margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <div><b>${s.student}</b><span class="muted" style="font-size:12px;display:block;">${s.email} · ${new Date(s.submittedAt).toLocaleString()}</span></div>
            ${s.status === 'graded' ? `<span class="pill pill-green">Graded: ${s.score}</span>` : `<span class="pill pill-outline">Ungraded</span>`}
          </div>
          ${s.fileUrl ? `<a href="${resolveUploadUrl(s.fileUrl)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="margin-bottom:10px;"><i class="bi bi-download"></i> ${s.fileName}</a>` : ''}
          ${s.textAnswer ? `<p style="font-size:13.5px;white-space:pre-wrap;margin-bottom:10px;">${s.textAnswer}</p>` : ''}
          <div class="form-row">
            <div class="form-field" style="max-width:140px;"><label>Score</label><input type="number" class="form-control" data-grade-score="${s._id}" value="${s.score ?? ''}"></div>
            <div class="form-field"><label>Feedback</label><input class="form-control" data-grade-feedback="${s._id}" value="${s.feedback || ''}"></div>
          </div>
          <button class="btn btn-primary btn-sm" data-save-grade="${s._id}"><i class="bi bi-check2-circle"></i> Save Grade</button>
        </div>`).join('');

      host.querySelectorAll('[data-save-grade]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.saveGrade;
        const score = host.querySelector(`[data-grade-score="${id}"]`).value;
        const feedback = host.querySelector(`[data-grade-feedback="${id}"]`).value;
        if (score === '' || isNaN(Number(score))) { PGCC_UI.toast('Enter a numeric score first', 'bi-exclamation-triangle'); return; }
        const original = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
        try {
          await PGCC_AUTH.apiFetch(`/assignments/submissions/${id}/grade`, { method: 'PUT', body: JSON.stringify({ score, feedback }) });
          PGCC_UI.toast('Grade saved — student notified', 'bi-check2-circle');
          openSubmissionsModal(assignmentId);
          loadAssignments();
        } catch (err) {
          PGCC_UI.toast('Could not save grade: ' + err.message, 'bi-exclamation-triangle');
          btn.disabled = false; btn.innerHTML = original;
        }
      }));
    } catch (err) {
      host.innerHTML = `<p class="muted">Could not load submissions: ${err.message}</p>`;
    }
  }

  /* ---------------- boot ---------------- */
  loadOverview();
  loadStudents();
  loadPayments();
  loadApplications();
  loadCourses();
  loadAnnouncements();
  loadAnalytics();
  loadInstructors();
  loadExams();
  loadAssignments();
  loadBroadcastForm();
  loadBroadcastHistory();
  PGCC_UI.animateVinesOnLoad();
});
