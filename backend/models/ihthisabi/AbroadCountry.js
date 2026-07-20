const mongoose = require('mongoose');
const ihthisabiConnection = require('../../config/ihthisabiConnection');

const abroadCountrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Country title is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Country title cannot exceed 100 characters']
  }
}, {
  timestamps: true
});

module.exports = ihthisabiConnection.model('AbroadCountry', abroadCountrySchema);
