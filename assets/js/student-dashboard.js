/* =========================================================
   PGCC INSTITUTE — STUDENT DASHBOARD LOGIC
   Real data where it exists (profile, progress, enrolled course,
   attendance, streak); honest zero/empty states where a backing
   system doesn't exist yet (assignments, certificates) rather
   than fabricated numbers. Falls back to demo data only if the
   backend is unreachable, so the page never breaks.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  PGCC_UI.init('student');
  const D = PGCC_DATA;

  /* ---------- Load real data (graceful fallback to demo) ---------- */
  let me = null;
  let realCourse = null;
  let attendance = null;
  let realExams = null;
  let realAssignments = null;
  try {
    me = await PGCC_AUTH.apiFetch('/student/me');
  } catch (err) {
    console.warn('Could not load real profile, showing demo data instead:', err.message);
  }
  if (me) {
    try { realCourse = await PGCC_AUTH.apiFetch('/student/course'); } catch (err) { console.warn('Could not load course:', err.message); }
    try { attendance = await PGCC_AUTH.apiFetch('/student/attendance'); } catch (err) { console.warn('Could not load attendance:', err.message); }
    try { realExams = await PGCC_AUTH.apiFetch('/student/exams'); } catch (err) { console.warn('Could not load exams:', err.message); }
    try { realAssignments = await PGCC_AUTH.apiFetch('/student/assignments'); } catch (err) { console.warn('Could not load assignments:', err.message); }
    // Replace the placeholder "department" text in the topbar/profile with
    // the actual course this student paid for and is enrolled in.
    PGCC_UI.user.dept = me.course || 'No course enrolled';
    PGCC_UI.fillUser();
  }
  const mockU = D.currentUser.student; // fallback identity only

  /* ---------- Welcome banner ---------- */
  const displayName = me ? me.name : mockU.name;
  const progress = me ? me.progress : mockU.progress;
  document.querySelector('#welcomeName').textContent = displayName.split(' ')[0];
  document.querySelector('#welcomeProgress').style.width = progress + '%';
  document.querySelector('#welcomeProgressLabel').textContent = progress + '% complete';

  /* ---------- Stat cards (real; assignments honestly 0 — no tracking system yet) ---------- */
  const statCards = document.querySelector('#studentStatCards');
  function renderStatCards() {
    if (!statCards) return;
    const enrolledCount = me ? me.enrolledCoursesCount : D.myCourses.length;
    const overallPerf = me ? me.overallGrade : D.analyticsStudent.overall;
    const streak = me ? me.streakCount : mockU.streak;
    const pendingAssignments = me ? (realAssignments || []).filter(a => !a.submitted).length : 0;
    statCards.innerHTML = `
      <div class="stat-card"><div class="top"><div class="ic g"><i class="bi bi-journal-bookmark"></i></div></div><b class="num">${enrolledCount}</b><span class="label">Enrolled Courses</span></div>
      <div class="stat-card"><div class="top"><div class="ic a"><i class="bi bi-list-check"></i></div></div><b class="num">${pendingAssignments}</b><span class="label">Pending Assignments</span></div>
      <div class="stat-card"><div class="top"><div class="ic s"><i class="bi bi-mortarboard"></i></div></div><b class="num">${overallPerf}%</b><span class="label">Overall Performance</span></div>
      <div class="stat-card"><div class="top"><div class="ic c"><i class="bi bi-fire"></i></div></div><b class="num">${streak}</b><span class="label">Day Learning Streak</span></div>`;
  }
  renderStatCards();

  // Real pending-assignment count on the sidebar badge, replacing the
  // hardcoded "2" placeholder that shipped with the template.
  const assignSideBadge = document.querySelector('[data-section="assignments"] .count');
  if (assignSideBadge) {
    const pending = me ? (realAssignments || []).filter(a => !a.submitted).length : 0;
    if (pending > 0) { assignSideBadge.textContent = pending; assignSideBadge.style.display = ''; }
    else assignSideBadge.style.display = 'none';
  }

  /* ---------- Today's Lesson (real: first not-yet-completed lesson) ---------- */
  function findNextLesson() {
    if (!realCourse) return null;
    for (const m of realCourse.modules) {
      for (const l of m.lessons) {
        if (!l.completed) return { ...l, moduleTitle: m.title };
      }
    }
    return null;
  }
  const feature = document.querySelector('#todayLessonFeature');
  if (feature) {
    if (me && realCourse) {
      const next = findNextLesson();
      feature.innerHTML = next ? `
        <div class="ic" style="width:64px;height:64px;border-radius:14px;background:var(--green-100);color:var(--green-700);display:grid;place-items:center;font-size:24px;flex-shrink:0;"><i class="bi bi-${iconForType(next.contentType)}"></i></div>
        <div class="body">
          <span class="pill pill-green">${realCourse.title}</span>
          <h4 style="margin-top:8px;">${next.title}</h4>
          <p class="muted">${next.moduleTitle}</p>
          <button class="btn btn-primary btn-sm" data-goto-section="my-lessons"><i class="bi bi-play-fill"></i> Continue Learning</button>
        </div>` : `<div class="empty-state" style="padding:20px;"><div class="ic"><i class="bi bi-check2-all"></i></div><h4>All caught up!</h4><p class="muted">You've completed every lesson in this course.</p></div>`;
    } else {
      feature.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="ic"><i class="bi bi-journal-x"></i></div><h4>No course enrolled yet</h4><p class="muted">Once you're enrolled, your lessons will appear here.</p></div>`;
    }
  }

  /* ---------- Upcoming Assignment (real: next-due, not-yet-submitted) ---------- */
  const upAssignHost = document.querySelector('#upcomingAssignment');
  if (upAssignHost) {
    if (me) {
      const pending = (realAssignments || []).filter(a => !a.submitted).sort((a, b) => new Date(a.dueDate || 8640000000000000) - new Date(b.dueDate || 8640000000000000));
      const upAssign = pending[0];
      upAssignHost.innerHTML = upAssign ? `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-list-check"></i></div>
        <div class="body"><b>${upAssign.title}</b><span>${upAssign.course}</span></div>
        <div class="meta">${upAssign.dueDate ? new Date(upAssign.dueDate).toLocaleDateString() : 'No due date'}</div></div>` : emptyRow('No pending assignments');
    } else {
      upAssignHost.innerHTML = emptyRow('No assignments yet.');
    }
  }

  /* ---------- Upcoming Exam (real: first unlocked exam not yet taken) ---------- */
  const upcomingExamHost = document.querySelector('#upcomingExam');
  if (upcomingExamHost) {
    if (me) {
      const upExam = (realExams || []).find(e => !e.attempted && !e.locked);
      upcomingExamHost.innerHTML = upExam ? `
        <div class="list-row"><div class="ic" style="background:#e4f2fb;color:#1f5f85;"><i class="bi bi-pencil-square"></i></div>
        <div class="body"><b>${upExam.title}</b><span>${upExam.course} · ${upExam.questionCount} questions</span></div>
        <div class="meta">${upExam.durationMinutes} min</div></div>` : emptyRow('No exams available right now');
    } else {
      const upExam = D.exams.find(e => e.status === 'upcoming');
      upcomingExamHost.innerHTML = upExam ? `
        <div class="list-row"><div class="ic" style="background:#e4f2fb;color:#1f5f85;"><i class="bi bi-pencil-square"></i></div>
        <div class="body"><b>${upExam.title}</b><span>${upExam.course} · ${upExam.questions} questions</span></div>
        <div class="meta">${upExam.date}</div></div>` : emptyRow('No exams scheduled');
    }
  }

  /* ---------- Announcements ---------- */
  const annList = document.querySelector('#overviewAnnouncements');
  if (annList) annList.innerHTML = D.announcements.slice(0, 3).map(a => `
    <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-megaphone"></i></div>
    <div class="body"><b>${a.title}</b><span>${a.body}</span></div><div class="meta">${a.date}</div></div>`).join('');

  const annFull = document.querySelector('#announcementsFull');
  if (annFull) annFull.innerHTML = D.announcements.map(a => `
    <div class="panel">
      <div class="flex items-center justify-between" style="margin-bottom:10px;"><span class="pill pill-green">${a.tag}</span><span class="muted" style="font-size:12px;">${a.date}</span></div>
      <h3 style="font-size:16.5px;margin-bottom:6px;">${a.title}</h3>
      <p class="muted" style="margin:0;font-size:14px;">${a.body}</p>
    </div>`).join('');

  (async function loadRealAnnouncements() {
    try {
      const res = await fetch(`${API_BASE_URL}/announcements`);
      const live = await res.json();
      if (!Array.isArray(live) || !live.length) return;
      const normalized = live.map(a => ({
        title: a.title,
        body: a.bodyHtml ? a.bodyHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 220) : (a.excerpt || ''),
        date: new Date(a.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        tag: a.category || 'Notice'
      }));
      if (annList) annList.innerHTML = normalized.slice(0, 3).map(a => `
        <div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-megaphone"></i></div>
        <div class="body"><b>${a.title}</b><span>${a.body}</span></div><div class="meta">${a.date}</div></div>`).join('');
      if (annFull) annFull.innerHTML = normalized.map(a => `
        <div class="panel">
          <div class="flex items-center justify-between" style="margin-bottom:10px;"><span class="pill pill-green">${a.tag}</span><span class="muted" style="font-size:12px;">${a.date}</span></div>
          <h3 style="font-size:16.5px;margin-bottom:6px;">${a.title}</h3>
          <p class="muted" style="margin:0;font-size:14px;">${a.body}</p>
        </div>`).join('');
    } catch (err) {
      console.warn('Could not load live announcements, showing demo data instead:', err.message);
    }
  })();

  /* ---------- My Courses (real — the one course this student is enrolled in) ---------- */
  const coursesGrid = document.querySelector('#myCoursesGrid');
  function renderMyCourses() {
    if (!coursesGrid) return;
    if (me && realCourse) {
      coursesGrid.innerHTML = `
        <div class="card course-card">
          <div class="thumb"><img src="${resolveUploadUrl(realCourse.image) || FALLBACK_IMG}" onerror="${ONERR}" alt=""><span class="course-level" style="left:auto;right:12px;background:var(--green-700);">${me.progress}% done</span></div>
          <div class="course-body">
            <span class="course-cat">${realCourse.category || ''}</span>
            <h3>${realCourse.title}</h3>
            <p class="muted">${me.completedModules} of ${me.totalModules} modules completed</p>
            <div class="vine-bar" style="margin-bottom:14px;"><div class="vine-bar-fill" data-target="${me.progress}"></div></div>
            <button class="btn btn-outline btn-block btn-sm" data-goto-section="my-lessons">Resume Course</button>
          </div>
        </div>`;
    } else if (me) {
      coursesGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic"><i class="bi bi-journal-x"></i></div><h4>No course enrolled yet</h4><p class="muted">Once your application is approved, your course will appear here.</p></div>`;
    } else {
      coursesGrid.innerHTML = D.myCourses.map(c => `
        <div class="card course-card">
          <div class="thumb"><img src="${c.img}" onerror="${ONERR}" alt=""><span class="course-level" style="left:auto;right:12px;background:var(--green-700);">${c.progress}% done</span></div>
          <div class="course-body">
            <span class="course-cat">${c.instructor}</span>
            <h3>${c.title}</h3>
            <p class="muted">Next: ${c.next}</p>
            <div class="vine-bar" style="margin-bottom:14px;"><div class="vine-bar-fill" data-target="${c.progress}"></div></div>
            <button class="btn btn-outline btn-block btn-sm" data-goto-section="my-lessons">Resume Course</button>
          </div>
        </div>`).join('');
    }
    PGCC_UI.animateVinesOnLoad();
  }
  renderMyCourses();

  /* ---------- My Lessons (real — grouped by module, with sequential locking) ---------- */
  const lessonGrid = document.querySelector('#lessonsGrid');
  function iconForType(t) {
    return { text: 'file-text', video: 'play-circle', pdf: 'file-earmark-pdf', zip: 'file-earmark-zip', ppt: 'file-earmark-slides' }[t] || 'file-text';
  }
  function renderLessons() {
    if (!lessonGrid) return;
    if (!me) {
      lessonGrid.innerHTML = `<div style="grid-column:1/-1;" class="grid grid-3">${D.lessons.map(l => `
        <div class="card" data-lesson-cat="${l.type}">
          <div class="thumb" style="aspect-ratio:16/10;position:relative;overflow:hidden;">
            <img src="${l.thumb}" onerror="${ONERR}" style="width:100%;height:100%;object-fit:cover;" alt="">
            <span class="course-level"><i class="bi bi-${iconForType(l.type)}"></i> ${l.type.toUpperCase()}</span>
          </div>
          <div class="course-body"><span class="course-cat">${l.course}</span><h3 style="font-size:16.5px;">${l.title}</h3></div>
        </div>`).join('')}</div>`;
      return;
    }
    if (!realCourse) {
      lessonGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic"><i class="bi bi-journal-x"></i></div><h4>No course enrolled yet</h4></div>`;
      return;
    }
    if (!realCourse.modules.length) {
      lessonGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic"><i class="bi bi-camera-reels"></i></div><h4>No lessons uploaded yet</h4><p class="muted">Your instructor hasn't added any lessons to this course yet.</p></div>`;
      return;
    }
    lessonGrid.innerHTML = realCourse.modules.map((m, mi) => `
      <div style="grid-column:1/-1;margin-bottom:6px;">
        <div class="flex items-center gap-12" style="margin-bottom:14px;">
          <span class="pill ${m.complete ? 'pill-green' : m.locked ? 'pill-outline' : 'pill-sky'}"><i class="bi bi-${m.locked ? 'lock-fill' : m.complete ? 'check2-circle' : 'unlock'}"></i> Module ${mi + 1}: ${m.title}</span>
          ${m.locked ? '<span class="muted" style="font-size:12.5px;">Complete the previous module to unlock</span>' : ''}
        </div>
        <div class="grid grid-3" style="margin-bottom:30px;">
          ${!m.lessons.length ? '<p class="muted" style="font-size:13.5px;grid-column:1/-1;">No lessons in this module yet.</p>' : m.lessons.map(l => `
          <div class="card" data-lesson-cat="${l.contentType}" style="${m.locked ? 'opacity:0.55;' : ''}">
            <div class="thumb" style="aspect-ratio:16/10;position:relative;overflow:hidden;background:var(--green-100);display:grid;place-items:center;">
              <i class="bi bi-${m.locked ? 'lock-fill' : iconForType(l.contentType)}" style="font-size:34px;color:var(--green-700);"></i>
              <span class="course-level"><i class="bi bi-${iconForType(l.contentType)}"></i> ${l.contentType.toUpperCase()}</span>
              ${l.completed ? '<span class="course-price" style="background:var(--green-500);color:#fff;"><i class="bi bi-check2"></i> Watched</span>' : ''}
            </div>
            <div class="course-body">
              <span class="course-cat">${m.title}</span>
              <h3 style="font-size:16.5px;">${l.title}</h3>
              ${m.locked
                ? '<button class="btn btn-outline btn-sm btn-block" disabled><i class="bi bi-lock-fill"></i> Locked</button>'
                : `<button class="btn btn-primary btn-sm btn-block" data-open-lesson="${l._id}"><i class="bi bi-play-fill"></i> Open Lesson</button>`}
            </div>
          </div>`).join('')}
        </div>
      </div>`).join('');
    lessonGrid.querySelectorAll('[data-open-lesson]').forEach(btn => btn.addEventListener('click', () => openRealLesson(btn.dataset.openLesson)));
  }
  renderLessons();

  const lessonFilter = document.querySelector('#lessonTypeFilter');
  lessonFilter?.addEventListener('change', () => {
    const v = lessonFilter.value;
    document.querySelectorAll('[data-lesson-cat]').forEach(card => {
      card.style.display = (v === 'all' || card.dataset.lessonCat === v) ? '' : 'none';
    });
  });

  function findLessonById(id) {
    for (const m of realCourse.modules) {
      const l = m.lessons.find(x => x._id === id);
      if (l) return { lesson: l, moduleTitle: m.title };
    }
    return null;
  }

  function openRealLesson(lessonId) {
    const found = findLessonById(lessonId);
    if (!found) return;
    const { lesson } = found;
    document.querySelector('#lessonModalTitle').textContent = lesson.title;
    const body = document.querySelector('#lessonModalBody');
    if (lesson.contentType === 'video' && lesson.videoUrl) {
      body.innerHTML = `<div style="aspect-ratio:16/9;max-height:calc(100vh - 220px);background:#000;border-radius:var(--r-md);overflow:hidden;margin-bottom:16px;"><iframe width="100%" height="100%" src="${lesson.videoUrl}" allow="autoplay; encrypted-media" allowfullscreen style="border:0;"></iframe></div>`;
    } else if (lesson.contentType === 'text') {
      body.innerHTML = `<div style="margin-bottom:16px;line-height:1.8;font-size:15.5px;max-width:820px;">${lesson.richTextHtml || '<p class="muted">No content has been added yet.</p>'}</div>`;
    } else if (lesson.contentType === 'pdf' && lesson.fileUrl) {
      const url = resolveUploadUrl(lesson.fileUrl);
      body.innerHTML = `
        <div style="margin-bottom:12px;">
          <iframe src="${url}" style="width:100%;height:calc(100vh - 240px);min-height:400px;border:1px solid var(--line);border-radius:var(--r-md);background:#525659;"></iframe>
        </div>
        <div class="flex items-center justify-between" style="margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <span class="muted" style="font-size:13px;"><i class="bi bi-file-earmark-pdf"></i> ${lesson.fileName || 'Lesson PDF'}</span>
          <a href="${url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="bi bi-download"></i> Open / Download</a>
        </div>`;
    } else if (lesson.fileUrl) {
      body.innerHTML = `<div class="text-center" style="padding:30px 0;margin-bottom:16px;background:var(--paper-2);border-radius:var(--r-md);">
        <i class="bi bi-file-earmark-arrow-down" style="font-size:38px;color:var(--green-700);"></i>
        <p style="margin:12px 0;">${lesson.fileName || 'Download file'}</p>
        <p class="muted" style="font-size:12.5px;margin-bottom:12px;">${lesson.contentType === 'zip' ? 'ZIP archive' : 'Presentation file'} — opens outside the browser, so it downloads instead of previewing here.</p>
        <a href="${resolveUploadUrl(lesson.fileUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm"><i class="bi bi-download"></i> Download</a>
      </div>`;
    } else {
      body.innerHTML = `<p class="muted" style="margin-bottom:16px;">No content has been added to this lesson yet.</p>`;
    }
    const markBtn = document.querySelector('#markWatchedBtn');
    markBtn.dataset.lessonId = lessonId;
    markBtn.innerHTML = lesson.completed ? '<i class="bi bi-arrow-counterclockwise"></i> Mark as Not Watched' : '<i class="bi bi-check2"></i> Mark as Watched';
    document.querySelector('#lessonModal').classList.add('open');
  }

  document.querySelector('#markWatchedBtn')?.addEventListener('click', async function () {
    const lessonId = this.dataset.lessonId;
    if (!lessonId || !realCourse) { document.querySelector('#lessonModal').classList.remove('open'); return; }
    try {
      await PGCC_AUTH.apiFetch(`/student/lessons/${lessonId}/complete`, { method: 'POST' });
      // Module completion and locking are computed server-side — refetch both
      // so the UI reflects the real, authoritative state rather than a guess.
      const [freshMe, freshCourse] = await Promise.all([
        PGCC_AUTH.apiFetch('/student/me'),
        PGCC_AUTH.apiFetch('/student/course')
      ]);
      me = freshMe;
      realCourse = freshCourse;

      renderLessons();
      renderMyCourses();
      renderStatCards();
      document.querySelector('#welcomeProgress').style.width = me.progress + '%';
      document.querySelector('#welcomeProgressLabel').textContent = me.progress + '% complete';
      PGCC_UI.animateVinesOnLoad();

      PGCC_UI.toast('Lesson status updated', 'bi-check2-circle');
      document.querySelector('#lessonModal').classList.remove('open');
    } catch (err) {
      PGCC_UI.toast('Could not update: ' + err.message, 'bi-exclamation-triangle');
    }
  });

  /* ---------- Assignments (real: admin-created coursework, one submission each) ---------- */
  const assignTable = document.querySelector('#assignmentsTableBody');
  function renderAssignmentsTable() {
    if (!assignTable) return;
    if (!me) {
      assignTable.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-list-check"></i></div><h4>No assignments yet</h4></div></td></tr>`;
      return;
    }
    const list = realAssignments || [];
    if (!list.length) {
      assignTable.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic"><i class="bi bi-list-check"></i></div><h4>No assignments yet</h4><p class="muted">Your instructor hasn't posted any assignments for this course yet.</p></div></td></tr>`;
      return;
    }
    assignTable.innerHTML = list.map(a => {
      const overdue = a.dueDate && !a.submitted && new Date(a.dueDate) < new Date();
      const statusPillHtml = a.status === 'graded'
        ? `<span class="pill pill-green">Graded</span>`
        : a.submitted
          ? `<span class="pill pill-sky">Submitted</span>`
          : overdue
            ? `<span class="pill pill-coral">Overdue</span>`
            : `<span class="pill pill-outline">Pending</span>`;
      return `
      <tr>
        <td><b>${a.title}</b>${a.attachmentUrl ? `<br><a href="${resolveUploadUrl(a.attachmentUrl)}" target="_blank" rel="noopener" style="font-size:12px;"><i class="bi bi-paperclip"></i> ${a.attachmentName || 'Attachment'}</a>` : ''}</td>
        <td>${a.course}</td>
        <td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
        <td>${statusPillHtml}</td>
        <td>${a.status === 'graded' ? `${a.score}/${a.maxScore}` : '—'}</td>
        <td class="row-actions"><button class="btn btn-outline btn-sm" data-open-submit="${a._id}">${a.submitted ? 'View / Resubmit' : 'Submit'}</button></td>
      </tr>`;
    }).join('');

    assignTable.querySelectorAll('[data-open-submit]').forEach(btn => btn.addEventListener('click', () => openSubmitModal(btn.dataset.openSubmit)));
  }
  renderAssignmentsTable();

  function openSubmitModal(assignmentId) {
    const a = (realAssignments || []).find(x => x._id === assignmentId);
    if (!a) return;
    currentSubmitAssignment = a;
    document.querySelector('#submitModalTitle').textContent = a.title;
    document.querySelector('#submitModalInstructions').textContent = a.instructions || 'No additional instructions provided.';
    document.querySelector('#assignmentFileInput').value = '';
    document.querySelector('#assignmentTextInput').value = a.textAnswer || '';
    document.querySelector('#submitModalExistingFile').textContent = a.fileName ? `Currently on file: ${a.fileName}` : '';
    document.querySelector('#submitModalMsg').style.display = 'none';
    const gradedBox = document.querySelector('#submitModalGraded');
    if (a.status === 'graded') {
      gradedBox.style.display = 'block';
      document.querySelector('#submitModalScoreText').textContent = `${a.score} / ${a.maxScore}`;
      document.querySelector('#submitModalFeedback').textContent = a.feedback || '';
    } else {
      gradedBox.style.display = 'none';
    }
    document.querySelector('#submitModal').classList.add('open');
  }
  let currentSubmitAssignment = null;

  document.querySelector('#submitAssignmentBtn')?.addEventListener('click', async () => {
    const msg = document.querySelector('#submitModalMsg');
    msg.style.display = 'none';
    if (!currentSubmitAssignment) return;
    const file = document.querySelector('#assignmentFileInput').files[0];
    const textAnswer = document.querySelector('#assignmentTextInput').value.trim();
    if (!file && !textAnswer) {
      msg.textContent = 'Attach a file or write an answer before submitting.';
      msg.style.display = 'block';
      return;
    }
    const fd = new FormData();
    if (file) fd.append('file', file);
    fd.append('textAnswer', textAnswer);

    const btn = document.querySelector('#submitAssignmentBtn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Submitting…';
    try {
      const token = PGCC_AUTH.token();
      const res = await fetch(`${API_BASE_URL}/student/assignments/${currentSubmitAssignment._id}/submit`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Submission failed.');

      realAssignments = await PGCC_AUTH.apiFetch('/student/assignments');
      renderAssignmentsTable();
      renderStatCards();
      document.querySelector('#submitModal').classList.remove('open');
      PGCC_UI.toast('Assignment submitted', 'bi-check2-circle');
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.innerHTML = original;
  });

  /* ---------- Online Exams (real) ---------- */
  const examList = document.querySelector('#examList');
  async function loadExams() {
    if (!examList) return;
    if (!me) {
      examList.innerHTML = D.exams.map(e => `
        <div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <div class="flex items-center gap-16">
            <div class="ic" style="width:48px;height:48px;border-radius:13px;background:${e.status==='upcoming'?'var(--green-100)':'#e4f2fb'};color:${e.status==='upcoming'?'var(--green-700)':'#1f5f85'};display:grid;place-items:center;font-size:20px;"><i class="bi bi-pencil-square"></i></div>
            <div><b style="display:block;">${e.title}</b><span class="muted" style="font-size:13px;">${e.course} · ${e.duration} · ${e.questions} questions</span></div>
          </div>
          <div class="flex items-center gap-12">${e.status === 'upcoming' ? `<span class="pill pill-sky"><i class="bi bi-calendar-event"></i> ${e.date}</span>` : `<span class="pill pill-green">Score: ${e.score}%</span>`}</div>
        </div>`).join('');
      return;
    }
    try {
      const exams = realExams || await PGCC_AUTH.apiFetch('/student/exams');
      realExams = null; // only reuse the pre-fetched copy once; refresh normally after that
      examList.innerHTML = exams.length ? exams.map(e => `
        <div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <div class="flex items-center gap-16">
            <div class="ic" style="width:48px;height:48px;border-radius:13px;background:var(--green-100);color:var(--green-700);display:grid;place-items:center;font-size:20px;"><i class="bi bi-pencil-square"></i></div>
            <div><b style="display:block;">${e.title}</b><span class="muted" style="font-size:13px;">${e.course} · ${e.durationMinutes} min · ${e.questionCount} questions</span></div>
          </div>
          <div class="flex items-center gap-12">
            ${e.attempted
              ? `<span class="pill pill-green">Score: ${e.score}%</span><button class="btn btn-outline btn-sm" data-review-exam="${e._id}"><i class="bi bi-eye"></i> Review</button>`
              : e.locked
                ? `<span class="pill pill-outline"><i class="bi bi-lock-fill"></i> Complete ${e.requiredModulesCompleted} module${e.requiredModulesCompleted === 1 ? '' : 's'} first</span>`
                : `<button class="btn btn-primary btn-sm" data-start-exam="${e._id}"><i class="bi bi-play-fill"></i> Start Exam</button>`}
          </div>
        </div>`).join('') : `<div class="empty-state"><div class="ic"><i class="bi bi-pencil-square"></i></div><h4>No exams yet</h4><p class="muted">Your instructor hasn't created any exams for this course yet.</p></div>`;

      examList.querySelectorAll('[data-start-exam]').forEach(btn => btn.addEventListener('click', () => startRealExam(btn.dataset.startExam)));
      examList.querySelectorAll('[data-review-exam]').forEach(btn => btn.addEventListener('click', () => reviewExam(btn.dataset.reviewExam)));
    } catch (err) {
      examList.innerHTML = `<p class="muted">Could not load exams — is the backend running?</p>`;
    }
  }
  loadExams();

  /* ---------- Real timed exam taking + review ---------- */
  let examState = null;

  function goToSection(id) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function startRealExam(examId) {
    try {
      const data = await PGCC_AUTH.apiFetch(`/student/exams/${examId}/start`);
      examState = {
        examId, attemptId: data.attemptId, questions: data.questions, current: 0,
        answers: new Array(data.questions.length).fill(null),
        secondsLeft: data.durationMinutes * 60
      };
      document.querySelector('#cbtExamTitle').textContent = `CBT Exam: ${data.title}`;
      document.querySelector('#cbtExamSubtitle').textContent = `${data.durationMinutes} minutes · ${data.questions.length} questions`;
      goToSection('cbt-exam');
      renderExamQuestion();
      startExamTimer();
    } catch (err) {
      PGCC_UI.toast('Could not start exam: ' + err.message, 'bi-exclamation-triangle');
    }
  }

  function renderExamNav() {
    return `<div class="exam-nav-grid">${examState.questions.map((_, i) => `<button class="${examState.answers[i] !== null ? 'done' : ''} ${i === examState.current ? 'current' : ''}" data-goto="${i}">${i + 1}</button>`).join('')}</div>`;
  }
  function renderExamQuestion() {
    const host = document.querySelector('#cbtExamHost');
    const q = examState.questions[examState.current];
    host.innerHTML = `
      <div class="panel">
        <span class="exam-q-num">Question ${examState.current + 1} of ${examState.questions.length}</span>
        <h3 style="margin-bottom:20px;">${q.questionText}</h3>
        ${q.imageUrl ? `<img src="${resolveUploadUrl(q.imageUrl)}" style="max-width:100%;border-radius:var(--r-md);margin-bottom:16px;" alt="">` : ''}
        ${q.options.map((opt, i) => `
          <label class="exam-option"><input type="radio" name="opt" ${examState.answers[examState.current] === i ? 'checked' : ''} data-opt="${i}"><span>${opt}</span></label>`).join('')}
        <div class="flex justify-between" style="margin-top:22px;">
          <button class="btn btn-outline btn-sm" id="examPrev" ${examState.current === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i> Previous</button>
          ${examState.current === examState.questions.length - 1 ? '<button class="btn btn-primary btn-sm" id="examSubmit"><i class="bi bi-check2-circle"></i> Submit Exam</button>' : '<button class="btn btn-primary btn-sm" id="examNext">Next <i class="bi bi-arrow-right"></i></button>'}
        </div>
      </div>`;
    document.querySelector('#examSidebarNav').innerHTML = `
      <div class="exam-timer"><span class="muted" style="color:#9fc0a7;font-size:12px;">Time Remaining</span><div class="clock" id="examClock">${formatClock(examState.secondsLeft)}</div></div>
      <p class="muted" style="font-size:12.5px;margin:16px 0 6px;">Question Navigator</p>
      ${renderExamNav()}
      <p class="muted" style="font-size:11.5px;margin-top:14px;">${examState.answers.filter(a => a !== null).length}/${examState.questions.length} answered</p>`;

    host.querySelectorAll('[data-opt]').forEach(inp => inp.addEventListener('change', () => {
      examState.answers[examState.current] = parseInt(inp.dataset.opt);
      renderExamQuestion();
    }));
    document.querySelector('#examPrev')?.addEventListener('click', () => { examState.current = Math.max(0, examState.current - 1); renderExamQuestion(); });
    document.querySelector('#examNext')?.addEventListener('click', () => { examState.current = Math.min(examState.questions.length - 1, examState.current + 1); renderExamQuestion(); });
    document.querySelector('#examSubmit')?.addEventListener('click', () => submitRealExam(false));
    document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => { examState.current = parseInt(btn.dataset.goto); renderExamQuestion(); }));
  }
  function formatClock(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }
  function startExamTimer() {
    if (examState.timerHandle) clearInterval(examState.timerHandle);
    examState.timerHandle = setInterval(() => {
      if (!examState) return;
      examState.secondsLeft = Math.max(0, examState.secondsLeft - 1);
      const clock = document.querySelector('#examClock');
      if (clock) clock.textContent = formatClock(examState.secondsLeft);
      if (examState.secondsLeft <= 0) {
        clearInterval(examState.timerHandle);
        submitRealExam(true);
      }
    }, 1000);
  }
  async function submitRealExam(timeExpired) {
    if (examState.timerHandle) clearInterval(examState.timerHandle);
    const host = document.querySelector('#cbtExamHost');
    try {
      const result = await PGCC_AUTH.apiFetch(`/student/exams/${examState.examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ attemptId: examState.attemptId, answers: examState.answers.map(a => a === null ? -1 : a), timeExpired })
      });
      renderExamResult(result, timeExpired);
      loadExams();
      // refresh overall grade display since exam score feeds into it
      try {
        const refreshed = await PGCC_AUTH.apiFetch('/student/me');
        me.overallGrade = refreshed.overallGrade; me.examScore = refreshed.examScore;
        const ringHost = document.querySelector('#resultsRing');
        if (ringHost) { ringHost.innerHTML = PGCC_UI.ring(me.overallGrade, 170, 14); PGCC_UI.animateRings(ringHost); }
      } catch (e) { /* non-critical */ }
    } catch (err) {
      host.innerHTML = `<div class="panel text-center" style="padding:40px;"><p class="muted">Could not submit: ${err.message}</p></div>`;
    }
    document.querySelector('#examSidebarNav').innerHTML = '';
  }
  function renderExamResult(result, timeExpired) {
    const host = document.querySelector('#cbtExamHost');
    host.innerHTML = `
      <div class="panel text-center" style="padding:50px 30px;">
        ${PGCC_UI.ring(result.score, 160, 13)}
        <h2 style="margin-top:22px;">${timeExpired ? 'Time\'s Up — Exam Auto-Submitted' : 'Exam Submitted!'}</h2>
        <p class="muted">You scored ${result.correctCount} out of ${result.totalQuestions} questions correctly.</p>
        <div class="flex gap-8" style="justify-content:center;margin-top:10px;">
          <button class="btn btn-outline btn-sm" id="viewReviewBtn"><i class="bi bi-list-check"></i> Review Answers</button>
          <button class="btn btn-primary btn-sm" id="backToExamsBtn"><i class="bi bi-arrow-left"></i> Back to Exams</button>
        </div>
      </div>`;
    PGCC_UI.animateRings(host);
    document.querySelector('#viewReviewBtn').addEventListener('click', () => renderExamReview(result.review));
    document.querySelector('#backToExamsBtn').addEventListener('click', () => { document.querySelector('.side-link[data-section="exams"]')?.click(); });
    PGCC_UI.toast('Exam submitted successfully', 'bi-check2-circle');
  }
  async function reviewExam(examId) {
    try {
      const data = await PGCC_AUTH.apiFetch(`/student/exams/${examId}/attempt`);
      document.querySelector('#cbtExamTitle').textContent = 'Exam Review';
      document.querySelector('#cbtExamSubtitle').textContent = `Score: ${data.score}% (${data.correctCount}/${data.totalQuestions} correct)`;
      goToSection('cbt-exam');
      document.querySelector('#examSidebarNav').innerHTML = '';
      renderExamReview(data.review);
    } catch (err) {
      PGCC_UI.toast('Could not load review: ' + err.message, 'bi-exclamation-triangle');
    }
  }
  function renderExamReview(review) {
    const host = document.querySelector('#cbtExamHost');
    host.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${review.map((r, i) => `
          <div class="panel" style="border-left:4px solid ${r.isCorrect ? 'var(--green-500)' : 'var(--coral)'};">
            <span class="exam-q-num">Question ${i + 1} ${r.isCorrect ? '<span class="pill pill-green">Correct</span>' : '<span class="pill pill-coral">Incorrect</span>'}</span>
            <h4 style="margin:10px 0 14px;">${r.questionText}</h4>
            ${r.options.map((opt, oi) => `
              <div class="exam-option" style="${oi === r.correctIndex ? 'border-color:var(--green-500);background:var(--green-100);' : oi === r.selectedIndex && !r.isCorrect ? 'border-color:var(--coral);background:#fceae7;' : ''}cursor:default;">
                <span>${opt}</span>${oi === r.correctIndex ? '<i class="bi bi-check2-circle" style="margin-left:auto;color:var(--green-700);"></i>' : oi === r.selectedIndex && !r.isCorrect ? '<i class="bi bi-x-circle" style="margin-left:auto;color:var(--coral);"></i>' : ''}
              </div>`).join('')}
          </div>`).join('')}
        <button class="btn btn-outline" id="backToExamsBtn2"><i class="bi bi-arrow-left"></i> Back to Exams</button>
      </div>`;
    document.querySelector('#backToExamsBtn2').addEventListener('click', () => { document.querySelector('.side-link[data-section="exams"]')?.click(); });
  }

  /* ---------- Results (real — module progress + exam scores) ---------- */
  const resultsBody = document.querySelector('#resultsTableBody');
  if (resultsBody) {
    if (me && realCourse) {
      const rows = [];
      rows.push(`<tr><td><b>${realCourse.title}</b></td><td><span class="pill pill-outline">Modules</span></td><td>${me.completedModules}/${me.totalModules} complete</td><td><span class="pill pill-sky">${me.progress}%</span></td><td>—</td></tr>`);
      if (me.examScore !== null) {
        rows.push(`<tr><td><b>${realCourse.title}</b></td><td><span class="pill pill-outline">Final Exam</span></td><td>${me.examScore}/100</td><td><span class="pill pill-green">${me.examScore >= 50 ? 'Pass' : 'Below Pass Mark'}</span></td><td>—</td></tr>`);
      }
      resultsBody.innerHTML = rows.join('');
    } else if (me) {
      resultsBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="ic"><i class="bi bi-bar-chart"></i></div><h4>No results yet</h4><p class="muted">Once you're enrolled and start completing modules, your results appear here.</p></div></td></tr>`;
    } else {
      resultsBody.innerHTML = D.results.map(r => `
        <tr><td><b>${r.course}</b></td><td><span class="pill pill-outline">${r.type}</span></td><td>${r.score}/100</td><td><span class="pill pill-green">${r.grade}</span></td><td>${r.date}</td></tr>`).join('');
    }
  }
  const ringHost = document.querySelector('#resultsRing');
  if (ringHost) { ringHost.innerHTML = PGCC_UI.ring(me ? me.overallGrade : D.analyticsStudent.overall, 170, 14); PGCC_UI.animateRings(ringHost); }

  /* ---------- Certificates (honest empty — no issuance system yet) ---------- */
  const certGrid = document.querySelector('#certificatesGrid');
  if (certGrid) certGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic"><i class="bi bi-patch-check"></i></div><h4>No certificates yet</h4><p class="muted">Certificates are issued once a course is fully completed — this section will update automatically.</p></div>`;

  /* ---------- Attendance (real; 0%/empty until an instructor marks it) ---------- */
  const attRing = document.querySelector('#attendanceRing');
  const attList = document.querySelector('#attendanceList');
  const attPercent = attendance ? attendance.percent : 0;
  const attRecords = attendance ? attendance.recent : [];
  if (attRing) { attRing.innerHTML = PGCC_UI.ring(attPercent, 160, 13); PGCC_UI.animateRings(attRing); }
  if (attList) {
    attList.innerHTML = attRecords.length ? attRecords.map(r => `
      <div class="list-row"><div class="ic" style="background:${r.status==='present'?'var(--green-100)':'#fceae7'};color:${r.status==='present'?'var(--green-700)':'#a3382a'};"><i class="bi bi-${r.status==='present'?'check2':'x'}"></i></div>
      <div class="body"><b>${new Date(r.date).toLocaleDateString()}</b><span>${realCourse ? realCourse.title : ''}</span></div>
      <div class="meta"><span class="pill ${r.status==='present'?'pill-green':'pill-coral'}">${r.status}</span></div></div>`).join('')
      : `<div class="empty-state"><div class="ic"><i class="bi bi-calendar3-week"></i></div><h4>No attendance recorded yet</h4><p class="muted">Your instructor hasn't marked attendance for any classes yet.</p></div>`;
  }

  /* ---------- Messages (unchanged — outside this round's scope) ---------- */
  initChat('#chatList', '#chatMain', D.conversations);

  /* ---------- AI Tutor (unchanged — outside this round's scope) ---------- */
  initAITutor();

  /* ---------- Profile (real data; photo is the ONLY editable field) ---------- */
  const profileHost = document.querySelector('#profileContent');
  function renderProfile() {
    if (!profileHost) return;
    const name = me ? me.name : mockU.name;
    const email = me ? me.email : 'john.okafor@example.com';
    const avatar = (me && me.profileImage) ? resolveUploadUrl(me.profileImage) : (PGCC_UI.user.avatar || FALLBACK_IMG);
    const joinDateLabel = me?.joinDate ? new Date(me.joinDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const courseTitle = realCourse ? realCourse.title : (me ? 'No course enrolled' : mockU.dept);

    profileHost.innerHTML = `
      <div class="profile-head">
        <div class="profile-avatar"><img id="profilePhotoPreview" data-user-avatar src="${avatar}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" alt=""><button type="button" id="profilePhotoBtn" title="Change photo"><i class="bi bi-camera"></i></button></div>
        <input type="file" id="profilePhotoInput" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
        <div style="flex:1;min-width:220px;">
          <h2 style="margin-bottom:4px;">${name}</h2>
          <p class="muted" style="margin-bottom:10px;">${courseTitle}${me ? ' · ' + (me.enrolledCoursesCount ? 'Enrolled' : 'Not yet enrolled') : ''}</p>
          <div class="flex gap-8" style="flex-wrap:wrap;"><span class="pill pill-green"><i class="bi bi-check2-circle"></i> Active Student</span><span class="pill pill-outline"><i class="bi bi-calendar3"></i> Joined ${joinDateLabel}</span></div>
        </div>
      </div>
      ${me ? `<div class="panel" style="background:var(--green-100);border:none;padding:14px 18px;margin-bottom:20px;"><p style="margin:0;font-size:12.5px;color:var(--green-700);"><i class="bi bi-info-circle"></i> Only your profile photo can be updated here. To correct any other detail, contact the school office.</p></div>` : ''}
      <div class="dash-grid">
        <div>
          <div class="panel">
            <div class="panel-head"><h3>Contact Details</h3></div>
            <div class="form-row">
              <div class="form-field"><label>Full Name</label><input class="form-control" value="${name}" readonly></div>
              <div class="form-field"><label>Email</label><input class="form-control" value="${email}" readonly></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Phone</label><input class="form-control" value="${me?.phone || '—'}" readonly></div>
              <div class="form-field"><label>Course</label><input class="form-control" value="${courseTitle}" readonly></div>
            </div>
            <div class="form-field"><label>Address</label><input class="form-control" value="${me?.address || '—'}" readonly></div>
          </div>
          <div class="panel">
            <div class="panel-head"><h3>My Courses</h3></div>
            ${realCourse ? `<div class="list-row"><div class="ic" style="background:var(--green-100);color:var(--green-700);"><i class="bi bi-journal-code"></i></div><div class="body"><b>${realCourse.title}</b><span>${me.progress}% complete</span></div></div>` : '<p class="muted" style="font-size:13.5px;">No course enrolled yet.</p>'}
          </div>
        </div>
        <div>
          <div class="profile-id-card">
            <p style="color:#cfe4d4;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;position:relative;z-index:1;">Student ID Card</p>
            <img data-user-avatar src="${avatar}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" style="width:64px;height:64px;border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,0.4);position:relative;z-index:1;" alt="">
            <h3 style="color:#fff;margin:14px 0 2px;position:relative;z-index:1;">${name}</h3>
            <p style="color:#cfe4d4;margin:0;font-size:13px;position:relative;z-index:1;">${email}</p>
            <p style="color:#cfe4d4;margin:2px 0 0;font-size:12px;position:relative;z-index:1;">${courseTitle}</p>
          </div>
          <div class="panel">
            <div class="panel-head"><h3>Certificates</h3></div>
            <p class="muted" style="font-size:13.5px;">No certificates issued yet.</p>
          </div>
        </div>
      </div>`;

    document.querySelector('#profilePhotoBtn')?.addEventListener('click', () => document.querySelector('#profilePhotoInput').click());
    document.querySelector('#profilePhotoInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.querySelectorAll('[data-user-avatar]').forEach(el => el.src = URL.createObjectURL(file));

      if (!me) { PGCC_UI.toast('Connect the backend to save a real photo', 'bi-exclamation-circle'); return; }
      const fd = new FormData();
      fd.append('image', file);
      try {
        const token = PGCC_AUTH.token();
        const res = await fetch(`${API_BASE_URL}/student/profile-photo`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error || 'Upload failed.');
        PGCC_UI.user.avatar = resolveUploadUrl(updated.profileImage);
        const s = PGCC_AUTH.session();
        if (s) { s.profileImage = updated.profileImage; localStorage.setItem(PGCC_AUTH.activeKey, JSON.stringify(s)); }
        PGCC_UI.fillUser();
        PGCC_UI.toast('Profile photo updated', 'bi-check2-circle');
      } catch (err) {
        PGCC_UI.toast('Could not update photo: ' + err.message, 'bi-exclamation-triangle');
      }
    });
  }
  renderProfile();

  /* ---------- Notifications (topbar bell) ---------- */
  async function loadNotifications() {
    const panel = document.querySelector('.notif-panel');
    const dot = document.querySelector('[data-bell] .dot');
    if (!panel) return;
    if (!me) { if (dot) dot.style.display = 'none'; return; }
    try {
      const notes = await PGCC_AUTH.apiFetch('/student/notifications');
      if (dot) dot.style.display = notes.some(n => !n.read) ? 'block' : 'none';
      panel.innerHTML = notes.length ? notes.map(n => `
        <div class="list-row" data-notif="${n._id}" style="cursor:pointer;${n.read ? '' : 'background:var(--green-100);border-radius:8px;'}">
          <div class="ic" style="background:var(--green-100);color:var(--green-700);width:34px;height:34px;"><i class="bi bi-bell"></i></div>
          <div class="body"><b style="font-size:13px;">${n.title}</b><span style="font-size:11.5px;">${new Date(n.createdAt).toLocaleDateString()}</span></div>
        </div>`).join('') : `<p class="muted" style="font-size:13px;padding:12px;">No notifications yet.</p>`;
      panel.querySelectorAll('[data-notif]').forEach(row => row.addEventListener('click', async () => {
        const id = row.dataset.notif;
        const note = notes.find(n => n._id === id);
        if (!note.read) {
          try { await PGCC_AUTH.apiFetch(`/student/notifications/${id}/read`, { method: 'POST' }); } catch (e) { /* non-critical */ }
        }
        const overlay = document.createElement('div');
        overlay.className = 'd-modal-overlay open';
        overlay.innerHTML = `<div class="d-modal"><div class="d-modal-head"><h3>${note.title}</h3><button class="d-modal-close"><i class="bi bi-x-lg"></i></button></div><div>${note.bodyHtml}</div></div>`;
        overlay.querySelector('.d-modal-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        loadNotifications();
      }));
    } catch (err) {
      panel.innerHTML = `<p class="muted" style="font-size:13px;padding:12px;">Could not load notifications.</p>`;
    }
  }
  loadNotifications();

  PGCC_UI.animateVinesOnLoad();

  /* ---------------- helpers ---------------- */
  function emptyRow(msg) { return `<p class="muted" style="padding:10px 0;margin:0;font-size:13.5px;">${msg}</p>`; }


  function initChat(listSel, mainSel, conversations) {
    const listHost = document.querySelector(listSel);
    const mainHost = document.querySelector(mainSel);
    if (!listHost || !mainHost) return;
    let active = 0;

    function renderList() {
      listHost.innerHTML = conversations.map((c, i) => `
        <div class="chat-item ${i === active ? 'active' : ''}" data-i="${i}">
          <img src="${c.avatar}" onerror="${ONERR}" alt="">
          <div class="body"><b>${c.name}</b><span>${c.last}</span></div>
          <div style="text-align:right;"><div class="time">${c.time}</div>${c.unread ? `<span class="pill pill-green" style="margin-top:4px;">${c.unread}</span>` : ''}</div>
        </div>`).join('');
      listHost.querySelectorAll('.chat-item').forEach(item => item.addEventListener('click', () => {
        active = parseInt(item.dataset.i);
        conversations[active].unread = 0;
        renderList(); renderMain();
      }));
    }
    function renderMain() {
      const c = conversations[active];
      mainHost.innerHTML = `
        <div class="chat-head">
          <img src="${c.avatar}" onerror="${ONERR}" alt="">
          <div><b style="display:block;font-size:14px;">${c.name}</b><span class="muted" style="font-size:12px;">${c.role}</span></div>
          <button class="icon-btn hide-mobile-btn" id="backToList" style="margin-left:auto;display:none;"><i class="bi bi-arrow-left"></i></button>
        </div>
        <div class="chat-body" id="chatBody">${c.messages.map(m => `<div class="msg ${m.from === 'me' ? 'out' : 'in'}">${m.text}</div>`).join('')}</div>
        <form class="chat-input" id="chatForm"><input type="text" placeholder="Type a message…" required><button type="submit"><i class="bi bi-send"></i></button></form>`;
      const body = mainHost.querySelector('#chatBody');
      body.scrollTop = body.scrollHeight;
      mainHost.querySelector('#chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        if (!input.value.trim()) return;
        c.messages.push({ from: 'me', text: input.value.trim() });
        c.last = input.value.trim(); c.time = 'Now';
        input.value = '';
        renderMain(); renderList();
      });
    }
    renderList(); renderMain();
  }

  function initAITutor() {
    const body = document.querySelector('#aiTutorBody');
    const form = document.querySelector('#aiTutorForm');
    if (!body || !form) return;
    let history = [...D.aiTutorSeed];

    function paint() {
      body.innerHTML = history.map(m => `<div class="msg ${m.from === 'me' ? 'out' : 'ai'}">${m.text}</div>`).join('');
      body.scrollTop = body.scrollHeight;
    }
    paint();

    function fakeAnswer(q) {
      const ql = q.toLowerCase();
      if (ql.includes('flexbox') || ql.includes('css')) return "Flexbox lays child elements out along a single row or column. Set `display:flex` on the parent, then use `justify-content` for the main axis and `align-items` for the cross axis. Want a practice exercise?";
      if (ql.includes('javascript') || ql.includes('js')) return "In JavaScript, the DOM represents your page as objects you can change with code — e.g. `document.querySelector('.btn')` grabs an element you can then style or listen to events on.";
      if (ql.includes('python') || ql.includes('pandas')) return "A pandas DataFrame is like a spreadsheet in Python. `df.head()` previews rows, and `df['column']` selects a column. Try it on this week's dataset in your lesson files!";
      if (ql.includes('exam') || ql.includes('cbt')) return "Your next CBT exam is under the Online Exams tab. You'll get a live countdown timer and a question navigator so you can jump between questions before submitting.";
      if (ql.includes('certificate')) return "Certificates unlock automatically once you finish all lessons, assignments, and pass the final exam for a course. Check the Certificates tab for your progress.";
      return "Good question! While this is a front-end preview, once connected to the AI backend I'll give a full, course-aware explanation with examples drawn straight from your lessons.";
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const q = input.value.trim();
      if (!q) return;
      history.push({ from: 'me', text: q });
      input.value = '';
      paint();
      body.insertAdjacentHTML('beforeend', `<div class="msg ai" id="typingMsg"><span class="typing-dots"><span></span><span></span><span></span></span></div>`);
      body.scrollTop = body.scrollHeight;
      setTimeout(() => {
        document.querySelector('#typingMsg')?.remove();
        history.push({ from: 'ai', text: fakeAnswer(q) });
        paint();
      }, 1100);
    });

    document.querySelectorAll('.ai-suggest button').forEach(btn => btn.addEventListener('click', () => {
      form.querySelector('input').value = btn.textContent;
      form.dispatchEvent(new Event('submit'));
    }));
  }
});
