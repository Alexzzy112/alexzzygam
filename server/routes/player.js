const express = require('express');
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
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get player profile
router.get('/profile', protect, async (req, res) => {
  res.json(req.player);
});

// Update progress after race
router.put('/progress', protect, async (req, res) => {
  try {
    const { stage, coinsEarned, position, time, unlockedStage } = req.body;
    const player = req.player;

    player.coins += coinsEarned || 0;
    player.totalRaces += 1;
    if (position === 1) player.wins += 1;

    if (unlockedStage && !player.unlockedStages.includes(unlockedStage)) {
      player.unlockedStages.push(unlockedStage);
    }
    if (stage > player.currentStage) player.currentStage = stage;

    const key = `stage_${stage}`;
    const best = player.bestTimes.get(key);
    if (!best || time < best) player.bestTimes.set(key, time);

    await player.save();
    res.json({ coins: player.coins, unlockedStages: player.unlockedStages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Buy car
router.put('/buy-car', protect, async (req, res) => {
  try {
    const { carId, price } = req.body;
    const player = req.player;
    if (player.coins < price) return res.status(400).json({ message: 'Not enough coins' });
    if (player.unlockedCars.includes(carId)) return res.status(400).json({ message: 'Already owned' });
    player.coins -= price;
    player.unlockedCars.push(carId);
    await player.save();
    res.json({ coins: player.coins, unlockedCars: player.unlockedCars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Select car
router.put('/select-car', protect, async (req, res) => {
  try {
    const { carId } = req.body;
    const player = req.player;
    if (!player.unlockedCars.includes(carId)) return res.status(400).json({ message: 'Car not unlocked' });
    player.selectedCar = carId;
    await player.save();
    res.json({ selectedCar: player.selectedCar });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upgrade garage
router.put('/upgrade', protect, async (req, res) => {
  try {
    const { stat, cost } = req.body;
    const player = req.player;
    const validStats = ['speed', 'handling', 'nitro', 'armor'];
    if (!validStats.includes(stat)) return res.status(400).json({ message: 'Invalid stat' });
    if (player.coins < cost) return res.status(400).json({ message: 'Not enough coins' });
    if (player.garageUpgrades[stat] >= 10) return res.status(400).json({ message: 'Max level reached' });
    player.coins -= cost;
    player.garageUpgrades[stat] += 1;
    player.markModified('garageUpgrades');
    await player.save();
    res.json({ coins: player.coins, garageUpgrades: player.garageUpgrades });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
