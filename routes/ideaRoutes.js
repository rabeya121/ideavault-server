const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const verifyToken = require('../middleware/verifyToken');

// Get all ideas (with search & filter)
router.get('/', async (req, res) => {
  try {
    const { search, category, date } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }
    if (date) {
      const now = new Date();
      let startDate;
      if (date === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (date === "week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (date === "month") {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }
      if (startDate) query.createdAt = { $gte: startDate };
    }

    const ideas = await Idea.find(query).sort({ createdAt: -1 });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trending ideas (6 ideas)
router.get('/trending', async (req, res) => {
  try {
    const ideas = await Idea.find().sort({ views: -1 }).limit(6);
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single idea
router.get('/:id', async (req, res) => {
  try {
    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create idea (private)
router.post('/', verifyToken, async (req, res) => {
  try {
    const idea = await Idea.create(req.body);
    res.status(201).json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update idea (private)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const idea = await Idea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete idea (private)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Idea.findByIdAndDelete(req.params.id);
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my ideas
router.get('/user/:email', verifyToken, async (req, res) => {
  try {
    const ideas = await Idea.find({ authorEmail: req.params.email });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;