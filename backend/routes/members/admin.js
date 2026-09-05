/**
 * Members Application — role registry, accounts, dashboard stats.
 * Mounted at /api/members/admin
 */

const express = require('express');
const router = express.Router();

const Role = require('../../models/members/Role');
const MemberAdmin = require('../../models/members/MemberAdmin');
const Application = require('../../models/members/Application');
const AccessLink = require('../../models/members/AccessLink');
const { protect, requireSuperAdmin } = require('../../middlewares/members/auth');
const { scopeQuery, resolveScopeChain } = require('../../utils/members/scopeFilter');

router.use(protect);

// ─── Roles ───────────────────────────────────────────────────────────────────
// Every authenticated account may read the registry (the form builder and the
// workflow editor both need the list); only the super admin may change it.

// Paginated only when `limit` is passed — the form builder, workflow editor and
// account role picker all need the complete registry.
router.get('/roles', async (req, res) => {
  try {
    const { search, page = 1, limit } = req.query;
    const query = {};
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      query.$or = [{ name: rx }, { key: rx }, { nameMl: rx }];
    }

    const cursor = Role.find(query).sort({ level: 1 });
    if (limit) {
      cursor.skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    }

    const [roles, total] = await Promise.all([
      cursor.lean(),
      Role.countDocuments(query)
    ]);

    res.json({
      success: true,
      roles,
      pagination: { total, page: Number(page), limit: limit ? Number(limit) : total }
    });
  } catch (error) {
    console.error('Members list roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to load roles' });
  }
});

router.post('/roles', requireSuperAdmin, async (req, res) => {
  try {
    const { key, name, nameMl, level, scopeType, canCreateAccessLinks } = req.body || {};
    if (!key || !name || level === undefined || !scopeType) {
      return res.status(400).json({ success: false, message: 'key, name, level and scopeType are required' });
    }
    if (await Role.exists({ key })) {
      return res.status(409).json({ success: false, message: `Role key "${key}" already exists` });
    }

    const role = await Role.create({
      key, name, nameMl: nameMl || '', level, scopeType,
      canCreateAccessLinks: Boolean(canCreateAccessLinks),
      isSystem: false
    });
    res.status(201).json({ success: true, role });
  } catch (error) {
    console.error('Members create role error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/roles/:id', requireSuperAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const { name, nameMl, level, scopeType, canCreateAccessLinks, isActive } = req.body || {};

    // The key is referenced by workflow stages and form fields, so it is immutable.
    if (name !== undefined) role.name = name;
    if (nameMl !== undefined) role.nameMl = nameMl;
    if (level !== undefined) role.level = level;
    if (scopeType !== undefined) role.scopeType = scopeType;
    if (canCreateAccessLinks !== undefined) role.canCreateAccessLinks = Boolean(canCreateAccessLinks);
    if (isActive !== undefined) {
      if (role.isSystem && !isActive) {
        return res.status(400).json({ success: false, message: 'A system role cannot be deactivated' });
      }
      role.isActive = Boolean(isActive);
    }

    await role.save();
    res.json({ success: true, role });
  } catch (error) {
    console.error('Members update role error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/roles/:id', requireSuperAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'System roles cannot be deleted' });
    }

    const inUse = await MemberAdmin.countDocuments({ role: role._id });
    if (inUse) {
      return res.status(409).json({
        success: false,
        message: `${inUse} account(s) still use this role. Reassign them first.`
      });
    }

    await role.deleteOne();
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Members delete role error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
});

// ─── Accounts ────────────────────────────────────────────────────────────────
// An account may manage accounts strictly below it in the hierarchy (a larger
// `level` number) and only inside its own scope. The super admin is unrestricted.

async function assertCanManage(actor, targetRole, targetScope) {
  if (actor.isSuperAdmin) return null;

  const actorRole = actor.role;
  if (!actorRole) return 'Your role is not set';
  if (targetRole.level <= actorRole.level) {
    return 'You can only manage accounts below your own role';
  }
  if (actorRole.scopeType !== 'state') {
    const key = actorRole.scopeType;
    if (!actor.scope?.[key] || targetScope?.[key] !== actor.scope[key]) {
      return `You can only manage accounts within your ${key}`;
    }
  }
  return null;
}

router.get('/accounts', async (req, res) => {
  try {
    const { roleKey, search, status, scopeName, page = 1, limit = 50 } = req.query;
    const query = { ...scopeQuery(req.user) };

    if (roleKey) {
      const role = await Role.findOne({ key: roleKey }).lean();
      query.role = role ? role._id : null;
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'rukn') query.isRukn = true;
    // Narrows to one posting regardless of which level it names.
    if (scopeName) {
      query.$or = [
        { 'scope.mekhala': scopeName }, { 'scope.district': scopeName },
        { 'scope.area': scopeName }, { 'scope.unit': scopeName }
      ];
    }
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      const clause = [{ name: rx }, { username: rx }, { contactNo: rx }];
      // $and keeps a scope filter from being overwritten by the search's $or.
      if (query.$or) { query.$and = [{ $or: query.$or }, { $or: clause }]; delete query.$or; }
      else query.$or = clause;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [accounts, total] = await Promise.all([
      MemberAdmin.find(query).populate('role').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      MemberAdmin.countDocuments(query)
    ]);

    res.json({
      success: true,
      accounts: accounts.map(a => a.toJSON()),
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('Members list accounts error:', error);
    res.status(500).json({ success: false, message: 'Failed to load accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const { username, password, name, contactNo, email, roleKey, scope, isRukn } = req.body || {};
    if (!username || !password || !name || !roleKey) {
      return res.status(400).json({ success: false, message: 'username, password, name and roleKey are required' });
    }

    const role = await Role.findOne({ key: roleKey, isActive: true });
    if (!role) return res.status(400).json({ success: false, message: `Unknown role "${roleKey}"` });

    // Fill in the parent chain so a unit account also carries its area/district/mekhala.
    const { scope: resolved, missing } = await resolveScopeChain(scope || {});
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Unknown location: ${missing.join(', ')}` });
    }
    if (role.scopeType !== 'state' && !resolved[role.scopeType]) {
      return res.status(400).json({
        success: false,
        message: `A ${role.name} account must be given a ${role.scopeType}`
      });
    }

    const denied = await assertCanManage(req.user, role, resolved);
    if (denied) return res.status(403).json({ success: false, message: denied });

    if (await MemberAdmin.exists({ username: String(username).trim().toLowerCase() })) {
      return res.status(409).json({ success: false, message: 'That username is already taken' });
    }

    const account = await MemberAdmin.create({
      username, password, name,
      contactNo: contactNo || '',
      email: email || '',
      role: role._id,
      scope: resolved,
      isRukn: Boolean(isRukn)
    });

    await account.populate('role');
    res.status(201).json({ success: true, account: account.toJSON() });
  } catch (error) {
    console.error('Members create account error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const account = await MemberAdmin.findById(req.params.id).populate('role');
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const denied = await assertCanManage(req.user, account.role, account.scope);
    if (denied) return res.status(403).json({ success: false, message: denied });

    const { name, contactNo, email, roleKey, scope, isRukn, isActive, password } = req.body || {};

    if (roleKey && roleKey !== account.role.key) {
      const role = await Role.findOne({ key: roleKey, isActive: true });
      if (!role) return res.status(400).json({ success: false, message: `Unknown role "${roleKey}"` });
      const deniedNew = await assertCanManage(req.user, role, scope || account.scope);
      if (deniedNew) return res.status(403).json({ success: false, message: deniedNew });
      account.role = role._id;
    }

    if (scope) {
      const { scope: resolved, missing } = await resolveScopeChain(scope);
      if (missing.length) {
        return res.status(400).json({ success: false, message: `Unknown location: ${missing.join(', ')}` });
      }
      account.scope = resolved;
    }

    if (name !== undefined) account.name = name;
    if (contactNo !== undefined) account.contactNo = contactNo;
    if (email !== undefined) account.email = email;
    if (isRukn !== undefined) account.isRukn = Boolean(isRukn);
    if (isActive !== undefined) account.isActive = Boolean(isActive);
    if (password) account.password = password;

    await account.save();
    await account.populate('role');
    res.json({ success: true, account: account.toJSON() });
  } catch (error) {
    console.error('Members update account error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const account = await MemberAdmin.findById(req.params.id).populate('role');
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const denied = await assertCanManage(req.user, account.role, account.scope);
    if (denied) return res.status(403).json({ success: false, message: denied });

    await account.deleteOne();
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Members delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const scoped = scopeQuery(req.user);

    const [byStatus, byStage, links, monthly] = await Promise.all([
      Application.aggregate([
        { $match: scoped },
        { $group: { _id: { formType: '$formType', status: '$status' }, count: { $sum: 1 } } }
      ]),
      Application.aggregate([
        { $match: scoped },
        { $group: { _id: { formType: '$formType', stage: '$currentStageKey' }, count: { $sum: 1 } } }
      ]),
      AccessLink.aggregate([
        { $match: scoped },
        { $group: { _id: { formType: '$formType', status: '$status' }, count: { $sum: 1 } } }
      ]),
      Application.aggregate([
        { $match: { ...scoped, submittedAt: { $ne: null } } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: '%Y-%m', date: '$submittedAt' } },
              formType: '$formType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.month': 1 } }
      ])
    ]);

    res.json({ success: true, stats: { byStatus, byStage, links, monthly } });
  } catch (error) {
    console.error('Members stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
});

module.exports = router;
