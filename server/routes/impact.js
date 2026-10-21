const express = require('express');
const { buildImpactReport } = require('../utils/impactReport');

const router = express.Router();

// GET /api/impact
// Public aggregate statistics only. No names, emails, phone numbers or IDs.
router.get('/', async (req, res) => {
  try {
    const report = await buildImpactReport();

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      summary: report.summary,
      generatedAt: report.generatedAt,
    });
  } catch (error) {
    console.error('Public impact report error:', error);
    res.status(500).json({
      message: 'Could not load FoodBridge impact statistics.',
    });
  }
});

module.exports = router;