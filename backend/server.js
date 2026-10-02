require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Health route
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus =
    ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ||
    'unknown';
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});
// CPU load test route - used only for Kubernetes HPA demonstration
app.get('/api/load-test', (req, res) => {
  const duration = Math.min(Number(req.query.duration) || 500, 5000);
  const endTime = Date.now() + duration;

  let result = 0;

  while (Date.now() < endTime) {
    for (let i = 0; i < 1000; i++) {
      result += Math.sqrt(i * Math.random());
    }
  }

  res.json({
    message: 'CPU load test completed',
    duration,
    result,
  });
});

// Task routes
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server after attempting DB connection
async function start() {
  if (!MONGO_URI) {
    console.warn(
      '[warn] MONGO_URI not set in .env — server will start but DB calls will fail.'
    );
  } else {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('[db] Connected to MongoDB Atlas');
    } catch (err) {
      console.error('[db] Connection error:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
  });
}

start();
