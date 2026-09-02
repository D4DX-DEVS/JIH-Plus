require('dotenv').config({ quiet: true }); // Ensure env is loaded even if entrypoint didn't load it yet
const mongoose = require('mongoose');

// Members Application (Rukn / Karkoon) runs on its own database, fully separate
// from the JIH and IHTHISABI ones.
const membersUri = process.env.MEMBERS_MONGODB_URI;

// If no URI is available, keep the app alive with a disconnected connection so
// that dependent modules can still load. Members routes return 503 when the
// connection isn't ready instead of hanging on buffered commands.
let membersConnection;
if (!membersUri) {
  console.warn(
    'MEMBERS Mongo URI not set (MEMBERS_MONGODB_URI). ' +
    'Starting with a disconnected members connection; related routes will return 503.'
  );
  membersConnection = mongoose.createConnection();
} else {
  membersConnection = mongoose.createConnection(membersUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    bufferCommands: false,
    bufferTimeoutMS: 5000
  });
}

membersConnection.on('error', (err) => {
  console.error('MEMBERS MongoDB connection error:', err);
});

membersConnection.on('disconnected', () => {
  console.warn('MEMBERS MongoDB disconnected');
});

membersConnection.on('reconnected', () => {
  console.log('MEMBERS MongoDB reconnected');
});

module.exports = membersConnection;
module.exports.membersUri = membersUri;
