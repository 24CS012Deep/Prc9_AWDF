const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

// Task Routes with in-memory caching
app.use('/api/tasks', taskRoutes);

// Server health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    caching: 'node-cache active',
    timestamp: new Date().toISOString()
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found.`
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager_cache_db';

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully for Practical 9.');
      app.listen(PORT, () => {
        console.log(`Server running with in-memory cache at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection failure:', err.message);
      app.listen(PORT, () => {
        console.log(`Server running in standalone mode at http://localhost:${PORT}`);
      });
    });
}

module.exports = app;
