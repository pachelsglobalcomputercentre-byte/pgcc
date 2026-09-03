/* =========================================================
   PGCC INSTITUTE — AUTH (real backend version)
   Replaces the old localStorage-only demo. Login now checks
   real credentials against the API; a signed token (JWT) is
   kept in localStorage purely as the session handle — the
   actual student/instructor/admin DATA all lives server-side
   in MongoDB, not in the browser.
   ========================================================= */

const PGCC_AUTH = {
  activeKey: 'pgcc_token', // legacy fallback until a role-specific key is established below

  keyFor(role) { return `pgcc_session_${role}`; },

  saveSession(token, role, name, email, profileImage) {
    const key = this.keyFor(role);
    localStorage.setItem(key, JSON.stringify({ token, role, name, email, profileImage: profileImage || '' }));
    this.activeKey = key; // this tab is now "acting as" this role
  },
  logout() {
    localStorage.removeItem(this.activeKey);
    window.location.href = computeLoginPath();
  },
  session() {
    try { return JSON.parse(localStorage.getItem(this.activeKey)); } catch (e) { return null; }
  },
  token() {
    return this.session()?.token || null;
  },
  requireRole(role) {
    // Each role gets its own storage key, so logging in as admin in one tab
    // can never overwrite/clobber a student session active in another tab.
    this.activeKey = this.keyFor(role);
    const s = this.session();
    if (!s || !s.token || s.role !== role) {
      window.location.href = computeLoginPath();
    }
  },

  /** Adds the Authorization header to a fetch() call automatically. */
  async apiFetch(path, options = {}) {
    const token = this.token();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired — please log in again.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed.');
    return json;
  }
};

function computeLoginPath() {
  const inSub = /\/(student|instructor|admin)\//.test(window.location.pathname);
  return inSub ? '../login.html' : 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#loginForm');
  if (!form) return;

  const tabs = document.querySelectorAll('.role-tabs button');
  let activeRole = form.dataset.defaultRole || 'student';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeRole = tab.dataset.role;
      const roleNames = { student: 'Student', instructor: 'Instructor', admin: 'Administrator' };
      const label = document.querySelector('#roleLabel');
      if (label) label.textContent = roleNames[activeRole];
    });
  });

  const errorBox = document.querySelector('#loginError');
  const twoFactorBox = document.querySelector('#twoFactorBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Signing in…';

    const email = form.querySelector('#loginEmail').value.trim();
    const passkey = form.querySelector('#loginPasskey').value.trim();

    try {
      const result = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passkey })
      }).then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Login failed.');
        return j;
      });

      if (result.requiresTwoFactor) {
        // Admin path: show the code-entry step instead of logging in yet.
        form.style.display = 'none';
        twoFactorBox.style.display = 'block';
        twoFactorBox.dataset.uid = result.uid;
        document.querySelector('#twoFactorCode').focus();
      } else {
        PGCC_AUTH.saveSession(result.token, result.role, result.name, result.email, result.profileImage);
        window.location.href = `${result.role}/dashboard.html`;
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  document.querySelector('#twoFactorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = document.querySelector('#twoFactorBox');
    const errBox = document.querySelector('#twoFactorError');
    errBox.style.display = 'none';
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Verifying…';

    try {
      const result = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: box.dataset.uid, code: document.querySelector('#twoFactorCode').value.trim() })
      }).then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Verification failed.');
        return j;
      });

      PGCC_AUTH.saveSession(result.token, result.role, result.name, result.email, result.profileImage);
      window.location.href = `${result.role}/dashboard.html`;
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
});
