const express = require('express');
const { AnimeNews } = require('../utils/anime.js');

const router = express.Router();

router.get('/animenews', async (req, res) => {
    try {
        const response = await AnimeNews();
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
