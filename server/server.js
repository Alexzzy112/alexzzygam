require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;

// Cache MongoDB connection for serverless
let cachedDb = null;
async function connectDB() {
  if (cachedDb) return cachedDb;
  try {
    cachedDb = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ MongoDB connected');
    return cachedDb;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return null;
  }
}

// Ensure DB is connected before handling API requests
app.use('/api', async (req, res, next) => {
  if (process.env.VERCEL && !cachedDb) {
    try {
      await connectDB();
    } catch (e) {
      console.error('DB connect failed:', e.message);
    }
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/player', require('./routes/player'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  });
}

module.exports = app;
