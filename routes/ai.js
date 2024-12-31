const express = require('express');
const { Hercai } = require('../utils/ai.js');

const router = express.Router();
const herc = new Hercai();

router.get('/hericai', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await herc.question({ model: "v3", content: query });
        res.json({ answer: response.reply });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
