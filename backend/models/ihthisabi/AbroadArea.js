const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const abroadAreaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Area title is required'],
    trim: true,
    maxlength: [100, 'Area title cannot exceed 100 characters']
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AbroadCountry',
    required: [true, 'Country is required']
  }
}, {
  timestamps: true
});

abroadAreaSchema.index({ countryId: 1, title: 1 }, { unique: true });

module.exports = ihthisabiConnection.model('AbroadArea', abroadAreaSchema);
