const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  excerpt: { type: String, default: '' },  // short summary for cards/lists
  bodyHtml: { type: String, default: '' }, // full rich-text content
  category: { type: String, default: 'Notice' },
  image: { type: String, default: '' },
  attachments: [{ name: String, url: String }], // extra PDFs etc. beyond inline embeds
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

announcementSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
