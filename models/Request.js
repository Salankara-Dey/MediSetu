const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  requestedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromFacility: { type: String, required: true },
  toFacility:   { type: String, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  rejectReason: { type: String },
  notes:        { type: String },
}, { timestamps: true });

module.exports = mongoose.models.Request || mongoose.model('Request', requestSchema);
