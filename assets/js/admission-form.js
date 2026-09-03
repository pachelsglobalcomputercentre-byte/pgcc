/* =========================================================
   PGCC INSTITUTE — ADMISSION FORM
   Validates NIN format, passport photo size, and email format,
   then submits to two places at once:
     1) The Express API (server/), which saves to MongoDB —
        this is what makes it show up in the Admin Dashboard.
        Requires the backend to be running; see /server/README.md.
     2) FormSubmit.co (emails a copy to ADMIN_NOTIFY_EMAIL) —
        works immediately, independent of the backend.
   Either one failing does not block the other.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#admissionForm');
  const successBox = document.querySelector('#admissionSuccess');
  const errorBox = document.querySelector('#admissionFormError');
  if (!form) return;

  /* ---------- Populate course dropdown + preselect from ?course= ---------- */
  const courseSel = document.querySelector('#admissionCourseSelect');
  try {
    const res = await fetch(`${API_BASE_URL}/courses`);
    const live = await res.json();
    const list = Array.isArray(live) && live.length ? live.map(c => c.title) : PGCC_DATA.courses.map(c => c.title);
    list.forEach(title => courseSel.insertAdjacentHTML('beforeend', `<option>${title}</option>`));
  } catch (err) {
    console.warn('Could not load live courses, showing demo catalog instead:', err.message);
    PGCC_DATA.courses.forEach(c => courseSel.insertAdjacentHTML('beforeend', `<option>${c.title}</option>`));
  }
  const params = new URLSearchParams(window.location.search);
  const course = params.get('course');
  if (course) courseSel.value = course;

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

  /* ---------- FAQ accordion (unchanged behavior, moved from inline) ---------- */
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
    // TODO: swap in a real deliverability check here once we pick a provider,
    // e.g. Abstract API / ZeroBounce. Call looks like:
    //   const r = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=YOUR_KEY&email=${val}`);
    //   const j = await r.json(); return j.deliverability === 'DELIVERABLE';
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

    // Fields for the FormSubmit.co email copy (JSON-friendly, no file attached there —
    // that copy is just a heads-up email, the real file goes to the API below).
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

    // 1) Save to the real database — as multipart, so the passport photo
    //    itself actually reaches the server, not just its filename.
    let savedToServer = false;
    try {
      const uploadFd = new FormData();
      Object.entries(applicationData).forEach(([key, val]) => uploadFd.append(key, val || ''));
      if (passportInput.files[0]) uploadFd.append('passportPhoto', passportInput.files[0]);

      const res = await fetch(`${API_BASE_URL}/applications`, { method: 'POST', body: uploadFd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Server rejected the application.');
      savedToServer = true;
    } catch (err) {
      console.warn('Could not reach the backend (is it running?):', err.message);
      // Don't block the user — the FormSubmit.co copy below still gets through,
      // and the admin will at least see it by email even if the API was down.
    }

    // 2) Email a copy via FormSubmit.co too — belt-and-suspenders, works even
    //    if the API above is temporarily unreachable.
    //    NOTE: the first submission ever sent to a new address triggers a
    //    one-time "activate this inbox" email from FormSubmit.co — that
    //    confirmation link has to be clicked once before emails start flowing.
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
    document.querySelector('#nationalityOtherWrap').style.display = 'none';
    document.querySelectorAll('.hint').forEach(h => h.textContent = '');
    successBox.style.display = 'none';
    form.style.display = 'block';
  });
});
