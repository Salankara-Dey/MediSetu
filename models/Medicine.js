const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  category:   { type: String, required: true },
  units:      { type: Number, required: true, min: 0 },
  expiry:     { type: Date, required: true },
  storage:    { type: String, enum: ['room', 'refrigerated', 'frozen'], default: 'room' },
  facility:   { type: String, required: true },
  batch:      { type: String },
  notes:      { type: String },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // IoT temperature tracking
  tempStatus: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
  lastTempC:  { type: Number },
  lastTempAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);
