const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Pachels Global Computer Centre' },
  shortName: { type: String, default: 'PGCC Institute' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#17a34a' },
  emailNotifications: { type: Boolean, default: true },
  smsAlerts: { type: Boolean, default: false },
  weeklyDigest: { type: Boolean, default: true },
  twoFactorRequired: { type: Boolean, default: true },
  autoLogoutMinutes: { type: Number, default: 30 },
  updatedAt: { type: Date, default: Date.now }
});

// Only one settings document ever exists — routes always upsert this same one.
module.exports = mongoose.model('Settings', settingsSchema);
