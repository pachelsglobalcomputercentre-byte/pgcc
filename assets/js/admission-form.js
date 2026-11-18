/* =========================================================
   PGCC INSTITUTE — ADMISSION FORM
   Validates NIN format, passport photo size, and email format,
   then submits to two places at once:
     1) The Express API (server/), which saves to MongoDB —
        this is what makes it show up in the Admin Dashboard.
     2) FormSubmit.co (emails a copy to ADMIN_NOTIFY_EMAIL).
   Either one failing does not block the other.

   The Course Track dropdown is filtered by the chosen Training
   Mode (online / physical), so mismatched pairs can't be submitted.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#admissionForm');
  const successBox = document.querySelector('#admissionSuccess');
  const errorBox = document.querySelector('#admissionFormError');
  if (!form) return;

  /* ---------- Courses, filtered by training mode ---------- */
  const courseSel = document.querySelector('#admissionCourseSelect');
  const modeSel = document.querySelector('#admissionDeliveryModeSelect');
  let allCourses = []; // { title, mode } — mode is null for demo data (no filtering possible)

  try {
    const res = await fetch(`${API_BASE_URL}/courses`);
    const live = await res.json();
    if (Array.isArray(live) && live.length) {
      allCourses = live.map(c => ({ title: c.title, mode: c.deliveryMode === 'physical' ? 'physical' : 'online' }));
    } else {
      allCourses = PGCC_DATA.courses.map(c => ({ title: c.title, mode: null }));
    }
  } catch (err) {
    console.warn('Could not load live courses, showing demo catalog instead:', err.message);
    allCourses = PGCC_DATA.courses.map(c => ({ title: c.title, mode: null }));
  }

  function populateCourses(selectedTitle) {
    const mode = modeSel.value;
    if (!mode) {
      courseSel.innerHTML = '<option value="">Select a training mode first</option>';
      courseSel.disabled = true;
      return;
    }
    const matching = allCourses.filter(c => c.mode === null || c.mode === mode);
    courseSel.disabled = false;
    courseSel.innerHTML = matching.length
      ? '<option value="">Select a course</option>' + matching.map(c => `<option>${c.title}</option>`).join('')
      : '<option value="">No courses available for this training mode yet</option>';
    if (selectedTitle && matching.some(c => c.title === selectedTitle)) courseSel.value = selectedTitle;
  }

  // Preselect from ?course= (the "Apply for this Course" button): also set the
  // training mode to that course's own mode, so the pair is always consistent.
  const params = new URLSearchParams(window.location.search);
  const preselected = params.get('course');
  const preselectedCourse = allCourses.find(c => c.title === preselected);
  if (preselectedCourse && preselectedCourse.mode) modeSel.value = preselectedCourse.mode;
  populateCourses(preselectedCourse ? preselectedCourse.title : '');

  modeSel.addEventListener('change', () => populateCourses(''));

  /* ---------- Populate nationality + state dropdowns ---------- */
  const natSel = document.querySelector('#nationalitySelect');
  NATIONALITIES.forEach(n => natSel.insertAdjacentHTML('beforeend', `<option ${n==='Nigerian'?'selected':''}>${n}</option>`));
  const natOtherWrap = document.querySelector('#nationalityOtherWrap');
  const natOtherInput = document.querySelector('#nationalityOther');
  natSel.addEventListener('change', () => {
    const isOther = natSel.value === 'Other';
    natOtherWrap.style.display = isOther ? 'block' : 'none';
    natOtherInput.required = isOther;
  });

  const stateSel = document.querySelector('#stateSelect');
  stateSel.insertAdjacentHTML('beforeend', `<option value="">Select state</option>`);
  NIGERIA_STATES.forEach(s => stateSel.insertAdjacentHTML('beforeend', `<option>${s}</option>`));

  /* ---------- FAQ accordion ---------- */
  document.querySelector('#admissionFaq').innerHTML = PGCC_DATA.faqs.map((f, i) => `
    <div class="faq-item ${i===0?'open':''}"><button class="faq-q">${f.q} <i class="bi bi-plus-lg"></i></button><div class="faq-a" style="${i===0?'max-height:200px;':''}"><p>${f.a}</p></div></div>`).join('');
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q'); const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = null; });
      if (!isOpen) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---------- NIN: live format validation (11 digits) ---------- */
  const ninInput = document.querySelector('#ninInput');
  const ninHintDefault = document.querySelector('#ninHint').textContent;
  ninInput.addEventListener('input', () => {
    ninInput.value = ninInput.value.replace(/\D/g, '').slice(0, 11);
    validateNIN(true);
  });
  function validateNIN(silent) {
    const hint = document.querySelector('#ninHint');
    const ok = /^\d{11}$/.test(ninInput.value);
    if (!ninInput.value) { hint.textContent = ninHintDefault; hint.style.color = ''; return null; }
    hint.textContent = ok ? 'Looks good.' : `${ninInput.value.length}/11 digits entered.`;
    hint.style.color = ok ? 'var(--green-700)' : (silent ? '' : 'var(--coral)');
    return ok;
  }

  /* ---------- Passport photo: size + type validation (max 1MB) ---------- */
  const passportInput = document.querySelector('#passportInput');
  const MAX_PHOTO_BYTES = 1 * 1024 * 1024; // 1MB
  passportInput.addEventListener('change', () => validatePassportPhoto());
  function validatePassportPhoto() {
    const hint = document.querySelector('#passportHint');
    const file = passportInput.files[0];
    if (!file) { hint.textContent = ''; return null; }
    const tooBig = file.size > MAX_PHOTO_BYTES;
    const wrongType = !['image/jpeg', 'image/png'].includes(file.type);
    if (tooBig) { hint.textContent = `File is ${(file.size/1024/1024).toFixed(2)}MB — must be under 1MB.`; hint.style.color = 'var(--coral)'; passportInput.value = ''; return false; }
    if (wrongType) { hint.textContent = 'Please upload a JPG or PNG image.'; hint.style.color = 'var(--coral)'; passportInput.value = ''; return false; }
    hint.textContent = `${file.name} (${(file.size/1024).toFixed(0)}KB) — looks good.`;
    hint.style.color = 'var(--green-700)';
    return true;
  }

  /* ---------- Email: format check now, deliverability check is a TODO ---------- */
  const emailInput = document.querySelector('#emailInput');
  emailInput.addEventListener('blur', () => checkEmail());
  async function checkEmail() {
    const hint = document.querySelector('#emailHint');
    const val = emailInput.value.trim();
    if (!val) { hint.textContent = ''; return null; }
    const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!formatOk) { hint.textContent = 'That doesn\'t look like a valid email.'; hint.style.color = 'var(--coral)'; return false; }
    // TODO: swap in a real deliverability check here once we pick a provider.
    hint.textContent = 'Format looks valid.';
    hint.style.color = 'var(--green-700)';
    return true;
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    const ninOk = validateNIN(false);
    const photoOk = validatePassportPhoto();
    const emailOk = await checkEmail();
    const nativeValid = form.checkValidity();

    const problems = [];
    if (!nativeValid) problems.push('Please fill in every required field.');
    if (ninOk === false) problems.push('NIN must be exactly 11 digits.');
    if (photoOk === false) problems.push('Passport photo must be a JPG/PNG under 1MB.');
    if (emailOk === false) problems.push('Please enter a valid email address.');

    if (problems.length) {
      errorBox.textContent = problems[0];
      errorBox.style.display = 'block';
      form.reportValidity();
      return;
    }

    const btn = document.querySelector('#admissionSubmitBtn');
    const originalBtn = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Submitting…';

    const fd = new FormData(form);
    const applicationData = {
      fullName: fd.get('fullName'),
      dob: fd.get('dob'),
      gender: fd.get('gender'),
      nationality: fd.get('nationality') === 'Other' ? natOtherInput.value : fd.get('nationality'),
      state: fd.get('state'),
      lga: fd.get('lga'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      nin: fd.get('nin'),
      deliveryMode: fd.get('deliveryMode'),
      passportPhotoName: passportInput.files[0] ? passportInput.files[0].name : '',
      course: fd.get('course'),
      qualification: fd.get('qualification'),
      goal: fd.get('goal')
    };

    // 1) Save to the real database — as multipart, so the passport photo reaches the server.
    let savedToServer = false;
    let serverError = '';
    try {
      const uploadFd = new FormData();
      Object.entries(applicationData).forEach(([key, val]) => uploadFd.append(key, val || ''));
      if (passportInput.files[0]) uploadFd.append('passportPhoto', passportInput.files[0]);

      const res = await fetch(`${API_BASE_URL}/applications`, { method: 'POST', body: uploadFd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { serverError = json.error || 'Server rejected the application.'; throw new Error(serverError); }
      savedToServer = true;
    } catch (err) {
      console.warn('Could not save to the backend:', err.message);
    }

    // If the server explicitly rejected the application (e.g. mode/course mismatch),
    // tell the applicant instead of showing a false success screen.
    if (serverError) {
      errorBox.textContent = serverError;
      errorBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = originalBtn;
      return;
    }

    // 2) Email a copy via FormSubmit.co too — works even if the API is unreachable.
    try {
      await fetch(`https://formsubmit.co/ajax/${ADMIN_NOTIFY_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `New PGCC Application — ${applicationData.fullName}`,
          ...applicationData,
          savedToServer
        })
      });
    } catch (err) {
      console.warn('FormSubmit.co email failed:', err);
    }

    form.style.display = 'none';
    successBox.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = originalBtn;
  });

  document.querySelector('#applyAnotherBtn')?.addEventListener('click', () => {
    form.reset();
    populateCourses('');
    document.querySelector('#nationalityOtherWrap').style.display = 'none';
    document.querySelectorAll('.hint').forEach(h => h.textContent = '');
    successBox.style.display = 'none';
    form.style.display = 'block';
  });
});
