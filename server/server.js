require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./db');

const applicationsRoutes = require('./routes/applications');
const authRoutes = require('./routes/auth');
const paymentsRoutes = require('./routes/payments');
const coursesRoutes = require('./routes/courses');
const announcementsRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const examsRoutes = require('./routes/exams');
const assignmentsRoutes = require('./routes/assignments');
const broadcastRoutes = require('./routes/broadcast');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // uploaded images/PDFs are fetched from the GitHub Pages frontend, a different origin
  contentSecurityPolicy: false // this is a pure JSON/file API, not an HTML-serving app — CSP has nothing to protect here
}));

// A generous baseline limit across the whole API, so no single client can
// hammer the server. Login and application-submission have their own
// stricter limits layered on top of this.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ ok: true, service: 'PGCC Institute API' }));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/applications', applicationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/admin/broadcast', broadcastRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || err.message === 'Unsupported file type.') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`✓ PGCC Institute API running on port ${PORT}`));
});
