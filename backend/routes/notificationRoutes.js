const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Notification = require('../models/notification');
const unifiedAuth = require('../middlewares/unifiedAuth');
const axios = require('axios');
// Helper function to fetch district data from external API
const fetchDistrictData = async () => {
    try {
      // Use environment variable with fallback to hardcoded endpoint
      const apiEndpoint = process.env.DISTRICT_API_ENDPOINT || 'https://cenloginbackend.d4dx.co/api/districts';
      
      
      const response = await axios.get(apiEndpoint);
      
      
      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from districts API');
      }
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching district data:', error);
      throw error;
    }
  };
  
  // Helper function to fetch area data from external API
  const fetchAreaData = async (districtId) => {
    try {
      // Use environment variable with fallback to hardcoded endpoint
      const baseEndpoint = process.env.AREA_API_ENDPOINT || 'https://cenloginbackend.d4dx.co/api/areas/district/{districtId}';
      
      // Replace {districtId} placeholder in API endpoint if it exists
      const finalEndpoint = baseEndpoint.includes('{districtId}') 
        ? baseEndpoint.replace('{districtId}', encodeURIComponent(districtId))
        : `${baseEndpoint}/${encodeURIComponent(districtId)}`;
      
     
      
      const response = await axios.get(finalEndpoint);
      
      
      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from areas API');
      }
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching area data:', error);
      throw error;
    }
  };
  
  // Helper function to fetch unit data from external API
  const fetchUnitData = async (areaId) => {
    try {
      // Use environment variable with fallback to hardcoded endpoint
      const baseEndpoint = process.env.UNIT_API_ENDPOINT || 'https://cenloginbackend.d4dx.co/api/units/area/{areaId}';
      
      // Replace {areaId} placeholder in API endpoint if it exists
      const finalEndpoint = baseEndpoint.includes('{areaId}') 
        ? baseEndpoint.replace('{areaId}', encodeURIComponent(areaId))
        : `${baseEndpoint}/${encodeURIComponent(areaId)}`;
      
      
      
      const response = await axios.get(finalEndpoint);
      
      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from units API');
      }
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching unit data:', error);
      throw error;
    }
  };

// Area/unit JWTs carry `areaName`/`unitName` (see /api/user/login/unified) —
// never the bare `area`/`unit` keys this file originally assumed. Resolve both
// spellings so senders are named correctly and can find their own notifications.
const identityOf = (user) => ({
  district: user.district || user.districtName || '',
  area: user.area || user.areaName || '',
  unit: user.unit || user.unitName || ''
});

// The sender's own account id, as stored on notification.sender at create time.
const senderObjectId = (user) => {
  const raw = user.id || user._id || user.userId;
  return raw && mongoose.Types.ObjectId.isValid(raw)
    ? new mongoose.Types.ObjectId(raw)
    : null;
};

// Create notification - Simple Implementation
router.post('/create', unifiedAuth, async (req, res) => {
  try {
    const { title, description, recipients } = req.body;
    
    // Validate required fields
    if (!title || !description || !recipients) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, and recipients are required' 
      });
    }

    // Only admin, superadmin, district and area admins can create notifications
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'district' && req.user.role !== 'area') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators, district and area administrators can create notifications' 
      });
    }

    // Get sender information from JWT — must key off the sender's own role,
    // since an area/unit admin's token also carries their parent district's
    // (and area's) name, which would otherwise win a plain truthiness check.
    const identity = identityOf(req.user);
    let senderName = 'Admin';
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      senderName = req.user.role === 'superadmin' ? 'Super Admin' : 'Admin';
    } else if (req.user.role === 'district') {
      senderName = identity.district || 'Admin';
    } else if (req.user.role === 'area') {
      senderName = identity.area || 'Admin';
    } else if (req.user.role === 'unit') {
      senderName = identity.unit || 'Admin';
    }
    const senderRole = req.user.role;
    
    // Get actual user ID from JWT token (prefer id, _id, or userId)
    let senderId;
    if (req.user.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
      senderId = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      senderId = new mongoose.Types.ObjectId(req.user._id);
    } else if (req.user.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
      senderId = new mongoose.Types.ObjectId(req.user.userId);
    } else {
      // For admin users who don't have a User record, generate a consistent ObjectId
      // based on email to maintain referential consistency
      // Note: This ObjectId won't reference an actual User document, but satisfies schema requirement
      if (req.user.email) {
        // Generate a consistent ObjectId from email hash (first 24 hex chars)
        const hash = crypto.createHash('md5').update(req.user.email).digest('hex');
        const objectIdString = hash.substring(0, 24);
        senderId = mongoose.Types.ObjectId.isValid(objectIdString) 
          ? new mongoose.Types.ObjectId(objectIdString)
          : new mongoose.Types.ObjectId();
      } else {
        // Fallback: generate new ObjectId (original behavior for edge cases)
        senderId = new mongoose.Types.ObjectId();
      }
    }

    // Create notification
    const notification = new Notification({
      title,
      description,
      sender: senderId,
      senderName,
      senderRole,
      recipients
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification: notification
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create notification' 
    });
  }
});

// Get notifications for current user - Simple Implementation
router.get('/my-notifications', unifiedAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const { page = 1, limit = 50, filter } = req.query;
    const skip = (page - 1) * limit;

    // recipientConditions: notifications addressed to this user (received)
    // senderCondition: notifications authored by this user (sent)
    let recipientConditions = [];
    let senderCondition = null;

    const identity = identityOf(req.user);
    const ownId = senderObjectId(req.user);

    // "Sent by me" = same role AND (same account id OR same display name).
    // The id branch also rescues notifications saved before the name lookup
    // was fixed, whose senderName fell back to 'Admin'.
    const sentByMe = (role, name) => {
      const clauses = [];
      if (ownId) clauses.push({ sender: ownId });
      if (name) clauses.push({ senderName: name });
      if (clauses.length === 0) return null;
      return { senderRole: role, $or: clauses };
    };

    if (userRole === 'district') {
      const districtConditions = [];
      if (req.user.districtId && mongoose.Types.ObjectId.isValid(req.user.districtId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(req.user.districtId) });
      }
      if (identity.district) {
        districtConditions.push({ 'recipients.district.districtName': identity.district });
      }
      recipientConditions = districtConditions;
      senderCondition = sentByMe('district', identity.district);
    } else if (userRole === 'area') {
      // Area admins see notifications sent to their area, to their parent district, OR sent by them
      const areaConditions = [];
      const districtConditions = [];

      // If we have areaId (ObjectId), use it
      if (req.user.areaId && mongoose.Types.ObjectId.isValid(req.user.areaId)) {
        areaConditions.push({ 'recipients.areas.areaId': new mongoose.Types.ObjectId(req.user.areaId) });
      }
      // Always check by name (string)
      if (identity.area) {
        areaConditions.push({ 'recipients.areas.areaName': identity.area });
      }

      // District matching (for notifications sent to the district that includes this area)
      if (req.user.districtId && mongoose.Types.ObjectId.isValid(req.user.districtId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(req.user.districtId) });
      }
      if (identity.district) {
        districtConditions.push({ 'recipients.district.districtName': identity.district });
      }

      recipientConditions = [...areaConditions, ...districtConditions];
      senderCondition = sentByMe('area', identity.area);
    } else if (userRole === 'unit') {
      // Unit admins see notifications sent to their unit, their parent area, their parent district
      const unitConditions = [];
      const areaConditions = [];
      const districtConditions = [];

      // If we have unitId (ObjectId), use it
      if (req.user.unitId && mongoose.Types.ObjectId.isValid(req.user.unitId)) {
        unitConditions.push({ 'recipients.units.unitId': new mongoose.Types.ObjectId(req.user.unitId) });
      }
      // Always check by name (string)
      if (identity.unit) {
        unitConditions.push({ 'recipients.units.unitName': identity.unit });
      }

      // Area matching (for notifications sent to the area that includes this unit)
      if (req.user.areaId && mongoose.Types.ObjectId.isValid(req.user.areaId)) {
        areaConditions.push({ 'recipients.areas.areaId': new mongoose.Types.ObjectId(req.user.areaId) });
      }
      if (identity.area) {
        areaConditions.push({ 'recipients.areas.areaName': identity.area });
      }

      // District matching (for notifications sent to the district that includes this unit)
      if (req.user.districtId && mongoose.Types.ObjectId.isValid(req.user.districtId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(req.user.districtId) });
      }
      if (identity.district) {
        districtConditions.push({ 'recipients.district.districtName': identity.district });
      }

      recipientConditions = [...unitConditions, ...areaConditions, ...districtConditions];
      senderCondition = null; // unit admins cannot create notifications
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      // Admin and superadmin only ever see notifications they sent
      recipientConditions = [];
      senderCondition = {
        $or: [
          { 'senderRole': 'admin' },
          { 'senderRole': 'superadmin' },
          { 'senderName': 'Super Admin' },
          { 'senderName': 'Admin' }
        ]
      };
    }

    let query;
    if (filter === 'sent') {
      query = senderCondition || { _id: null };
    } else if (filter === 'received') {
      query = recipientConditions.length > 0 ? { $or: recipientConditions } : { _id: null };
    } else {
      // Backward-compatible combined view (received + sent together)
      const combined = [...recipientConditions];
      if (senderCondition) combined.push(senderCondition);
      query = combined.length > 0 ? { $or: combined } : { _id: null };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});


// Get all districts, areas, and units (for Super Admin)
router.get('/hierarchy/all', unifiedAuth, async (req, res) => {
  try {
    // Only allow admin and superadmin access
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators can access all hierarchy data' 
      });
    }

    console.log('Fetching all hierarchy data for super admin');

    try {
      // Fetch all districts
      const districts = await fetchDistrictData();
      
      // Fetch all areas and units for each district
      const hierarchyData = [];
      
      for (const district of districts) {
        const districtId = district._id || district.id;
        const districtName = district.title || district.name;
        
        try {
          // Fetch areas for this district
          const areas = await fetchAreaData(districtId);
          
          // For each area, fetch units
          const areasWithUnits = [];
          for (const area of areas) {
            const areaId = area._id || area.id;
            const areaName = area.title || area.name;
            
            try {
              // Fetch units for this area
              const units = await fetchUnitData(areaId);
              
              areasWithUnits.push({
                id: areaId,
                name: areaName,
                units: units.map(unit => ({
                  id: unit._id || unit.id,
                  name: unit.title || unit.name || unit.code
                }))
              });
            } catch (error) {
              console.error(`Error fetching units for area ${areaId}:`, error);
              areasWithUnits.push({
                id: areaId,
                name: areaName,
                units: []
              });
            }
          }
          
          hierarchyData.push({
            id: districtId,
            name: districtName,
            areas: areasWithUnits
          });
        } catch (error) {
          console.error(`Error fetching areas for district ${districtId}:`, error);
          hierarchyData.push({
            id: districtId,
            name: districtName,
            areas: []
          });
        }
      }

      res.json({
        success: true,
        message: 'Hierarchy data fetched successfully',
        data: hierarchyData
      });
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch hierarchy data' 
      });
    }
  } catch (error) {
    console.error('Error in hierarchy endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', unifiedAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // For now, just return success (simplified implementation)
    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read' 
    });
  }
});

// PUT /api/notifications/:id - Edit notification
router.put('/:id', unifiedAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, recipients } = req.body;

    if (!title || !description || !recipients) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and recipients are required'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user can edit this notification (only sender can edit)
    const userRole = req.user.role;
    const { district: userDistrict, area: userArea } = identityOf(req.user);
    const ownId = senderObjectId(req.user);
    const isOwnSend = ownId && notification.sender && notification.sender.equals(ownId);

    let canEdit = false;
    if (userRole === 'admin' || userRole === 'superadmin') {
      canEdit = true; // Admin and superadmin can edit any notification
    } else if (userRole === 'district' && (isOwnSend || notification.senderName === userDistrict)) {
      canEdit = true;
    } else if (userRole === 'area' && (isOwnSend || notification.senderName === userArea)) {
      canEdit = true;
    }

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit notifications you sent'
      });
    }

    notification.title = title;
    notification.description = description;
    notification.recipients = recipients;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification updated successfully',
      notification
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', unifiedAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // Check if user can delete this notification (only sender can delete)
    const userRole = req.user.role;
    const { district: userDistrict, area: userArea } = identityOf(req.user);
    const ownId = senderObjectId(req.user);
    const isOwnSend = ownId && notification.sender && notification.sender.equals(ownId);

    let canDelete = false;
    if (userRole === 'admin' || userRole === 'superadmin') {
      canDelete = true; // Admin and superadmin can delete any notification
    } else if (userRole === 'district' && (isOwnSend || notification.senderName === userDistrict)) {
      canDelete = true;
    } else if (userRole === 'area' && (isOwnSend || notification.senderName === userArea)) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete notifications you sent' 
      });
    }

    // Delete the notification
    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete notification' 
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', unifiedAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const { district: userDistrict, area: userArea, unit: userUnit } = identityOf(req.user);
    const userDistrictId = req.user.districtId;
    const userAreaId = req.user.areaId;
    const userUnitId = req.user.unitId;

    let query = {};

    // Find notifications where user should be a recipient
    if (userRole === 'district') {
      // Build query with both ID and name matching
      const districtConditions = [];
      
      // If we have districtId (ObjectId), use it
      if (userDistrictId && mongoose.Types.ObjectId.isValid(userDistrictId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(userDistrictId) });
      }
      // Always check by name (string)
      if (userDistrict) {
        districtConditions.push({ 'recipients.district.districtName': userDistrict });
      }
      
      query = districtConditions.length > 0 ? { $or: districtConditions } : { _id: null };
    } else if (userRole === 'area') {
      // Build query with both ID and name matching
      const areaConditions = [];
      const districtConditions = [];
      
      // Area matching
      if (userAreaId && mongoose.Types.ObjectId.isValid(userAreaId)) {
        areaConditions.push({ 'recipients.areas.areaId': new mongoose.Types.ObjectId(userAreaId) });
      }
      if (userArea) {
        areaConditions.push({ 'recipients.areas.areaName': userArea });
      }
      
      // District matching (for notifications sent to district that includes this area)
      if (userDistrictId && mongoose.Types.ObjectId.isValid(userDistrictId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(userDistrictId) });
      }
      if (userDistrict) {
        districtConditions.push({ 'recipients.district.districtName': userDistrict });
      }
      
      const areaCombined = [...areaConditions, ...districtConditions];
      query = areaCombined.length > 0 ? { $or: areaCombined } : { _id: null };
    } else if (userRole === 'unit') {
      // Build query with both ID and name matching
      const unitConditions = [];
      const areaConditions = [];
      const districtConditions = [];
      
      // Unit matching
      if (userUnitId && mongoose.Types.ObjectId.isValid(userUnitId)) {
        unitConditions.push({ 'recipients.units.unitId': new mongoose.Types.ObjectId(userUnitId) });
      }
      if (userUnit) {
        unitConditions.push({ 'recipients.units.unitName': userUnit });
      }
      
      // Area matching (for notifications sent to area that includes this unit)
      if (userAreaId && mongoose.Types.ObjectId.isValid(userAreaId)) {
        areaConditions.push({ 'recipients.areas.areaId': new mongoose.Types.ObjectId(userAreaId) });
      }
      if (userArea) {
        areaConditions.push({ 'recipients.areas.areaName': userArea });
      }
      
      // District matching (for notifications sent to district that includes this unit)
      if (userDistrictId && mongoose.Types.ObjectId.isValid(userDistrictId)) {
        districtConditions.push({ 'recipients.district.districtId': new mongoose.Types.ObjectId(userDistrictId) });
      }
      if (userDistrict) {
        districtConditions.push({ 'recipients.district.districtName': userDistrict });
      }
      
      query = {
        $or: [
          ...unitConditions,
          ...areaConditions,
          ...districtConditions
        ]
      };
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      // Admin and superadmin don't receive notifications, always return 0
      return res.json({
        success: true,
        count: 0
      });
    }

    // Count notifications that match the query
    const count = await Notification.countDocuments(query);

    res.json({
      success: true,
      count: count
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unread count' 
    });
  }
});

// Get areas and units for district (for recipient selection) - REAL API CALLS
router.get('/hierarchy/:districtId', unifiedAuth, async (req, res) => {
  try {
    const { districtId } = req.params;
    
    // Simple check: only district admins can access this
    if (req.user.role !== 'district') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only district admins can access this' 
      });
    }

    console.log(`Fetching areas and units for districtId: ${districtId}`);

    // Fetch real areas for this district
    let areas;
    try {
      areas = await fetchAreaData(districtId);
      console.log('Fetched areas:', areas);
    } catch (error) {
      console.error('Error fetching areas:', error);
      // If API fails, return empty array
      areas = [];
    }

    // Fetch units for each area
    const areasWithUnits = [];
    for (const area of areas) {
      try {
        const units = await fetchUnitData(area._id || area.id);
        
        areasWithUnits.push({
          id: area._id || area.id,
          name: area.title || area.name,
          units: units.map(unit => ({
            id: unit._id || unit.id,
            name: unit.title || unit.name
          }))
        });
      } catch (unitError) {
        console.error(`Error fetching units for area ${area._id}:`, unitError);
        // Add area without units if unit fetch fails
        areasWithUnits.push({
          id: area._id || area.id,
          name: area.title || area.name,
          units: []
        });
      }
    }

    console.log('Final areas with units:', areasWithUnits);

    res.json({
      success: true,
      data: areasWithUnits
    });

  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch hierarchy data' 
    });
  }
});

// Get units for area (for area admin recipient selection) - REAL API CALLS
router.get('/area-hierarchy/:areaId', unifiedAuth, async (req, res) => {
  try {
    const { areaId } = req.params;
    
    // Simple check: only area admins can access this
    if (req.user.role !== 'area') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only area admins can access this' 
      });
    }

    console.log(`Fetching units for areaId: ${areaId}`);

    // Fetch real units for this area
    let units;
    try {
      units = await fetchUnitData(areaId);
      console.log('Fetched units:', units);
    } catch (error) {
      console.error('Error fetching units:', error);
      units = [];
    }

    // Format units data
    const formattedUnits = units.map(unit => ({
      id: unit._id || unit.id,
      name: unit.title || unit.name
    }));

    console.log('Final units:', formattedUnits);

    res.json({
      success: true,
      data: formattedUnits
    });

  } catch (error) {
    console.error('Error fetching area hierarchy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch area hierarchy data' 
    });
  }
});

module.exports = router;
