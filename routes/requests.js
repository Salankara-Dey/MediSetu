const express  = require('express');
const Request  = require('../models/Request');
const Medicine = require('../models/Medicine');
const protect  = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/requests
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // Non-admins only see their own requests
    if (req.user.role !== 'admin') filter.requestedBy = req.user._id;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Request.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('requestedBy', 'email pharmacy patient')
        .lean(),
      Request.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/requests
router.post('/', async (req, res) => {
  try {
    const { medicine: medicineId, quantity, toFacility, notes } = req.body;
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    if (medicine.units < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    const request = await Request.create({
      medicine: medicineId,
      medicineName: medicine.name,
      quantity,
      requestedBy: req.user._id,
      fromFacility: medicine.facility,
      toFacility,
      notes,
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/requests/:id/status
router.patch('/:id/status', requireRole('admin', 'pharmacy'), async (req, res) => {
  try {
    const { status, rejectReason } = req.body;
    const allowed = ['approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be updated' });
    }

    request.status = status;
    if (rejectReason) request.rejectReason = rejectReason;

    // Deduct stock on approval
    if (status === 'approved') {
      await Medicine.findByIdAndUpdate(request.medicine, { $inc: { units: -request.quantity } });
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/requests/:id  — cancel own request
router.delete('/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (String(request.requestedBy) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled' });
    }
    request.status = 'cancelled';
    await request.save();
    res.json({ success: true, message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
