/* =========================================================
   PGCC INSTITUTE — PUBLIC SITE INTERACTIONS
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Navbar scroll state ---------- */
  const navbar = document.querySelector('.navbar');
  const onScrollNav = () => {
    if (!navbar) return;
    if (window.scrollY > 30) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- Mobile menu ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const mobilePanel = document.querySelector('.mobile-panel');
  const mobileClose = document.querySelector('.mobile-close');
  if (navToggle && mobilePanel) {
    navToggle.addEventListener('click', () => mobilePanel.classList.add('open'));
    mobileClose?.addEventListener('click', () => mobilePanel.classList.remove('open'));
    mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobilePanel.classList.remove('open')));
  }

  /* ---------- Back to top ---------- */
  const toTop = document.querySelector('.to-top');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (target % 1 === 0 ? Math.floor(val) : val.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(c => cio.observe(c));
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ---------- Testimonial slider ---------- */
  const track = document.querySelector('.testi-track');
  if (track) {
    const cards = track.children.length;
    let perView = window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
    let index = 0;
    const move = () => {
      perView = window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
      const maxIndex = Math.max(0, cards - perView);
      index = Math.min(index, maxIndex);
      const pct = (100 / perView) * index;
      track.style.transform = `translateX(-${pct}%)`;
    };
    document.querySelector('.testi-next')?.addEventListener('click', () => {
      const maxIndex = Math.max(0, cards - perView);
      index = index >= maxIndex ? 0 : index + 1;
      move();
    });
    document.querySelector('.testi-prev')?.addEventListener('click', () => {
      const maxIndex = Math.max(0, cards - perView);
      index = index <= 0 ? maxIndex : index - 1;
      move();
    });
    window.addEventListener('resize', move);
    move();
    let auto = setInterval(() => document.querySelector('.testi-next')?.click(), 5500);
    track.closest('.testi-track-wrap')?.addEventListener('mouseenter', () => clearInterval(auto));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Course filter chips ---------- */
  const chips = document.querySelectorAll('.chip[data-filter]');
  const filterCards = document.querySelectorAll('[data-category]');
  if (chips.length && filterCards.length) {
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const f = chip.dataset.filter;
        filterCards.forEach(card => {
          const show = f === 'all' || card.dataset.category === f;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ---------- Video modal ---------- */
  document.querySelectorAll('[data-video-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = document.querySelector('.modal-overlay');
      const iframe = overlay?.querySelector('iframe');
      if (iframe) iframe.src = btn.dataset.videoOpen;
      overlay?.classList.add('open');
    });
  });
  document.querySelectorAll('[data-video-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = document.querySelector('.modal-overlay');
      const iframe = overlay?.querySelector('iframe');
      if (iframe) iframe.src = '';
      overlay?.classList.remove('open');
    });
  });

  /* ---------- Contact form (demo submit) ---------- */
  const contactForm = document.querySelector('#contactForm');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2"></i> Message sent';
    btn.disabled = true;
    contactForm.reset();
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 3000);
  });

  /* ---------- Admission / newsletter demo forms ---------- */
  document.querySelectorAll('.demo-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check2-circle"></i> Submitted';
      setTimeout(() => { btn.innerHTML = original; form.reset(); }, 2600);
    });
  });

});
