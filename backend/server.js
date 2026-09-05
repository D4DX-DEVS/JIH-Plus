const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const initializeMonthlyReportScheduler = require('./schedulers/monthlyReportScheduler');
const initializeYearlyReportScheduler = require('./schedulers/yearlyReportScheduler');
const initializeQuarterlyReportScheduler = require('./schedulers/quarterlyReportScheduler');
const initializeIhthisabiDynamicReportScheduler = require('./schedulers/ihthisabiDynamicReportScheduler');

const app = express();
app.use(cors());
// Increase body parser limit to handle base64 image uploads (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

require('dotenv').config({ quiet: true });

// Import JIH routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const locationMasterRoutes = require('./routes/locationMasterRoutes');
const areaRoutes = require('./routes/areaRoutes');
const districtRoutes = require('./routes/districtRoutes');
const unitRoutes = require('./routes/unitRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const targetRoutes = require('./routes/targetRoutes');

// Import IHTHISABI routes
const ihthisabiAuthRoutes = require('./routes/ihthisabi/auth');
const ihthisabiSubmissionsRoutes = require('./routes/ihthisabi/submissions');
const ihthisabiAlternativeSubmissionsRoutes = require('./routes/ihthisabi/alternativeSubmissions');
const ihthisabiAdminRoutes = require('./routes/ihthisabi/admin');
const ihthisabiLocationRoutes = require('./routes/ihthisabi/location');
const ihthisabiUnitAdminRoutes = require('./routes/ihthisabi/unitAdmin');
const ihthisabiDistrictAdminRoutes = require('./routes/ihthisabi/districtAdmin');
const ihthisabiDynamicReportRoutes = require('./routes/ihthisabi/dynamicReports');
const ihthisabiApplicationFormRoutes = require('./routes/ihthisabi/applicationForm');
const ihthisabiMasterDataRoutes = require('./routes/ihthisabi/masterData');

// Import MEMBERS APPLICATION routes (Rukn / Karkoon)
const membersAuthRoutes = require('./routes/members/auth');
const membersAccessRoutes = require('./routes/members/access');
const membersAdminRoutes = require('./routes/members/admin');
const membersMasterDataRoutes = require('./routes/members/masterData');
const membersFormRoutes = require('./routes/members/forms');
const membersWorkflowRoutes = require('./routes/members/workflows');
const membersAccessLinkRoutes = require('./routes/members/accessLinks');
const membersApplicationRoutes = require('./routes/members/applications');
const membersNotificationRoutes = require('./routes/members/notifications');

// MongoDB Connection - JIH Database
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  retryWrites: true
})
  .then(() => {
    console.log('Connected to JIH MongoDB');
    initializeMonthlyReportScheduler();
    initializeYearlyReportScheduler();
    initializeQuarterlyReportScheduler();
  })
  .catch((err) => console.error('JIH MongoDB connection error:', err));

// MongoDB Connection - IHTHISABI Database
const ihthisabiConnection = require('./config/ihthisabiConnection');

ihthisabiConnection.on('connected', async () => {
  console.log('Connected to IHTHISABI MongoDB');
  try {
    // Ensure indexes reflect current schema definitions
    const User = require('./models/ihthisabi/User');
    await User.syncIndexes();
    console.log('IHTHISABI User indexes synced');

    // Kick off dynamic report scheduler after connection is ready
    initializeIhthisabiDynamicReportScheduler();
  } catch (indexErr) {
    console.error('Error syncing IHTHISABI User indexes:', indexErr);
  }
});

// MongoDB Connection - MEMBERS APPLICATION Database (Rukn / Karkoon)
const membersConnection = require('./config/membersConnection');
const { seedMembersDefaults } = require('./utils/members/seed');

membersConnection.on('connected', async () => {
  console.log('Connected to MEMBERS MongoDB');
  try {
    // Roles and the two approval workflows are seeded once, then owned by the
    // admin panel. Seeding is idempotent, so existing edits survive restarts.
    await seedMembersDefaults();
  } catch (seedErr) {
    console.error('Error seeding MEMBERS defaults:', seedErr);
  }
});

// Health check route for DigitalOcean
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Health check endpoint for IHTHISABI
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AIKYAM API is running'
  });
});

// JIH Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/master', locationMasterRoutes);
app.use('/api/area', areaRoutes);
app.use('/api/district', districtRoutes);
app.use('/api/unit', unitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', reportRoutes);
app.use('/api/targets', targetRoutes);

// IHTHISABI Routes
app.use('/api/auth', ihthisabiAuthRoutes);
app.use('/api/submissions', ihthisabiSubmissionsRoutes);
app.use('/api/alternative-submissions', ihthisabiAlternativeSubmissionsRoutes);
app.use('/api/ihthisabi/admin', ihthisabiAdminRoutes);
app.use('/api/ihthisabi/dynamic-reports', ihthisabiDynamicReportRoutes);
app.use('/api/ihthisabi/application-forms', ihthisabiApplicationFormRoutes);
app.use('/api/ihthisabi/admin/master-data', ihthisabiMasterDataRoutes);
app.use('/api/location', ihthisabiLocationRoutes);
app.use('/api/unitadmin', ihthisabiUnitAdminRoutes);
app.use('/api/districtadmin', ihthisabiDistrictAdminRoutes);
app.use('/api/admin', ihthisabiAdminRoutes);

// MEMBERS APPLICATION Routes — a single prefix, deliberately not overlapping the
// JIH or IHTHISABI mounts above.
app.use('/api/members/auth', membersAuthRoutes);
app.use('/api/members/access', membersAccessRoutes);
app.use('/api/members/admin/master-data', membersMasterDataRoutes);
app.use('/api/members/admin', membersAdminRoutes);
app.use('/api/members/forms', membersFormRoutes);
app.use('/api/members/workflows', membersWorkflowRoutes);
app.use('/api/members/access-links', membersAccessLinkRoutes);
app.use('/api/members/applications', membersApplicationRoutes);
app.use('/api/members/notifications', membersNotificationRoutes);

// PORT fix for DigitalOcean
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});                                                          