const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor', 'admin'], required: true },
  name: { type: String, required: true },
  profileImage: { type: String, default: '' }, // URL path under /uploads
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  streakCount: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
