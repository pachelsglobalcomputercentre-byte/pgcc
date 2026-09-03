/* =========================================================
   PGCC INSTITUTE — RICH TEXT EDITOR HELPER
   Wraps Quill (loaded via CDN in admin/dashboard.html) so every
   admin content editor — lessons, announcements — sets up the
   same toolbar the same way.
   ========================================================= */

function initRichEditor(containerSelector, initialHtml = '') {
  const quill = new Quill(containerSelector, {
    theme: 'snow',
    placeholder: 'Write the lesson content here…',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });
  if (initialHtml) quill.root.innerHTML = initialHtml;
  return quill;
}
