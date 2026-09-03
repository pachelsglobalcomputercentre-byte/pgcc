const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — plenty for lesson PDFs/PPTs, generous for ZIPs too
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type.'));
  }
});

// NOTE: files saved here live on local disk. That's fine for local testing,
// but Render's free tier (and most free hosts) wipe local disk on every
// restart/redeploy. Before going live, swap this for Cloudinary — the
// upload() call sites won't need to change much, just what's inside them.
module.exports = upload;
