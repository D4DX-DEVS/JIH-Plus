const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    required: true,
    enum: ['admin', 'district', 'area', 'unit']
  },
  recipients: {
    type: {
      district: {
        districtId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'District'
        },
        districtName: String
      },
      areas: [{
        areaId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Area'
        },
        areaName: String
      }],
      units: [{
        unitId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Unit'
        },
        unitName: String,
        areaId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Area'
        },
        areaName: String
      }]
    },
    required: true
  }
}, {
  timestamps: true
});

// 🔍 Helpful indexes for faster queries
notificationSchema.index({ sender: 1, createdAt: -1 });
notificationSchema.index({ 'recipients.areas.areaId': 1 });
notificationSchema.index({ 'recipients.units.unitId': 1 });
notificationSchema.index({ 'recipients.district.districtId': 1 });

module.exports = mongoose.model('Notification', notificationSchema);
