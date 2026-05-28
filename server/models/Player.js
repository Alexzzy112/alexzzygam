const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const playerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  coins: { type: Number, default: 500 },
  totalRaces: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  currentStage: { type: Number, default: 1 },
  unlockedStages: { type: [Number], default: [1] },
  selectedCar: { type: String, default: 'speedster' },
  unlockedCars: { type: [String], default: ['speedster'] },
  garageUpgrades: {
    speed: { type: Number, default: 1 },
    handling: { type: Number, default: 1 },
    nitro: { type: Number, default: 1 },
    armor: { type: Number, default: 1 }
  },
  bestTimes: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now }
});

playerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

playerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Player', playerSchema);
