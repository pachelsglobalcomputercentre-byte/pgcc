const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bodyHtml: { type: String, default: '' },
  channel: { type: String, enum: ['email', 'notification', 'both'], required: true },
  recipientType: { type: String, enum: ['all', 'category', 'individual'], required: true },
  category: String, // set when recipientType === 'category'
  recipientUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // resolved at send time
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentByName: String,
  emailsSent: { type: Number, default: 0 },
  emailsFailed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
