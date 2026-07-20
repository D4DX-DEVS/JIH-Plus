const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    uniqueCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    sequentialNumber: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('District', districtSchema);
