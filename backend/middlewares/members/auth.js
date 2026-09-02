/**
 * Members Application — authentication.
 *
 * All three sections of this app sign with the same JWT_SECRET, so separation by
 * payload shape alone is not enough: `protect` requires `section: 'members'` and
 * rejects JIH and ihthisabi tokens outright.
 *
 * There is one lookup, not a branch per role — every account lives in MemberAdmin
 * and points at a Role. Adding a role never touches this file.
 */

const jwt = require('jsonwebtoken');
const membersConnection = require('../../config/membersConnection');
const MemberAdmin = require('../../models/members/MemberAdmin');
const AccessLink = require('../../models/members/AccessLink');

const SECTION = 'members';
const APPLICANT_SECTION = 'members-applicant';
const APPLICANT_TOKEN_TTL = '4h';

const jwtSecret = () => process.env.JWT_SECRET;
const adminTokenTtl = () => process.env.JWT_EXPIRE || '30d';

/** The env-sourced super admin; there is no MemberAdmin row for it. */
const ENV_SUPER_ADMIN_ID = 'env-super-admin';

function signAdminToken(account) {
  return jwt.sign(
    {
      section: SECTION,
      adminId: account._id,
      roleKey: account.role?.key || '',
      isSuperAdmin: Boolean(account.isSuperAdmin)
    },
    jwtSecret(),
    { expiresIn: adminTokenTtl() }
  );
}

function signApplicantToken(accessLink) {
  return jwt.sign(
    {
      section: APPLICANT_SECTION,
      accessLinkId: accessLink._id,
      formType: accessLink.formType
    },
    jwtSecret(),
    { expiresIn: APPLICANT_TOKEN_TTL }
  );
}

/** The synthetic account object used for the env-based super admin. */
function envSuperAdminAccount(email, roleDoc) {
  return {
    _id: ENV_SUPER_ADMIN_ID,
    username: email,
    name: 'Super Admin',
    email,
    role: roleDoc,
    scope: { mekhala: '', district: '', area: '', unit: '' },
    isRukn: false,
    isActive: true,
    isSuperAdmin: true
  };
}

function connectionReady(res) {
  if (membersConnection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Members database is not available. Check MEMBERS_MONGODB_URI.'
    });
    return false;
  }
  return true;
}

function readToken(req) {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.substring(7);
}

/** Authenticates a members admin/reviewer account. */
const protect = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret());
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    // Reject tokens minted by the JIH portal or ihthisabi, which share this secret.
    if (decoded.section !== SECTION) {
      return res.status(401).json({ success: false, message: 'Token is not valid for the members section' });
    }

    if (!connectionReady(res)) return;

    const Role = require('../../models/members/Role');

    if (decoded.isSuperAdmin && decoded.adminId === ENV_SUPER_ADMIN_ID) {
      const roleDoc = await Role.findOne({ key: 'superAdmin' }).lean();
      if (!roleDoc) {
        return res.status(503).json({ success: false, message: 'Roles are not seeded yet' });
      }
      req.user = envSuperAdminAccount(decoded.email || process.env.MEMBERS_ADMIN_EMAIL, roleDoc);
      return next();
    }

    const account = await MemberAdmin.findById(decoded.adminId).populate('role');
    if (!account) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }
    if (!account.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (!account.role || !account.role.isActive) {
      return res.status(403).json({ success: false, message: 'Role is deactivated' });
    }

    req.user = account;
    next();
  } catch (error) {
    console.error('Members auth error:', error);
    res.status(500).json({ success: false, message: 'Server error in authentication' });
  }
};

/** Restricts a route to the given Role keys. */
const authorizeRoles = (...roleKeys) => (req, res, next) => {
  const key = req.user?.role?.key;
  if (!key || !roleKeys.includes(key)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this resource' });
  }
  next();
};

/** Restricts a route to the env-sourced super admin account. */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only the super admin can perform this action' });
  }
  next();
};

/** Restricts a route to roles flagged as able to issue access links. */
const requireAccessLinkCreator = (req, res, next) => {
  if (req.user?.isSuperAdmin || req.user?.role?.canCreateAccessLinks) return next();
  return res.status(403).json({ success: false, message: 'Your role cannot create form access links' });
};

/**
 * Authenticates an applicant holding a temporary access link.
 * The link is re-checked on every request so blocking takes effect immediately.
 */
const applicantAuth = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret());
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    if (decoded.section !== APPLICANT_SECTION) {
      return res.status(401).json({ success: false, message: 'Token is not valid for the application form' });
    }

    if (!connectionReady(res)) return;

    const link = await AccessLink.findById(decoded.accessLinkId);
    if (!link) {
      return res.status(401).json({ success: false, message: 'This form link no longer exists' });
    }
    if (!link.isUsable()) {
      return res.status(403).json({
        success: false,
        message: link.status === 'blocked'
          ? 'This form link has been closed by your unit admin'
          : 'This form link is no longer active'
      });
    }

    req.accessLink = link;
    next();
  } catch (error) {
    console.error('Members applicant auth error:', error);
    res.status(500).json({ success: false, message: 'Server error in authentication' });
  }
};

/** Guard for routes that must fail fast when the members DB is unreachable. */
const requireMembersDb = (req, res, next) => {
  if (!connectionReady(res)) return;
  next();
};

module.exports = {
  protect,
  authorizeRoles,
  requireSuperAdmin,
  requireAccessLinkCreator,
  applicantAuth,
  requireMembersDb,
  signAdminToken,
  signApplicantToken,
  envSuperAdminAccount,
  SECTION,
  APPLICANT_SECTION,
  ENV_SUPER_ADMIN_ID
};
