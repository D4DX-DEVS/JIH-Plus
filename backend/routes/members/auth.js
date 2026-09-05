/**
 * Members Application — admin/reviewer authentication.
 * Mounted at /api/members/auth
 */

const express = require('express');
const router = express.Router();

const MemberAdmin = require('../../models/members/MemberAdmin');
const Role = require('../../models/members/Role');
const {
  protect,
  requireMembersDb,
  signAdminToken,
  envSuperAdminAccount,
  ENV_SUPER_ADMIN_ID
} = require('../../middlewares/members/auth');

/** POST /api/members/auth/login */
router.post('/login', requireMembersDb, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const envEmail = process.env.MEMBERS_ADMIN_EMAIL;
    const envPassword = process.env.MEMBERS_ADMIN_PASSWORD;
    const supplied = String(username).trim().toLowerCase();

    // Env-sourced super admin. There is no MemberAdmin row for this account.
    if (envEmail && supplied === String(envEmail).trim().toLowerCase()) {
      if (!envPassword || password !== envPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const roleDoc = await Role.findOne({ key: 'superAdmin' }).lean();
      if (!roleDoc) {
        return res.status(503).json({ success: false, message: 'Roles are not seeded yet' });
      }
      const account = envSuperAdminAccount(envEmail, roleDoc);
      return res.json({
        success: true,
        token: signAdminToken({ _id: ENV_SUPER_ADMIN_ID, role: roleDoc, isSuperAdmin: true }),
        user: account
      });
    }

    const account = await MemberAdmin.findOne({ username: supplied }).populate('role');
    if (!account || !(await account.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!account.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (!account.role || !account.role.isActive) {
      return res.status(403).json({ success: false, message: 'Role is deactivated' });
    }

    account.lastLogin = new Date();
    await account.save();

    res.json({
      success: true,
      token: signAdminToken(account),
      user: account.toJSON()
    });
  } catch (error) {
    console.error('Members login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

/** GET /api/members/auth/me */
router.get('/me', protect, async (req, res) => {
  const user = typeof req.user.toJSON === 'function' ? req.user.toJSON() : req.user;
  res.json({ success: true, user });
});

/** POST /api/members/auth/change-password */
router.post('/change-password', protect, async (req, res) => {
  try {
    if (req.user.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'The super admin password is set in the environment and cannot be changed here'
      });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const account = await MemberAdmin.findById(req.user._id);
    if (!account || !(await account.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    account.password = newPassword;
    await account.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Members change-password error:', error);
    res.status(500).json({ success: false, message: 'Server error while changing password' });
  }
});

module.exports = router;
