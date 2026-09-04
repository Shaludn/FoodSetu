const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createListing,
    getAllListings,
    getMyListings
} = require('../controllers/listingController');

router.post('/', authMiddleware, createListing);
router.get('/all', authMiddleware, getAllListings);
router.get('/mine', authMiddleware, getMyListings);

module.exports = router;