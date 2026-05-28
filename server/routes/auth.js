const express = require('express');
const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await Player.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const player = await Player.create({ username, email, password });
    res.status(201).json({
      _id: player._id,
      username: player.username,
      email: player.email,
      coins: player.coins,
      currentStage: player.currentStage,
      unlockedStages: player.unlockedStages,
      selectedCar: player.selectedCar,
      unlockedCars: player.unlockedCars,
      garageUpgrades: player.garageUpgrades,
      token: generateToken(player._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const player = await Player.findOne({ email });
    if (!player || !(await player.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      _id: player._id,
      username: player.username,
      email: player.email,
      coins: player.coins,
      currentStage: player.currentStage,
      unlockedStages: player.unlockedStages,
      selectedCar: player.selectedCar,
      unlockedCars: player.unlockedCars,
      garageUpgrades: player.garageUpgrades,
      token: generateToken(player._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guest login
router.post('/guest', async (req, res) => {
  const guestName = 'Guest_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  res.json({
    _id: 'guest_' + Date.now(),
    username: guestName,
    isGuest: true,
    coins: 500,
    currentStage: 1,
    unlockedStages: [1],
    selectedCar: 'speedster',
    unlockedCars: ['speedster'],
    garageUpgrades: { speed: 1, handling: 1, nitro: 1, armor: 1 },
    token: null
  });
});

module.exports = router;
