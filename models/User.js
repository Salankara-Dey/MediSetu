const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'pharmacy', 'patient'], required: true },
  isVerified: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },

  // Role-specific sub-docs
  patient: {
    fullName: String,
    phone: String,
  },
  pharmacy: {
    storeName: String,
    licenseNumber: String,
    address: String,
    phone: String,
  },
  admin: {
    name: String,
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
