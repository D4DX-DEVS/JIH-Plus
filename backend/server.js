const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const initializeMonthlyReportScheduler = require('./schedulers/monthlyReportScheduler');
const initializeYearlyReportScheduler = require('./schedulers/yearlyReportScheduler');
const initializeQuarterlyReportScheduler = require('./schedulers/quarterlyReportScheduler');
const initializeIhthisabiDynamicReportScheduler = require('./schedulers/ihthisabiDynamicReportScheduler');
const initializeIhthisabiAutoAlternativeScheduler = require('./schedulers/ihthisabiAutoAlternativeScheduler');

require('dotenv').config({ quiet: true });

const app = express();

// CORS: comma-separated exact origins, e.g. "https://jihkerala.info,http://localhost:5173".
// Unset keeps the old allow-all behaviour so a deploy never locks out the frontend.
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
if (corsAllowedOrigins.length) {
  app.use(cors({ origin: corsAllowedOrigins }));
} else {
  console.warn('CORS_ALLOWED_ORIGINS not set: allowing requests from any origin.');
  app.use(cors());
}
// Increase body parser limit to handle base64 image uploads (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
const formMasterDataRoutes = require('./routes/formMasterDataRoutes');

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

// Import MEMBERS APPLICATION routes (Rukn / Karkun)
const membersAuthRoutes = require('./routes/members/auth');
const membersAccessRoutes = require('./routes/members/access');
const membersAdminRoutes = require('./routes/members/admin');
const membersMasterDataRoutes = require('./routes/members/masterData');
const membersFormRoutes = require('./routes/members/forms');
const membersWorkflowRoutes = require('./routes/members/workflows');
const membersAccessLinkRoutes = require('./routes/members/accessLinks');
const membersApplicationRoutes = require('./routes/members/applications');
const membersNotificationRoutes = require('./routes/members/notifications');
const membersFormMasterDataRoutes = require('./routes/members/formMasterData');

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
    // Auto-submit alternative reports for Aged / Patient members
    initializeIhthisabiAutoAlternativeScheduler();
  } catch (indexErr) {
    console.error('Error syncing IHTHISABI User indexes:', indexErr);
  }
});

// MongoDB Connection - MEMBERS APPLICATION Database (Rukn / Karkun)
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

  // The members connection runs with bufferCommands off, so Mongoose's automatic
  // index build at model load fires before the connection is open and silently
  // fails — leaving every unique constraint (usernames, link tokens, locations)
  // unenforced. Build the declared indexes once the connection is up.
  const results = await Promise.allSettled(
    Object.values(membersConnection.models).map(model => model.createIndexes())
  );
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? `${Object.keys(membersConnection.models)[i]}: ${r.reason?.message}` : null))
    .filter(Boolean);
  if (failed.length) console.error('MEMBERS index build failed:', failed.join('; '));
  else console.log('MEMBERS indexes ensured');
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

// JIH Routes — one router, mounted once per tenant (config/tenants.js). The
// master portal keeps /api/*; each franchise gets the same router under its own
// prefix (e.g. /api/womens/*) and its own database via the tenant context.
// Franchises are mounted first so their longer prefixes win over /api.
const { listTenants } = require('./config/tenants');
const { tenantMiddleware } = require('./config/tenantContext');

const jihRouter = express.Router();
jihRouter.use('/admin', adminRoutes);
jihRouter.use('/user', userRoutes);
jihRouter.use('/master', locationMasterRoutes);
jihRouter.use('/area', areaRoutes);
jihRouter.use('/district', districtRoutes);
jihRouter.use('/unit', unitRoutes);
jihRouter.use('/notifications', notificationRoutes);
jihRouter.use('/form-master-data', formMasterDataRoutes);
jihRouter.use('/', reportRoutes);
jihRouter.use('/targets', targetRoutes);

listTenants()
  .sort((a, b) => b.apiPrefix.length - a.apiPrefix.length)
  .forEach((tenant) => {
    app.use(tenant.apiPrefix, tenantMiddleware(tenant), jihRouter);
  });

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
app.use('/api/members/form-master-data', membersFormMasterDataRoutes);

// PORT fix for DigitalOcean
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});                                                          