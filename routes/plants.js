const express = require('express');
const router = express.Router();
const connectDB = require('../db');
const { ObjectId } = require('mongodb');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const plants = await db.collection('plants')
      .find({ user_id: new ObjectId(req.user.userId) })
      .sort({ added_on: -1 })
      .toArray();

    const today = new Date();
    const withStatus = plants.map(plant => {
      const lastWatered = plant.care_log
        .filter(l => l.type === 'watering')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      const daysSince = lastWatered
        ? Math.floor((today - new Date(lastWatered.date)) / (1000 * 60 * 60 * 24))
        : null;

      const interval = plant.schedule.watering_every_days;
      const progress = daysSince !== null ? Math.min((daysSince / interval) * 100, 100) : 100;
      const overdue = daysSince === null || daysSince >= interval;

      return { ...plant, overdue, days_since_watered: daysSince, water_progress: progress };
    });

    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = await connectDB();
    const plant = {
      user_id: new ObjectId(req.user.userId),
      name: req.body.name,
      species: req.body.species || '',
      location: req.body.location || '',
      photo_url: req.body.photo_url || '',
      tags: req.body.tags || [],
      schedule: {
        watering_every_days: parseInt(req.body.watering_every_days) || 3,
      },
      care_log: [],
      added_on: new Date(),
    };
    const result = await db.collection('plants').insertOne(plant);
    res.json({ ...plant, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const updates = {
      name: req.body.name,
      species: req.body.species || '',
      location: req.body.location || '',
      photo_url: req.body.photo_url || '',
      tags: req.body.tags || [],
      schedule: {
        watering_every_days: parseInt(req.body.watering_every_days) || 3,
      },
    };
    await db.collection('plants').updateOne(
      { _id: new ObjectId(req.params.id), user_id: new ObjectId(req.user.userId) },
      { $set: updates }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/log', async (req, res) => {
  try {
    const db = await connectDB();
    const entry = {
      type: req.body.type,
      date: new Date(),
      note: req.body.note || '',
    };
    await db.collection('plants').updateOne(
      { _id: new ObjectId(req.params.id), user_id: new ObjectId(req.user.userId) },
      { $push: { care_log: entry } }
    );
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const plant = await db.collection('plants').findOne({
      _id: new ObjectId(req.params.id),
      user_id: new ObjectId(req.user.userId)
    });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    plant.care_log.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    await db.collection('plants').deleteOne({
      _id: new ObjectId(req.params.id),
      user_id: new ObjectId(req.user.userId)
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;