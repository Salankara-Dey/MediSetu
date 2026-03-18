const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:       { type: String, enum: ['expiry', 'temperature', 'stock', 'system'], required: true },
  message:    { type: String, required: true },
  medicine:   { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead:     { type: Boolean, default: false },
  severity:   { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
}, { timestamps: true });

module.exports = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
