/* =========================================================
   PGCC INSTITUTE — DASHBOARD SHELL (shared by all 3 portals)
   ========================================================= */

const PGCC_UI = {

  /* ---------- Boot ---------- */
  init(role) {
    PGCC_AUTH.requireRole(role);
    this.role = role;
    this.user = { ...PGCC_DATA.currentUser[role] };
    const session = PGCC_AUTH.session();
    if (session?.name) this.user.name = session.name; // real name from the server, once logged in for real
    if (session?.profileImage) this.user.avatar = resolveUploadUrl(session.profileImage);
    this.wireSidebar();
    this.wireSectionNav();
    this.wireTopbar();
    this.fillUser();
    this.wireLogout();
    this.wireModals();
    this.animateVinesOnLoad();
    this.refreshProfileFromServer();
  },

  /* Fetches the real, current profile (name + photo) from the server and
     refreshes the sidebar/topbar/profile page with it. This is the piece
     that was missing before — without it, a saved profile photo had
     nowhere to actually get displayed back, ever, even though it did save. */
  async refreshProfileFromServer() {
    try {
      const me = await PGCC_AUTH.apiFetch('/auth/me');
      this.user.name = me.name;
      if (me.profileImage) this.user.avatar = resolveUploadUrl(me.profileImage);
      const s = PGCC_AUTH.session();
      if (s) {
        s.name = me.name;
        s.profileImage = me.profileImage || '';
        localStorage.setItem(PGCC_AUTH.activeKey, JSON.stringify(s));
      }
      this.fillUser();
      document.dispatchEvent(new CustomEvent('pgcc:profile-loaded', { detail: me }));
    } catch (err) {
      console.warn('Could not refresh profile from server:', err.message);
    }
  },

  /* ---------- Image lightbox (click any photo to view it full-size) ---------- */
  openImageLightbox(src) {
    let overlay = document.querySelector('#pgccImageLightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pgccImageLightbox';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,46,29,0.92);z-index:2000;display:flex;align-items:center;justify-content:center;padding:30px;cursor:zoom-out;';
      overlay.innerHTML = `<img style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);" alt=""><button style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.15);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:20px;cursor:pointer;">&times;</button>`;
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = src;
  },

  /* ---------- Sidebar open/collapse ---------- */
  wireSidebar() {
    const shell = document.querySelector('.dash-shell');
    const mobileBtn = document.querySelector('.sidebar-toggle-mobile');
    const collapseBtn = document.querySelector('.sidebar-collapse-btn');
    const overlay = document.querySelector('.sidebar-overlay');

    mobileBtn?.addEventListener('click', () => {
      shell.classList.add('mobile-open');
      overlay?.classList.add('show');
    });
    overlay?.addEventListener('click', () => {
      shell.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
    collapseBtn?.addEventListener('click', () => {
      shell.classList.toggle('collapsed');
      localStorage.setItem('pgcc_sidebar_collapsed', shell.classList.contains('collapsed') ? '1' : '0');
    });
    if (localStorage.getItem('pgcc_sidebar_collapsed') === '1' && window.innerWidth > 1080) {
      shell.classList.add('collapsed');
    }
    // close mobile sidebar after choosing a link
    document.querySelectorAll('.side-link').forEach(l => l.addEventListener('click', () => {
      shell.classList.remove('mobile-open');
      overlay?.classList.remove('show');
    }));
  },

  /* ---------- Section switching ---------- */
  wireSectionNav() {
    const links = document.querySelectorAll('.side-link[data-section]');
    const sections = document.querySelectorAll('.dash-section');
    const titleEl = document.querySelector('.topbar-page-title');

    const activate = (id) => {
      sections.forEach(s => s.classList.toggle('active', s.id === id));
      links.forEach(l => l.classList.toggle('active', l.dataset.section === id));
      const activeLink = document.querySelector(`.side-link[data-section="${id}"]`);
      if (titleEl && activeLink) titleEl.textContent = activeLink.querySelector('span')?.textContent || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.animateVinesOnLoad();
      history.replaceState(null, '', `#${id}`);
      document.dispatchEvent(new CustomEvent('pgcc:section', { detail: { id } }));
    };

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        activate(link.dataset.section);
      });
    });

    // quick-buttons anywhere on the page (e.g. dashboard overview shortcuts)
    document.querySelectorAll('[data-goto-section]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        activate(btn.dataset.gotoSection);
      });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) activate(hash);
  },

  /* ---------- Topbar: notifications dropdown ---------- */
  wireTopbar() {
    const bell = document.querySelector('[data-bell]');
    const panel = document.querySelector('.notif-panel');
    bell?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!panel) return;
      const isOpen = panel.style.display === 'block';
      panel.style.display = isOpen ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
      if (panel && panel.style.display === 'block' && !panel.contains(e.target) && e.target !== bell) panel.style.display = 'none';
    });
  },

  fillUser() {
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = this.user.name);
    document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = this.user.dept);
    document.querySelectorAll('[data-user-id]').forEach(el => el.textContent = this.user.id);
    document.querySelectorAll('[data-user-avatar]').forEach(el => { el.src = this.user.avatar; el.onerror = () => el.src = FALLBACK_IMG; });
    document.querySelectorAll('[data-user-first]').forEach(el => el.textContent = this.user.name.split(' ')[0]);
  },

  wireLogout() {
    document.querySelectorAll('[data-logout]').forEach(el => el.addEventListener('click', (e) => {
      e.preventDefault();
      PGCC_AUTH.logout();
    }));
  },

  /* ---------- Generic modal open/close ---------- */
  wireModals() {
    document.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.modalOpen)?.classList.add('open');
      });
    });
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.d-modal-overlay')?.classList.remove('open');
      });
    });
    document.querySelectorAll('.d-modal-overlay').forEach(ov => {
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('open'); });
    });
  },

  /* ---------- Toasts ---------- */
  toast(msg, icon = 'bi-check2-circle') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i class="bi ${icon}"></i><span>${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, 3200);
  },

  /* ---------- Vine progress bars: animate width when visible ---------- */
  animateVinesOnLoad() {
    document.querySelectorAll('.dash-section.active .vine-bar-fill[data-target], .reveal-init .vine-bar-fill[data-target]').forEach(el => {
      const t = el.dataset.target;
      requestAnimationFrame(() => { el.style.width = t + '%'; });
    });
  },

  /* ---------- SVG ring (donut) chart ---------- */
  ring(percent, size = 150, stroke = 12, color = 'var(--green-500)') {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (percent / 100) * c;
    return `
      <div class="ring-wrap" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}">
          <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"></circle>
          <circle class="ring-fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"
            style="stroke:${color}; stroke-dasharray:${c}; stroke-dashoffset:${c};"
            data-final-offset="${offset}"></circle>
        </svg>
        <div class="ring-label"><b>${percent}%</b><span>Score</span></div>
      </div>`;
  },

  animateRings(root = document) {
    root.querySelectorAll('.ring-fg[data-final-offset]').forEach(el => {
      const off = el.dataset.finalOffset;
      requestAnimationFrame(() => setTimeout(() => { el.style.strokeDashoffset = off; }, 80));
    });
  }
};
