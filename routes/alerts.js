const express = require('express');
const Alert   = require('../models/Alert');
const protect = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { isRead, type, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    // Non-admins only see their own alerts
    if (req.user.role !== 'admin') filter.targetUser = req.user._id;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('medicine', 'name expiry')
        .lean(),
      Alert.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/alerts/read-all
router.patch('/read-all', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { targetUser: req.user._id };
    await Alert.updateMany({ ...filter, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
