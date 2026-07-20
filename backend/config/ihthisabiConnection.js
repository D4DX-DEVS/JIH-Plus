require('dotenv').config({ quiet: true }); // Ensure env is loaded even if entrypoint didn't load it yet
const mongoose = require('mongoose');

// Use dedicated IHTHISABI URI when provided, otherwise fall back to the primary
// Mongo URI so we don't end up with a dangling connection that buffers forever.
const ihthisabiUri = process.env.IHTHISABI_MONGODB_URI;

// If no URI is available, keep the app alive with a disconnected connection so
// that dependent modules can still load. Unified login handlers already return
// 503 when the connection isn't ready.
let ihthisabiConnection;
if (!ihthisabiUri) {
  console.warn(
    'IHTHISABI Mongo URI not set (IHTHISABI_MONGODB_URI). ' +
    'Starting with a disconnected ihthisabi connection; related routes will return 503.'
  );
  ihthisabiConnection = mongoose.createConnection();
} else {
  // Create a separate connection for IHTHISABI with strict buffering limits so
  // login attempts fail fast instead of hanging.
  ihthisabiConnection = mongoose.createConnection(ihthisabiUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    bufferCommands: false,
    bufferTimeoutMS: 5000
  });
}

ihthisabiConnection.on('connected', () => {
  console.log('Connected to IHTHISABI MongoDB');
});

ihthisabiConnection.on('error', (err) => {
  console.error('IHTHISABI MongoDB connection error:', err);
});

ihthisabiConnection.on('disconnected', () => {
  console.warn('IHTHISABI MongoDB disconnected');
});

ihthisabiConnection.on('reconnected', () => {
  console.log('IHTHISABI MongoDB reconnected');
});

module.exports = ihthisabiConnection;
module.exports.ihthisabiUri = ihthisabiUri;

