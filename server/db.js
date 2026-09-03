const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('REPLACE_ME')) {
    console.warn('⚠ MONGODB_URI is not set yet — see .env for setup steps. Server will start, but database routes will fail until it\'s connected.');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('✓ MongoDB connected');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
  }
}

module.exports = connectDB;
