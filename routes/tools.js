const express = require('express');
const { githubstalk, obfus, ttp } = require('../utils/tools.js');

const router = express.Router();

router.get('/obfuscate', async (req, res) => {
	try {
		const { code } = req.query;
		if (!code) {
			return res
				.status(400)
				.json({ error: 'Code parameter is required' });
		}
		const obfuscatedCode = await obfus(code);
		res.json(obfuscatedCode);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

router.get('/ttp', async (req, res) => {
	try {
		const { text } = req.query;
		if (!text) {
			return res
				.status(400)
				.json({ error: 'Text parameter is required' });
		}
		const data = await ttp(text);
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

router.get('/gitstalk', async (req, res) => {
	try {
		const { username } = req.query;
		if (!username) {
			return res
				.status(400)
				.json({ error: 'Username parameter is required' });
		}
		const data = await githubstalk(username);
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
