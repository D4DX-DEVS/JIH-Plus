const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true },
    uniqueCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    randomCode: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AreaMaster', areaSchema);
