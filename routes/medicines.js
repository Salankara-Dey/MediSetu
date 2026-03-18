const express  = require('express');
const Medicine = require('../models/Medicine');
const Alert    = require('../models/Alert');
const protect  = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/medicines
router.get('/', async (req, res) => {
  try {
    const { category, storage, facility, search, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (storage)  filter.storage  = storage;
    if (facility) filter.facility = new RegExp(facility, 'i');
    if (search)   filter.name     = new RegExp(search, 'i');

    const skip  = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Medicine.find(filter).sort({ expiry: 1 }).skip(skip).limit(Number(limit)).lean(),
      Medicine.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/medicines/:id
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).lean();
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/medicines
router.post('/', requireRole('pharmacy', 'admin'), async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: medicine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/medicines/bulk
router.post('/bulk', requireRole('pharmacy', 'admin'), async (req, res) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'medicines array is required' });
    }
    const docs = medicines.map(m => ({ ...m, createdBy: req.user._id }));
    const result = await Medicine.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, inserted: result.length, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/medicines/scan  (AI label scan placeholder)
router.post('/scan', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, message: 'imageBase64 required' });
    // Placeholder — integrate with Google Vision / Claude Vision here
    res.json({
      success: true,
      message: 'Scan received. AI extraction not yet configured.',
      extracted: {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/medicines/:id
router.put('/:id', requireRole('pharmacy', 'admin'), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/medicines/:id
router.delete('/:id', requireRole('pharmacy', 'admin'), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/medicines/:id/iot  — IoT temperature update
router.patch('/:id/iot', async (req, res) => {
  try {
    const { tempC } = req.body;
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    medicine.lastTempC  = tempC;
    medicine.lastTempAt = new Date();

    // Determine status based on storage type
    if (medicine.storage === 'refrigerated') {
      medicine.tempStatus = tempC >= 2 && tempC <= 8 ? 'normal' : tempC < 0 || tempC > 12 ? 'critical' : 'warning';
    } else if (medicine.storage === 'frozen') {
      medicine.tempStatus = tempC <= -15 ? 'normal' : tempC > -10 ? 'critical' : 'warning';
    } else {
      medicine.tempStatus = tempC >= 15 && tempC <= 25 ? 'normal' : tempC > 30 ? 'critical' : 'warning';
    }

    await medicine.save();

    // Create alert if not normal
    if (medicine.tempStatus !== 'normal') {
      await Alert.create({
        type: 'temperature',
        severity: medicine.tempStatus,
        message: `Temperature alert for ${medicine.name}: ${tempC}°C (${medicine.tempStatus})`,
        medicine: medicine._id,
      });
    }

    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
