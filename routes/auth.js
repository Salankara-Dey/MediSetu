const express = require('express');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const User    = require('../models/User');
const protect = require('../middleware/auth');

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

function userResponse(user) {
  return {
    _id:       user._id,
    email:     user.email,
    role:      user.role,
    isVerified:user.isVerified,
    patient:   user.patient,
    pharmacy:  user.pharmacy,
    admin:     user.admin,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, ...profile } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'email, password and role are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const userData = { email, password, role };
    if (role === 'patient')  userData.patient  = profile.patient  || {};
    if (role === 'pharmacy') userData.pharmacy = profile.pharmacy || {};
    if (role === 'admin')    userData.admin    = profile.admin    || {};

    const user = await User.create(userData);
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: `No ${role} account found for this email` });
    }
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.isSuspended) return res.status(403).json({ success: false, message: 'Account suspended' });

    const token = signToken(user._id);
    res.json({ success: true, token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: userResponse(req.user) });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // TODO: send email with reset link
    // For now just return success
    res.json({ success: true, message: 'Password reset link sent to email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
