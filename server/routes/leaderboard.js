const express = require('express');
const Score = require('../models/Score');
const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const router = express.Router();

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.player = await Player.findById(decoded.id).select('-password');
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Submit score
router.post('/submit', protect, async (req, res) => {
  try {
    const { stage, time, position, coinsEarned } = req.body;
    const score = await Score.create({
      playerId: req.player._id,
      username: req.player.username,
      stage, time, position, coinsEarned
    });
    res.status(201).json(score);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get leaderboard for a stage
router.get('/stage/:stage', async (req, res) => {
  try {
    const scores = await Score.find({ stage: req.params.stage, position: 1 })
      .sort({ time: 1 }).limit(10)
      .select('username time date');
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get global leaderboard (wins)
router.get('/global', async (req, res) => {
  try {
    const players = await Player.find()
      .sort({ wins: -1, coins: -1 }).limit(10)
      .select('username wins totalRaces coins');
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
