const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const abroadUnitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Unit title is required'],
    trim: true,
    maxlength: [100, 'Unit title cannot exceed 100 characters']
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadArea',
    required: [true, 'Area is required']
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadCountry',
    required: [true, 'Country is required']
  }
}, {
  timestamps: true
});

abroadUnitSchema.index({ areaId: 1, title: 1 }, { unique: true });

module.exports = ihthisabiConnection.model('AbroadUnit', abroadUnitSchema);
