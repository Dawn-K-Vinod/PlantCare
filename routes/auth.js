const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('../db');

router.post('/register', async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await db.collection('users').findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      username,
      password: hashed,
      created_on: new Date()
    });

    const token = jwt.sign({ userId: result.insertedId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    const user = await db.collection('users').findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid username or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid username or password.' });

    const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;