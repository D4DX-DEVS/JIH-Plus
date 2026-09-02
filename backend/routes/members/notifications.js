/**
 * Members Application — in-app notifications.
 * Mounted at /api/members/notifications
 *
 * A notification is either addressed to one account or to whoever holds a role
 * within a scope, so the query below matches both shapes.
 */

const express = require('express');
const router = express.Router();

const Notification = require('../../models/members/Notification');
const { protect } = require('../../middlewares/members/auth');

router.use(protect);

/** Everything addressed to this caller, by account or by role-and-scope. */
function inboxQuery(user) {
  const roleKey = user?.role?.key;
  const scopeType = user?.role?.scopeType;

  const byRole = { recipientRoleKey: roleKey };
  if (scopeType && scopeType !== 'state') {
    const value = user?.scope?.[scopeType];
    if (!value) return { _id: null };
    byRole[`scope.${scopeType}`] = value;
  }

  const clauses = [byRole];
  if (!user.isSuperAdmin && user._id) clauses.push({ recipientAdminId: user._id });

  return { $or: clauses };
}

/** The query form of isReadBy() negated, so unread can be filtered in Mongo. */
function unreadQuery(user) {
  const clause = { isRead: { $ne: true } };
  if (!user.isSuperAdmin && user._id) clause.readBy = { $ne: user._id };
  return clause;
}

/** True when this caller has read the notification. */
function isReadBy(notification, user) {
  if (notification.isRead) return true;
  if (user.isSuperAdmin || !user._id) return false;
  return (notification.readBy || []).some(id => String(id) === String(user._id));
}

/** GET / */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Unread has to narrow the query itself — filtering the page after slicing
    // would leave short pages and a total that counts read rows too.
    const query = unreadOnly
      ? { $and: [inboxQuery(req.user), unreadQuery(req.user)] }
      : inboxQuery(req.user);

    const [rows, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments(query)
    ]);

    const notifications = rows.map(n => ({ ...n, read: isReadBy(n, req.user) }));

    res.json({
      success: true,
      notifications,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('Members list notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

/** GET /unread-count */
router.get('/unread-count', async (req, res) => {
  try {
    const rows = await Notification.find(inboxQuery(req.user)).select('isRead readBy').lean();
    res.json({ success: true, count: rows.filter(n => !isReadBy(n, req.user)).length });
  } catch (error) {
    console.error('Members unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
});

/** POST /:id/read */
router.post('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

    if (req.user.isSuperAdmin || !req.user._id) {
      notification.isRead = true;
    } else if (!(notification.readBy || []).some(id => String(id) === String(req.user._id))) {
      notification.readBy.push(req.user._id);
      if (notification.recipientAdminId && String(notification.recipientAdminId) === String(req.user._id)) {
        notification.isRead = true;
      }
    }

    await notification.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Members mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

/** POST /read-all */
router.post('/read-all', async (req, res) => {
  try {
    const query = inboxQuery(req.user);
    if (req.user.isSuperAdmin || !req.user._id) {
      await Notification.updateMany(query, { $set: { isRead: true } });
    } else {
      await Notification.updateMany(query, { $addToSet: { readBy: req.user._id } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Members read-all error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

module.exports = router;
