const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  username: { type: String, required: true },
  stage: { type: Number, required: true },
  time: { type: Number, required: true },
  position: { type: Number, required: true },
  coinsEarned: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

scoreSchema.index({ stage: 1, time: 1 });

module.exports = mongoose.model('Score', scoreSchema);
