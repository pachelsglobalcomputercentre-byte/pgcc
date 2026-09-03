/* =========================================================
   PGCC INSTITUTE — INSTRUCTOR DASHBOARD LOGIC
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  PGCC_UI.init('instructor');
  const D = PGCC_DATA;
  const u = D.currentUser.instructor;

  document.querySelector('#welcomeName').textContent = u.name.split(' ')[0];

  /* ---------- Overview stat cards ---------- */
  const statCards = document.querySelector('#instructorStatCards');
  if (statCards) statCards.innerHTML = `
    <div class="stat-card"><div class="top"><div class="ic g"><i class="bi bi-people"></i></div><span class="trend up"><i class="bi bi-arrow-up-short"></i>6</span></div><b class="num">${D.analyticsInstructor.students}</b><span class="label">Total Students</span></div>
    <div class="stat-card"><div class="top"><div class="ic a"><i class="bi bi-clipboard-check"></i></div><span class="trend up">${D.gradingQueue.length} new</span></div><b class="num">${D.gradingQueue.length}</b><span class="label">Assignments to Grade</span></div>
    <div class="stat-card"><div class="top"><div class="ic s"><i class="bi bi-graph-up"></i></div><span class="trend up"><i class="bi bi-arrow-up-short"></i>3%</span></div><b class="num">${D.analyticsInstructor.completionRate}%</b><span class="label">Course Completion</span></div>
    <div class="stat-card"><div class="top"><div class="ic c"><i class="bi bi-star"></i></div><span class="trend up">Excellent</span></div><b class="num">${D.analyticsInstructor.classAvg}%</b><span class="label">Average Class Score</span></div>`;

  const queueHost = document.querySelector('#gradingQueuePreview');
  if (queueHost) queueHost.innerHTML = D.gradingQueue.slice(0, 4).map(g => `
    <div class="list-row"><img src="${g.avatar}" onerror="${ONERR}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="">
    <div class="body"><b>${g.student}</b><span>${g.title}</span></div><div class="meta">${g.submitted}</div></div>`).join('');

  const progressHost = document.querySelector('#studentProgressPreview');
  if (progressHost) progressHost.innerHTML = D.instructorStudents.slice(0, 4).map(s => `
    <div class="list-row"><img src="${s.avatar}" onerror="${ONERR}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="">
    <div class="body"><b>${s.name}</b><span>${s.course}</span></div><div class="meta" style="width:90px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${s.progress}"></div></div></div></div>`).join('');

  /* ---------- Upload Lessons ---------- */
  wireUploadZone();

  const uploadHistory = document.querySelector('#uploadHistoryBody');
  if (uploadHistory) uploadHistory.innerHTML = D.lessons.filter(l => l.instructor === u.name).concat(D.lessons.slice(0,4)).slice(0,5).map(l => `
    <tr><td><b>${l.title}</b></td><td><span class="pill pill-outline">${l.type.toUpperCase()}</span></td><td>${l.course}</td><td>${l.uploaded}</td>
    <td class="row-actions"><button class="icon-btn"><i class="bi bi-pencil"></i></button><button class="icon-btn"><i class="bi bi-trash3"></i></button></td></tr>`).join('');

  /* ---------- Create Assignments ---------- */
  const assignForm = document.querySelector('#createAssignmentForm');
  assignForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    PGCC_UI.toast('Assignment created and assigned to selected students', 'bi-clipboard-check');
    assignForm.reset();
  });
  const assignTable = document.querySelector('#instructorAssignmentsBody');
  if (assignTable) assignTable.innerHTML = D.instructorAssignments.map(a => `
    <tr><td><b>${a.title}</b><br><span class="muted" style="font-size:12px;">${a.course}</span></td>
    <td>${a.due}</td>
    <td style="min-width:160px;"><div class="flex items-center gap-8"><div class="vine-bar" style="flex:1;"><div class="vine-bar-fill" data-target="${Math.round(a.submitted/a.total*100)}"></div></div><span class="muted" style="font-size:12px;white-space:nowrap;">${a.submitted}/${a.total}</span></div></td>
    <td class="row-actions"><button class="icon-btn"><i class="bi bi-eye"></i></button><button class="icon-btn"><i class="bi bi-pencil"></i></button></td></tr>`).join('');

  /* ---------- Create CBT Exams ---------- */
  const examForm = document.querySelector('#createExamForm');
  examForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    PGCC_UI.toast('CBT exam scheduled successfully', 'bi-calendar-check');
    examForm.reset();
  });
  const examTable = document.querySelector('#instructorExamsBody');
  if (examTable) examTable.innerHTML = D.instructorExams.map(ex => `
    <tr><td><b>${ex.title}</b></td><td>${ex.course}</td><td>${ex.date}</td><td>${ex.questions}</td>
    <td>${ex.status === 'scheduled' ? '<span class="pill pill-sky">Scheduled</span>' : `<span class="pill pill-green">Avg ${ex.avg}%</span>`}</td>
    <td class="row-actions"><button class="icon-btn"><i class="bi bi-eye"></i></button><button class="icon-btn"><i class="bi bi-pencil"></i></button></td></tr>`).join('');

  let qCount = 1;
  document.querySelector('#addQuestionBtn')?.addEventListener('click', () => {
    qCount++;
    const wrap = document.querySelector('#examQuestionsWrap');
    const block = document.createElement('div');
    block.className = 'panel';
    block.style.background = 'var(--paper-2)';
    block.innerHTML = `
      <div class="flex justify-between items-center" style="margin-bottom:12px;"><b>Question ${qCount}</b><button type="button" class="icon-btn remove-q"><i class="bi bi-trash3"></i></button></div>
      <div class="form-field"><input class="form-control" placeholder="Enter question text"></div>
      <div class="form-row">
        <div class="form-field"><input class="form-control" placeholder="Option A"></div>
        <div class="form-field"><input class="form-control" placeholder="Option B"></div>
      </div>
      <div class="form-row">
        <div class="form-field"><input class="form-control" placeholder="Option C"></div>
        <div class="form-field"><input class="form-control" placeholder="Option D"></div>
      </div>`;
    wrap.appendChild(block);
    block.querySelector('.remove-q').addEventListener('click', () => block.remove());
  });

  /* ---------- Manage Students ---------- */
  const studentsTable = document.querySelector('#manageStudentsBody');
  function renderStudents(filter = '') {
    const rows = D.instructorStudents.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
    if (!studentsTable) return;
    studentsTable.innerHTML = rows.map(s => `
      <tr>
        <td><div class="td-person"><img src="${s.avatar}" onerror="${ONERR}"><div><b>${s.name}</b><span>${s.id}</span></div></div></td>
        <td>${s.course}</td>
        <td style="min-width:130px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${s.progress}"></div></div></td>
        <td><b>${s.avg}%</b></td>
        <td>${s.attendance}%</td>
        <td>${s.status === 'active' ? '<span class="status-dot on"></span>Active' : '<span class="status-dot wait"></span>At Risk'}</td>
        <td class="row-actions"><button class="icon-btn" data-modal-open="studentProfileModal" data-student="${s.name}"><i class="bi bi-eye"></i></button><button class="icon-btn"><i class="bi bi-chat-dots"></i></button></td>
      </tr>`).join('');
    PGCC_UI.animateVinesOnLoad();
    studentsTable.querySelectorAll('[data-student]').forEach(btn => btn.addEventListener('click', () => {
      const s = D.instructorStudents.find(x => x.name === btn.dataset.student);
      document.querySelector('#studentProfileModalBody').innerHTML = studentModalContent(s);
    }));
  }
  renderStudents();
  document.querySelector('#studentSearchInput')?.addEventListener('input', (e) => renderStudents(e.target.value));

  function studentModalContent(s) {
    return `
      <div class="text-center" style="margin-bottom:18px;">
        <img src="${s.avatar}" onerror="${ONERR}" style="width:74px;height:74px;border-radius:50%;object-fit:cover;margin:0 auto 12px;" alt="">
        <h3 style="margin-bottom:2px;">${s.name}</h3>
        <p class="muted" style="margin:0;">${s.id} · ${s.course}</p>
      </div>
      <div class="grid grid-3" style="gap:12px;margin-bottom:18px;">
        <div class="stat-block" style="border:1px solid var(--line);border-radius:var(--r-md);text-align:center;padding:14px;"><b style="display:block;font-size:20px;">${s.progress}%</b><span style="font-size:11px;">Progress</span></div>
        <div class="stat-block" style="border:1px solid var(--line);border-radius:var(--r-md);text-align:center;padding:14px;"><b style="display:block;font-size:20px;">${s.avg}%</b><span style="font-size:11px;">Average</span></div>
        <div class="stat-block" style="border:1px solid var(--line);border-radius:var(--r-md);text-align:center;padding:14px;"><b style="display:block;font-size:20px;">${s.attendance}%</b><span style="font-size:11px;">Attendance</span></div>
      </div>
      <button class="btn btn-primary btn-block btn-sm"><i class="bi bi-chat-dots"></i> Message ${s.name.split(' ')[0]}</button>`;
  }

  /* ---------- Grade Assignments ---------- */
  const gradingHost = document.querySelector('#gradingQueueFull');
  function renderGrading() {
    if (!gradingHost) return;
    if (!D.gradingQueue.length) { gradingHost.innerHTML = `<div class="empty-state"><div class="ic"><i class="bi bi-check2-all"></i></div><h4>All caught up</h4><p class="muted">No assignments waiting for review.</p></div>`; return; }
    gradingHost.innerHTML = D.gradingQueue.map((g, i) => `
      <div class="panel" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
        <img src="${g.avatar}" onerror="${ONERR}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" alt="">
        <div style="flex:1;min-width:180px;"><b style="display:block;">${g.student}</b><span class="muted" style="font-size:13px;">${g.title} · Submitted ${g.submitted}</span></div>
        <input type="number" min="0" max="100" placeholder="Score" class="form-control" style="width:100px;" id="score-${i}">
        <button class="btn btn-primary btn-sm" data-grade="${i}"><i class="bi bi-check2"></i> Save Grade</button>
      </div>`).join('');
    gradingHost.querySelectorAll('[data-grade]').forEach(btn => btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.grade);
      const score = document.querySelector(`#score-${idx}`).value || '—';
      PGCC_UI.toast(`Grade ${score} saved for ${D.gradingQueue[idx].student}`, 'bi-check2-circle');
      D.gradingQueue.splice(idx, 1);
      renderGrading();
      if (queueHost) queueHost.innerHTML = D.gradingQueue.slice(0, 4).map(g => `
        <div class="list-row"><img src="${g.avatar}" onerror="${ONERR}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="">
        <div class="body"><b>${g.student}</b><span>${g.title}</span></div><div class="meta">${g.submitted}</div></div>`).join('') || '<p class="muted">All caught up!</p>';
    }));
  }
  renderGrading();

  /* ---------- Attendance (instructor marks) ---------- */
  const attMarkHost = document.querySelector('#attendanceMarkBody');
  if (attMarkHost) attMarkHost.innerHTML = D.instructorStudents.map((s, i) => `
    <tr><td><div class="td-person"><img src="${s.avatar}" onerror="${ONERR}"><b>${s.name}</b></div></td><td>${s.id}</td>
    <td><div class="flex gap-8">
      <label class="flex items-center gap-8" style="font-size:13px;"><input type="radio" name="att-${i}" checked> Present</label>
      <label class="flex items-center gap-8" style="font-size:13px;"><input type="radio" name="att-${i}"> Absent</label>
    </td></tr>`).join('');
  document.querySelector('#saveAttendanceBtn')?.addEventListener('click', () => PGCC_UI.toast('Attendance saved for today', 'bi-calendar-check'));

  /* ---------- Student Progress (full) ---------- */
  const progFull = document.querySelector('#studentProgressFullBody');
  if (progFull) progFull.innerHTML = D.instructorStudents.map(s => `
    <tr><td><div class="td-person"><img src="${s.avatar}" onerror="${ONERR}"><div><b>${s.name}</b><span>${s.course}</span></div></div></td>
    <td style="min-width:140px;"><div class="vine-bar"><div class="vine-bar-fill" data-target="${s.progress}"></div></div></td>
    <td><b>${s.avg}%</b></td><td>${s.attendance}%</td>
    <td>${s.status === 'active' ? '<span class="pill pill-green">On Track</span>' : '<span class="pill pill-coral">At Risk</span>'}</td></tr>`).join('');

  /* ---------- Messages ---------- */
  initInstructorChat();

  /* ---------- Reports ---------- */
  const reportHost = document.querySelector('#reportsGrid');
  if (reportHost) reportHost.innerHTML = `
    <div class="panel text-center"><h3 style="font-size:15px;">Class Average</h3>${PGCC_UI.ring(D.analyticsInstructor.classAvg, 140, 12)}</div>
    <div class="panel text-center"><h3 style="font-size:15px;">Course Completion</h3>${PGCC_UI.ring(D.analyticsInstructor.completionRate, 140, 12, 'var(--sky)')}</div>
    <div class="panel text-center"><h3 style="font-size:15px;">Assignment Rate</h3>${PGCC_UI.ring(D.analyticsInstructor.assignmentRate, 140, 12, 'var(--amber)')}</div>`;
  PGCC_UI.animateRings(reportHost);

  PGCC_UI.animateVinesOnLoad();

  /* ---------------- helpers ---------------- */
  function wireUploadZone() {
    const zone = document.querySelector('#uploadZone');
    const input = document.querySelector('#uploadInput');
    const fileList = document.querySelector('#uploadFileList');
    if (!zone) return;
    ['dragover', 'dragenter'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
    zone.addEventListener('click', () => input.click());
    input?.addEventListener('change', () => handleFiles(input.files));
    function handleFiles(files) {
      if (!files || !files.length) return;
      [...files].forEach(f => {
        const li = document.createElement('div');
        li.className = 'list-row';
        li.innerHTML = `<div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-file-earmark-check"></i></div><div class="body"><b>${f.name}</b><span>${(f.size/1024).toFixed(0)} KB · Ready to publish</span></div><div class="meta"><i class="bi bi-check2-circle" style="color:var(--green-500);"></i></div>`;
        fileList.appendChild(li);
      });
      PGCC_UI.toast(`${files.length} file(s) added — click "Publish Lesson" to upload`, 'bi-cloud-arrow-up');
    }
    document.querySelector('#publishLessonBtn')?.addEventListener('click', () => {
      if (!fileList.children.length) { PGCC_UI.toast('Add a file first', 'bi-exclamation-circle'); return; }
      PGCC_UI.toast('Lesson published to selected students', 'bi-check2-circle');
      fileList.innerHTML = '';
    });
  }

  function initInstructorChat() {
    const listHost = document.querySelector('#instChatList');
    const mainHost = document.querySelector('#instChatMain');
    if (!listHost || !mainHost) return;
    const convos = D.instructorStudents.slice(0, 5).map(s => ({
      name: s.name, role: s.course, avatar: s.avatar, unread: 0, time: 'Today',
      last: 'Thank you for the feedback!',
      messages: [{ from: 'them', text: 'Good day ma, I have a question about the last lesson.' }, { from: 'me', text: 'Sure, go ahead!' }, { from: 'them', text: 'Thank you for the feedback!' }]
    }));
    let active = 0;
    function renderList() {
      listHost.innerHTML = convos.map((c, i) => `<div class="chat-item ${i===active?'active':''}" data-i="${i}"><img src="${c.avatar}" onerror="${ONERR}"><div class="body"><b>${c.name}</b><span>${c.last}</span></div><div class="time">${c.time}</div></div>`).join('');
      listHost.querySelectorAll('.chat-item').forEach(item => item.addEventListener('click', () => { active = parseInt(item.dataset.i); renderList(); renderMain(); }));
    }
    function renderMain() {
      const c = convos[active];
      mainHost.innerHTML = `<div class="chat-head"><img src="${c.avatar}" onerror="${ONERR}"><div><b style="display:block;font-size:14px;">${c.name}</b><span class="muted" style="font-size:12px;">${c.role}</span></div></div>
      <div class="chat-body" id="instChatBody">${c.messages.map(m => `<div class="msg ${m.from==='me'?'out':'in'}">${m.text}</div>`).join('')}</div>
      <form class="chat-input" id="instChatForm"><input type="text" placeholder="Type a message…" required><button type="submit"><i class="bi bi-send"></i></button></form>`;
      mainHost.querySelector('#instChatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        if (!input.value.trim()) return;
        c.messages.push({ from: 'me', text: input.value.trim() });
        input.value = ''; renderMain();
      });
    }
    renderList(); renderMain();
  }
});
