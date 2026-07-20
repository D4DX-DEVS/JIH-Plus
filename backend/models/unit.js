const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaMaster', required: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true },
    uniqueCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UnitMaster', unitSchema);
