/* =========================================================
   PGCC INSTITUTE — SHARED FOOTER INJECTION
   Keeps footer identical across every public page without
   duplicating the markup file by file.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector('#siteFooter');
  if (!host) return;
  const base = host.dataset.base || '';

  host.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="${base}index.html" class="brand" style="margin-bottom:16px;">
            <img src="${base}assets/img/logo.png" alt="PGCC Institute" style="width:40px;height:40px;object-fit:contain;" onerror="this.src='https://placehold.co/80x80/0f2e1d/34c66f?text=PGCC'">
            <span class="brand-text"><span class="brand-name" style="color:#fff;">PGCC Institute</span><span class="brand-sub" style="color:#8fb198;">Pachels Global Computer Centre</span></span>
          </a>
          <p>Hands-on computer training in Benin City, Edo State — building real skills for the digital economy, one student at a time.</p>
          <div class="footer-social">
            <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="#" aria-label="Twitter / X"><i class="bi bi-twitter-x"></i></a>
            <a href="#" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
          </div>
        </div>
        <div class="footer-col">
          <h5>Explore</h5>
          <a href="${base}about.html">About the School</a>
          <a href="${base}courses.html">Courses</a>
          <a href="${base}admission.html">Admission</a>
          <a href="${base}news.html">News &amp; Announcements</a>
          <a href="${base}contact.html">Contact</a>
        </div>
        <div class="footer-col">
          <h5>Portals</h5>
          <a href="${base}login.html?role=student">Student Portal</a>
          <a href="${base}login.html?role=instructor">Instructor Portal</a>
          <a href="${base}login.html?role=admin">Admin Portal</a>
          <a href="${base}ai-assistant.html">AI Learning Assistant</a>
        </div>
        <div class="footer-col">
          <h5>Get in Touch</h5>
          <a href="#"><i class="bi bi-geo-alt"></i> First Floor, 30 Okhunmwun Junction, Iguosa, Benin–Lagos Expressway, Benin City, Edo State</a>
          <a href="tel:08070738025"><i class="bi bi-telephone"></i> 0807 073 8025</a>
          <a href="tel:08055112416"><i class="bi bi-telephone"></i> 0805 511 2416</a>
          <a href="mailto:pachelsglobalcomputercentre@gmail.com"><i class="bi bi-envelope"></i> pachelsglobalcomputercentre@gmail.com</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="footerYear"></span> Pachels Global Computer Centre (PGCC Institute). All rights reserved.</span>
        <span>Front-end preview build · Designed for PGCC Institute, Benin City</span>
      </div>
    </div>`;

  document.querySelector('#footerYear').textContent = new Date().getFullYear();
});
